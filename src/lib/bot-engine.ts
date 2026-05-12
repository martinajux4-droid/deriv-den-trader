import type { DerivClient } from "./deriv-ws";

export type StrategyType = "rise_fall_trend" | "digit_over_under" | "even_odd_martingale";

export type StrategyConfig = {
  type: StrategyType;
  symbol: string;
  stake: number;
  duration: number;
  duration_unit: string;
  // optional / per-strategy
  barrier?: number;          // digits over/under
  contract?: "CALL" | "PUT" | "DIGITEVEN" | "DIGITODD" | "DIGITOVER" | "DIGITUNDER";
  martingale?: number;       // multiplier on loss (e.g. 2)
  take_profit?: number;      // stop bot when pnl >= this
  stop_loss?: number;        // stop bot when pnl <= -this
  max_trades?: number;
};

export type BotEvent =
  | { kind: "log"; msg: string; level?: "info" | "good" | "bad" }
  | { kind: "trade_open"; contract_id: number; stake: number; contract_type: string }
  | { kind: "trade_close"; contract_id: number; profit: number }
  | { kind: "stopped"; reason: string };

export class BotRunner {
  private stopped = false;
  private currentStake: number;
  private pnl = 0;
  private trades = 0;
  private lastTicks: number[] = [];

  constructor(
    private client: DerivClient,
    private cfg: StrategyConfig,
    private currency: string,
    private emit: (e: BotEvent) => void,
    private onTrade: (data: { contract_id: number; stake: number; contract_type: string; profit?: number; settled?: any }) => Promise<void> | void,
  ) {
    this.currentStake = cfg.stake;
  }

  stop(reason = "Stopped by user") {
    this.stopped = true;
    this.emit({ kind: "stopped", reason });
  }

  private decideContractType(): { contract: string; barrier?: string | number } {
    const c = this.cfg;
    if (c.type === "rise_fall_trend") {
      // simple: if last 3 ticks rising -> CALL, if falling -> PUT, else CALL
      const t = this.lastTicks.slice(-4);
      if (t.length >= 4) {
        const ups = t[1] > t[0] && t[2] > t[1] && t[3] > t[2];
        const downs = t[1] < t[0] && t[2] < t[1] && t[3] < t[2];
        if (ups) return { contract: "CALL" };
        if (downs) return { contract: "PUT" };
      }
      return { contract: c.contract || "CALL" };
    }
    if (c.type === "digit_over_under") {
      return { contract: c.contract || "DIGITOVER", barrier: c.barrier ?? 5 };
    }
    if (c.type === "even_odd_martingale") {
      return { contract: c.contract || "DIGITEVEN" };
    }
    return { contract: "CALL" };
  }

  async run() {
    const { client, cfg } = this;
    // collect ticks for trend
    const off = await client.subscribeTicks(cfg.symbol, (t) => {
      this.lastTicks.push(t.quote);
      if (this.lastTicks.length > 20) this.lastTicks.shift();
    });

    this.emit({ kind: "log", msg: `Bot started · ${cfg.type} on ${cfg.symbol}` });

    try {
      while (!this.stopped) {
        if (cfg.max_trades && this.trades >= cfg.max_trades) { this.stop(`Reached max trades (${cfg.max_trades})`); break; }
        if (cfg.take_profit !== undefined && this.pnl >= cfg.take_profit) { this.stop(`Take-profit hit (+${this.pnl.toFixed(2)})`); break; }
        if (cfg.stop_loss !== undefined && this.pnl <= -cfg.stop_loss) { this.stop(`Stop-loss hit (${this.pnl.toFixed(2)})`); break; }

        const decision = this.decideContractType();
        try {
          const proposal = await client.getProposal({
            contract_type: decision.contract,
            symbol: cfg.symbol,
            amount: Number(this.currentStake.toFixed(2)),
            duration: cfg.duration,
            duration_unit: cfg.duration_unit,
            currency: this.currency,
            ...(decision.barrier !== undefined ? { barrier: decision.barrier } : {}),
          });
          const buy = await client.buyContract(proposal.id, proposal.ask_price);
          this.emit({ kind: "trade_open", contract_id: buy.contract_id, stake: this.currentStake, contract_type: decision.contract });
          this.emit({ kind: "log", msg: `Bought ${decision.contract} · stake ${this.currentStake.toFixed(2)} ${this.currency}` });
          await this.onTrade({ contract_id: buy.contract_id, stake: this.currentStake, contract_type: decision.contract });

          const settled = await client.waitForContract(buy.contract_id);
          const profit = Number(settled.profit ?? 0);
          this.pnl += profit;
          this.trades += 1;
          this.emit({ kind: "trade_close", contract_id: buy.contract_id, profit });
          this.emit({
            kind: "log",
            level: profit >= 0 ? "good" : "bad",
            msg: `Settled ${profit >= 0 ? "+" : ""}${profit.toFixed(2)} · cum P&L ${this.pnl.toFixed(2)}`,
          });
          await this.onTrade({ contract_id: buy.contract_id, stake: this.currentStake, contract_type: decision.contract, profit, settled });

          // martingale
          if (cfg.martingale && cfg.martingale > 1) {
            this.currentStake = profit < 0 ? this.currentStake * cfg.martingale : cfg.stake;
          }
        } catch (e: any) {
          this.emit({ kind: "log", level: "bad", msg: `Trade error: ${e.message || e.error?.message || "unknown"}` });
          // brief pause on error
          await new Promise((r) => setTimeout(r, 2000));
        }
        // small gap
        await new Promise((r) => setTimeout(r, 500));
      }
    } finally {
      off?.();
    }
  }

  get currentPnl() { return this.pnl; }
  get tradeCount() { return this.trades; }
}
