import type { DerivClient } from "./deriv-ws";
import { analyze, digitStats, type Analysis } from "./ai-analysis";
import { getContractsFor, snapDuration, supportsContract } from "./deriv-contracts";

export type StrategyType =
  | "rise_fall_ai"
  | "even_odd_ai"
  | "over_under_ai"
  | "matches_differs_ai"
  | "trend_following"
  | "smart_scalping"
  | "momentum_ai"
  | "sniper_entry"
  | "breakout_detection"
  | "reversal_detection"
  | "sr_bounce"
  | "volatility_spike";

export type RiskMode = "safe" | "normal" | "aggressive";
export type TradingMode = "auto" | "semi_auto" | "manual";
export type StakeMode = "fixed" | "smart" | "martingale" | "anti_martingale";

export type StrategyConfig = {
  type: StrategyType;
  symbol: string;
  stake: number;
  duration: number;
  duration_unit: string;

  // shared
  barrier?: number;
  martingale?: number;
  take_profit?: number;
  stop_loss?: number;
  daily_target?: number;
  daily_loss_limit?: number;
  max_drawdown?: number;
  max_trades?: number;
  max_consecutive_losses?: number;
  cooldown_seconds?: number;

  // modes
  risk_mode?: RiskMode;
  trading_mode?: TradingMode;
  stake_mode?: StakeMode;

  // AI gating
  min_confidence?: number; // 0..100, skip trades below

  // Loss Protection AI
  pause_after_loss_seconds?: number;   // cooldown after every losing trade
  recovery_min_confidence?: number;    // higher confidence required to resume after a loss
  capital_protection?: boolean;        // halve stake & disable martingale during recovery
  smart_recovery?: boolean;            // reset stake to base after every loss (no martingale escalation)
  no_trade_when_risky?: boolean;       // skip entries when volatility extreme or signal uncertain
};

export type BotState =
  | "idle"
  | "scanning"
  | "waiting_entry"
  | "executing"
  | "managing"
  | "paused"
  | "risk_lock"
  | "stopped";

export type BotEvent =
  | { kind: "log"; msg: string; level?: "info" | "good" | "bad" | "warn" }
  | { kind: "state"; state: BotState; detail?: string }
  | { kind: "analysis"; analysis: Analysis }
  | { kind: "trade_open"; contract_id: number; stake: number; contract_type: string }
  | { kind: "trade_close"; contract_id: number; profit: number }
  | { kind: "stopped"; reason: string };

const RISK_PRESETS: Record<RiskMode, Partial<StrategyConfig>> = {
  safe:       { min_confidence: 78, max_consecutive_losses: 2, cooldown_seconds: 30 },
  normal:     { min_confidence: 65, max_consecutive_losses: 3, cooldown_seconds: 10 },
  aggressive: { min_confidence: 55, max_consecutive_losses: 5, cooldown_seconds: 3 },
};

export class BotRunner {
  private stopped = false;
  private paused = false;
  private currentStake: number;
  private pnl = 0;
  private trades = 0;
  private consecLosses = 0;
  private lastTicks: number[] = [];
  private state: BotState = "idle";
  private inRecovery = false;

  constructor(
    private client: DerivClient,
    private cfg: StrategyConfig,
    private currency: string,
    private emit: (e: BotEvent) => void,
    private onTrade: (data: {
      contract_id: number; stake: number; contract_type: string; profit?: number; settled?: any;
    }) => Promise<void> | void,
  ) {
    // apply risk preset defaults
    const preset = RISK_PRESETS[cfg.risk_mode || "normal"];
    this.cfg = { ...preset, ...cfg } as StrategyConfig;
    this.currentStake = cfg.stake;
  }

  stop(reason = "Stopped by user") { this.stopped = true; this.emit({ kind: "stopped", reason }); }
  pause() { this.paused = true; this.setState("paused", "Trading paused by user"); }
  resume() { this.paused = false; this.setState("scanning", "Trading resumed"); }
  emergency() { this.stop("Emergency stop"); }

  get currentPnl() { return this.pnl; }
  get tradeCount() { return this.trades; }

  private setState(s: BotState, detail?: string) {
    this.state = s;
    this.emit({ kind: "state", state: s, detail });
  }

  /** Decide direction + contract from analysis. Returns null when bot should wait. */
  private decide(a: Analysis): { contract: string; barrier?: number } | null {
    const c = this.cfg;
    const min = c.min_confidence ?? 65;

    switch (c.type) {
      case "rise_fall_ai":
      case "trend_following": {
        if (a.confidence < min) return null;
        if (a.recommendation === "RISE") return { contract: "CALL" };
        if (a.recommendation === "FALL") return { contract: "PUT" };
        return null;
      }
      case "momentum_ai": {
        if (Math.abs(a.momentum) < 0.05 || a.confidence < min) return null;
        return { contract: a.momentum > 0 ? "CALL" : "PUT" };
      }
      case "smart_scalping": {
        // Quick entries when EMA cross + decent confidence
        if (a.emaCross === "NONE" || a.confidence < min - 5) return null;
        return { contract: a.emaCross === "GOLDEN" ? "CALL" : "PUT" };
      }
      case "sniper_entry": {
        // Only the highest-quality setups
        if (a.entryScore < 75 || a.confidence < Math.max(min, 75)) return null;
        return { contract: a.recommendation === "FALL" ? "PUT" : "CALL" };
      }
      case "breakout_detection": {
        const range = a.resistance - a.support;
        const breakoutUp = a.last >= a.resistance - range * 0.05;
        const breakoutDn = a.last <= a.support + range * 0.05;
        if (!breakoutUp && !breakoutDn) return null;
        if (a.confidence < min) return null;
        return { contract: breakoutUp ? "CALL" : "PUT" };
      }
      case "reversal_detection": {
        if (a.reversalProb < 60) return null;
        return { contract: a.rsi >= 70 ? "PUT" : a.rsi <= 30 ? "CALL" : (a.recommendation === "FALL" ? "PUT" : "CALL") };
      }
      case "sr_bounce": {
        const range = a.resistance - a.support;
        if (range <= 0) return null;
        if (a.last <= a.support + range * 0.05) return { contract: "CALL" };
        if (a.last >= a.resistance - range * 0.05) return { contract: "PUT" };
        return null;
      }
      case "volatility_spike": {
        if (a.volatility < 60 || a.confidence < min - 10) return null;
        return { contract: a.momentum >= 0 ? "CALL" : "PUT" };
      }
      case "even_odd_ai": {
        const d = digitStats(this.lastTicks);
        if (Math.abs(d.even - 50) < 8) return null;
        return { contract: d.even > 50 ? "DIGITEVEN" : "DIGITODD" };
      }
      case "over_under_ai": {
        const d = digitStats(this.lastTicks);
        const barrier = c.barrier ?? 5;
        const over = d.over5;
        if (Math.abs(over - 50) < 8) return null;
        return { contract: over > 50 ? "DIGITOVER" : "DIGITUNDER", barrier };
      }
      case "matches_differs_ai": {
        // Count digit frequencies over recent ticks
        const digits = this.lastTicks.map((q) =>
          Number(String(q.toFixed(5)).replace(".", "").slice(-1)),
        );
        if (digits.length < 20) return null;
        const freq = new Array(10).fill(0);
        for (const d of digits) freq[d]++;
        let maxIdx = 0, minIdx = 0;
        for (let i = 1; i < 10; i++) {
          if (freq[i] > freq[maxIdx]) maxIdx = i;
          if (freq[i] < freq[minIdx]) minIdx = i;
        }
        const expected = digits.length / 10;
        const maxBias = (freq[maxIdx] - expected) / expected; // >0 hot
        const minBias = (expected - freq[minIdx]) / expected; // >0 cold
        // If a digit is clearly hot, bet DIFF against the cold one (statistically rare to repeat)
        if (maxBias > 0.6) return { contract: "DIGITDIFF", barrier: maxIdx };
        if (minBias > 0.6) return { contract: "DIGITDIFF", barrier: minIdx };
        return null;
      }
    }
  }

  private adjustStake(profit: number | null) {
    const c = this.cfg;
    if (profit === null) return;
    // Smart recovery: never escalate after a loss, just reset to base
    if (c.smart_recovery && profit < 0) {
      this.currentStake = c.stake;
      return;
    }
    const mode = c.stake_mode || (c.martingale ? "martingale" : "fixed");
    if (mode === "fixed") {
      this.currentStake = c.stake;
    } else if (mode === "martingale") {
      const m = c.martingale && c.martingale > 1 ? c.martingale : 2;
      this.currentStake = profit < 0 ? this.currentStake * m : c.stake;
    } else if (mode === "anti_martingale") {
      const m = c.martingale && c.martingale > 1 ? c.martingale : 1.5;
      this.currentStake = profit > 0 ? this.currentStake * m : c.stake;
    } else if (mode === "smart") {
      // smart: scale slightly with confidence (set at trade time, default reset)
      this.currentStake = c.stake;
    }
    // hard cap to 100x base
    this.currentStake = Math.max(0.35, Math.min(this.currentStake, c.stake * 100));
  }

  private smartConfidenceStake(stake: number, conf: number) {
    const c = this.cfg;
    if ((c.stake_mode || "fixed") !== "smart") return stake;
    // 60% conf -> 0.8x; 80% -> 1.2x; 95% -> 1.6x
    const factor = Math.max(0.5, Math.min(2, 0.4 + conf / 60));
    return Math.max(0.35, Number((stake * factor).toFixed(2)));
  }

  private riskCheck(): string | null {
    const c = this.cfg;
    if (c.max_trades && this.trades >= c.max_trades) return `Max trades (${c.max_trades}) reached`;
    if (c.take_profit !== undefined && this.pnl >= c.take_profit) return `Take-profit +${this.pnl.toFixed(2)}`;
    if (c.daily_target !== undefined && this.pnl >= c.daily_target) return `Daily target +${this.pnl.toFixed(2)}`;
    if (c.stop_loss !== undefined && this.pnl <= -c.stop_loss) return `Stop-loss ${this.pnl.toFixed(2)}`;
    if (c.max_drawdown !== undefined && this.pnl <= -c.max_drawdown) return `Max drawdown ${this.pnl.toFixed(2)}`;
    if (c.daily_loss_limit !== undefined && this.pnl <= -c.daily_loss_limit) return `Daily loss limit ${this.pnl.toFixed(2)}`;
    return null;
  }

  async run() {
    const { client, cfg } = this;
    this.setState("scanning", "Loading contract specs");

    // Load supported contracts for this symbol
    let info;
    try { info = await getContractsFor(client, cfg.symbol); }
    catch (e: any) {
      this.emit({ kind: "log", level: "bad", msg: `Failed to load contract info: ${e.message || e.error?.message || "unknown"}` });
      this.stop("Contract info unavailable");
      return;
    }

    // Pre-load recent ticks so the AI can analyze and decide immediately
    try {
      const hist: any = await client.send({
        ticks_history: cfg.symbol, count: 60, end: "latest", style: "ticks",
      });
      if (hist?.history?.prices) {
        this.lastTicks = (hist.history.prices as any[]).map((p) => Number(p)).slice(-60);
      }
    } catch {}

    const off = await client.subscribeTicks(cfg.symbol, (t) => {
      this.lastTicks.push(t.quote);
      if (this.lastTicks.length > 60) this.lastTicks.shift();
    });

    this.emit({ kind: "log", msg: `Bot online · ${cfg.type} on ${cfg.symbol} · ${cfg.risk_mode || "normal"} mode` });

    try {
      while (!this.stopped) {
        if (this.paused) { await sleep(500); continue; }

        const reason = this.riskCheck();
        if (reason) { this.stop(reason); break; }

        if (cfg.max_consecutive_losses && this.consecLosses >= cfg.max_consecutive_losses) {
          this.setState("risk_lock", `Pausing after ${this.consecLosses} losses`);
          this.emit({ kind: "log", level: "warn", msg: `Risk lock · cooling down ${cfg.cooldown_seconds || 30}s` });
          await sleep((cfg.cooldown_seconds || 30) * 1000);
          this.consecLosses = 0;
          continue;
        }

        // need enough ticks for analysis
        if (this.lastTicks.length < 15) {
          this.setState("scanning", "Collecting market data");
          await sleep(200);
          continue;
        }

        const analysis = analyze(this.lastTicks)!;
        this.emit({ kind: "analysis", analysis });

        // Loss Protection AI · require higher confidence to re-enter after a loss
        if (this.inRecovery) {
          const recMin = cfg.recovery_min_confidence
            ?? Math.min(95, (cfg.min_confidence ?? 65) + 15);
          if (analysis.confidence < recMin) {
            this.setState("risk_lock", `Recovery · waiting for ≥${recMin}% confidence (now ${analysis.confidence}%)`);
            await sleep(600);
            continue;
          }
          this.inRecovery = false;
          this.emit({ kind: "log", level: "good", msg: `AI re-entry confirmed at ${analysis.confidence}% — resuming trading` });
        }

        // No-trade-when-risky: skip during extreme volatility or low signal quality
        if (cfg.no_trade_when_risky && (analysis.volatility > 88 || analysis.entryScore < 40)) {
          this.setState("waiting_entry", `Market risky · vol ${analysis.volatility} · skipping`);
          await sleep(500);
          continue;
        }

        const decision = this.decide(analysis);
        if (!decision) {
          this.setState("waiting_entry", `Waiting · conf ${analysis.confidence}% · ${analysis.recommendationText}`);
          await sleep(400);
          continue;
        }

        // validate contract is supported on this symbol; skip silently if not
        if (!supportsContract(info, decision.contract)) {
          this.emit({ kind: "log", level: "warn", msg: `${decision.contract} not offered on ${cfg.symbol} — skipping` });
          await sleep(1000);
          continue;
        }
        const snapped = snapDuration(info, decision.contract, cfg.duration, cfg.duration_unit);
        if (!snapped) { await sleep(1000); continue; }

        this.setState("executing", `${decision.contract} · ${snapped.duration}${snapped.unit} · conf ${analysis.confidence}%`);

        // smart stake based on AI confidence
        let stakeForTrade = this.smartConfidenceStake(this.currentStake, analysis.confidence);
        // Capital protection: halve stake until a winning trade clears recovery
        if (cfg.capital_protection && this.consecLosses > 0) {
          stakeForTrade = Math.max(0.35, Number((stakeForTrade * 0.5).toFixed(2)));
        }

        try {
          const proposal = await client.getProposal({
            contract_type: decision.contract,
            symbol: cfg.symbol,
            amount: Number(stakeForTrade.toFixed(2)),
            duration: snapped.duration,
            duration_unit: snapped.unit,
            currency: this.currency,
            ...(decision.barrier !== undefined ? { barrier: decision.barrier } : {}),
          });
          const buy = await client.buyContract(proposal.id, proposal.ask_price);
          this.emit({ kind: "trade_open", contract_id: buy.contract_id, stake: stakeForTrade, contract_type: decision.contract });
          this.emit({ kind: "log", level: "info", msg: `OPEN ${decision.contract} · ${stakeForTrade.toFixed(2)} ${this.currency} · AI conf ${analysis.confidence}%` });
          await this.onTrade({ contract_id: buy.contract_id, stake: stakeForTrade, contract_type: decision.contract });

          this.setState("managing", `Managing #${buy.contract_id}`);
          const settled = await client.waitForContract(buy.contract_id);
          const profit = Number(settled.profit ?? 0);
          this.pnl += profit;
          this.trades += 1;
          this.consecLosses = profit < 0 ? this.consecLosses + 1 : 0;

          this.emit({ kind: "trade_close", contract_id: buy.contract_id, profit });
          this.emit({
            kind: "log",
            level: profit >= 0 ? "good" : "bad",
            msg: `CLOSE ${profit >= 0 ? "+" : ""}${profit.toFixed(2)} · cum ${this.pnl >= 0 ? "+" : ""}${this.pnl.toFixed(2)}`,
          });
          await this.onTrade({ contract_id: buy.contract_id, stake: stakeForTrade, contract_type: decision.contract, profit, settled });

          this.adjustStake(profit);

          // Loss Protection AI · pause + force AI re-analysis after every losing trade
          if (profit < 0) {
            this.inRecovery = true;
            const pauseS = Math.max(0, cfg.pause_after_loss_seconds ?? 8);
            if (pauseS > 0) {
              this.setState("risk_lock", `Loss protection · re-analyzing market (${pauseS}s)`);
              this.emit({ kind: "log", level: "warn", msg: `Loss detected · pausing ${pauseS}s and re-scanning market` });
              await sleep(pauseS * 1000);
            }
          }
        } catch (e: any) {
          const msg = e?.message || e?.error?.message || "unknown";
          this.emit({ kind: "log", level: "bad", msg: `Trade error: ${msg}` });
          // On "duration not offered" type errors, reload contract info next loop
          if (/duration|offered|invalid/i.test(msg)) {
            this.emit({ kind: "log", level: "warn", msg: "Refreshing contract specs…" });
          }
          await sleep(1500);
        }
        await sleep(150);
      }
    } finally {
      off?.();
      this.setState("stopped");
    }
  }
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }
