import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { supabase } from "@/integrations/supabase/client";
import {
  BotRunner, type StrategyConfig, type StrategyType, type RiskMode,
  type StakeMode, type BotState,
} from "@/lib/bot-engine";
import type { Analysis } from "@/lib/ai-analysis";
import { DERIV_SYMBOLS } from "@/lib/deriv-symbols";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { AlertTriangle, Settings2, ChevronDown, Brain } from "lucide-react";
import { setBotStatus, emitBotEvent, emitTakeProfit } from "@/hooks/use-bot-status";
import { LiveTradeFeed } from "@/components/LiveTradeFeed";
import { BotLaunchOverlay } from "@/components/BotLaunchOverlay";
import { BotCommandCenter } from "@/components/BotCommandCenter";

export const Route = createFileRoute("/_authenticated/bot")({
  component: BotPage,
});

type StrategyMeta = {
  id: StrategyType; name: string; desc: string;
  winRate: number; risk: "Low" | "Med" | "High"; market: string; roi: string;
};

const STRATEGIES: StrategyMeta[] = [
  { id: "rise_fall_ai",        name: "Rise / Fall AI",         desc: "AI trend + EMA cross + buy pressure → CALL/PUT.", winRate: 72, risk: "Med",  market: "V75 / V100", roi: "+8–14%" },
  { id: "trend_following",     name: "Trend Following AI",     desc: "Rides confirmed momentum with confidence gating.",  winRate: 68, risk: "Med",  market: "V50 / V75",  roi: "+6–12%" },
  { id: "smart_scalping",      name: "Smart Scalping",         desc: "Fast EMA-cross scalps on 3–5 tick contracts.",      winRate: 64, risk: "High", market: "V100",       roi: "+10–20%" },
  { id: "momentum_ai",         name: "Momentum AI",            desc: "Enters when momentum > threshold with conviction.", winRate: 66, risk: "Med",  market: "V25 / V50",  roi: "+7–13%" },
  { id: "sniper_entry",        name: "Sniper Entry AI",        desc: "Only the highest-quality A+ setups (entry ≥ 75).",  winRate: 78, risk: "Low",  market: "V75",         roi: "+9–15%" },
  { id: "breakout_detection",  name: "Breakout Detection",     desc: "Fires on support / resistance breaks with volume.", winRate: 62, risk: "High", market: "V100",       roi: "+12–22%" },
  { id: "reversal_detection",  name: "Reversal Detection",     desc: "Catches RSI extremes and exhaustion zones.",        winRate: 60, risk: "High", market: "V25 / V50",  roi: "+8–18%" },
  { id: "sr_bounce",           name: "S/R Bounce",             desc: "Bounces off rolling support / resistance.",         winRate: 65, risk: "Med",  market: "V50",         roi: "+6–11%" },
  { id: "volatility_spike",    name: "Volatility Spike Hunter",desc: "Trades high-volatility expansion regimes.",         winRate: 58, risk: "High", market: "Boom / Crash",roi: "+10–20%" },
  { id: "even_odd_ai",         name: "Even / Odd AI",          desc: "Statistical bias on last-digit distribution.",      winRate: 56, risk: "Med",  market: "V100",        roi: "+5–9%" },
  { id: "over_under_ai",       name: "Over / Under AI",        desc: "Picks digit barrier with the strongest edge.",      winRate: 58, risk: "Med",  market: "V100",        roi: "+5–10%" },
];

function BotPage() {
  const { user } = useAuth();
  const { client, active, balance } = useDeriv();
  const [strategy, setStrategy] = useState<StrategyType>("sniper_entry");
  const [symbol, setSymbol] = useState("R_100");
  const [stake, setStake] = useState("1");
  const [duration, setDuration] = useState("5");
  const [unit, setUnit] = useState("t");
  const [barrier, setBarrier] = useState("5");
  const [martingale, setMartingale] = useState("2");
  const [tp, setTp] = useState("10");
  const [sl, setSl] = useState("10");
  const [maxTrades, setMaxTrades] = useState("20");
  const [maxDrawdown, setMaxDrawdown] = useState("15");
  const [maxConsecLosses, setMaxConsecLosses] = useState("3");
  const [riskMode, setRiskMode] = useState<RiskMode>("normal");
  const [stakeMode, setStakeMode] = useState<StakeMode>("smart");
  const [minConfidence, setMinConfidence] = useState("70");

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState<BotState>("idle");
  const [stateDetail, setStateDetail] = useState<string>("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [, setLogs] = useState<{ t: number; msg: string; tone?: string }[]>([]);
  const [launching, setLaunching] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pnl, setPnl] = useState(0);
  const [trades, setTrades] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [activeTrades, setActiveTrades] = useState(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const tpFiredRef = useRef(false);
  const runnerRef = useRef<BotRunner | null>(null);
  const runIdRef = useRef<string | null>(null);

  const meta = useMemo(() => STRATEGIES.find((s) => s.id === strategy)!, [strategy]);

  const log = (msg: string, tone?: string) =>
    setLogs((l) => [{ t: Date.now(), msg, tone }, ...l].slice(0, 200));

  const start = async () => {
    if (!client || !active || !user) { toast.error("Connect a Deriv account first"); return; }
    setLaunching(true);
    const cfg: StrategyConfig = {
      type: strategy, symbol, stake: Number(stake),
      duration: Number(duration), duration_unit: unit,
      barrier: Number(barrier),
      martingale: Number(martingale),
      take_profit: Number(tp) || undefined,
      stop_loss: Number(sl) || undefined,
      max_trades: Number(maxTrades) || undefined,
      max_drawdown: Number(maxDrawdown) || undefined,
      max_consecutive_losses: Number(maxConsecLosses) || undefined,
      risk_mode: riskMode,
      stake_mode: stakeMode,
      min_confidence: Number(minConfidence) || 65,
    };

    const { data: run } = await supabase.from("bot_runs").insert({
      user_id: user.id, status: "running", strategy_id: null, notes: JSON.stringify(cfg),
    }).select().single();
    runIdRef.current = run?.id ?? null;

    setRunning(true); setPaused(false); setLogs([]); setPnl(0); setTrades(0);
    setWins(0); setLosses(0); setActiveTrades(0);
    streakRef.current = 0; bestStreakRef.current = 0; tpFiredRef.current = false;
    const baseEquity = balance?.balance ?? 0;
    const accountType: "Demo" | "Real" = active.is_virtual ? "Demo" : "Real";
    setBotStatus({
      running: true, paused: false, strategy, symbol,
      pnl: 0, trades: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, peak: 0,
      baseEquity, currency: balance?.currency || "USD",
      takeProfit: Number(tp) || undefined, stopLoss: Number(sl) || undefined,
      confidence: 0, direction: "WAIT", activeTrades: 0,
      accountType, loginid: active.loginid, startedAt: Date.now(),
    });
    emitBotEvent({ kind: "info", message: `Bot online · ${strategy} on ${symbol} · ${accountType} account`, symbol });

    const runner = new BotRunner(
      client, cfg, balance?.currency || "USD",
      (e) => {
        if (e.kind === "log") log(e.msg, e.level);
        if (e.kind === "state") {
          setState(e.state); setStateDetail(e.detail || "");
          if (e.state === "scanning" && e.detail) {
            emitBotEvent({ kind: "scan", message: e.detail, symbol });
          }
        }
        if (e.kind === "analysis") {
          setAnalysis(e.analysis);
          setBotStatus({
            running: true, paused, strategy, symbol,
            pnl, trades, wins, losses,
            streak: streakRef.current, bestStreak: bestStreakRef.current,
            baseEquity, currency: balance?.currency || "USD",
            takeProfit: Number(tp) || undefined, stopLoss: Number(sl) || undefined,
            confidence: e.analysis.confidence, direction: e.analysis.recommendation,
            activeTrades, accountType, loginid: active.loginid, startedAt: Date.now(),
          });
        }
        if (e.kind === "trade_open") {
          setActiveTrades((n) => n + 1);
          emitBotEvent({
            kind: "open", symbol, contract: e.contract_type,
            confidence: analysis?.confidence,
            message: `Opened ${e.contract_type} · stake ${e.stake.toFixed(2)} ${balance?.currency || ""}`,
          });
        }
        if (e.kind === "trade_close") {
          setActiveTrades((n) => Math.max(0, n - 1));
          const profit = e.profit;
          // streak math
          if (profit > 0) {
            streakRef.current = streakRef.current >= 0 ? streakRef.current + 1 : 1;
          } else if (profit < 0) {
            streakRef.current = streakRef.current <= 0 ? streakRef.current - 1 : -1;
          }
          if (Math.abs(streakRef.current) > Math.abs(bestStreakRef.current)) {
            bestStreakRef.current = streakRef.current;
          }
          setWins((w) => w + (profit > 0 ? 1 : 0));
          setLosses((l) => l + (profit < 0 ? 1 : 0));
          setTrades((t) => t + 1);
          setPnl((p) => {
            const np = p + profit;
            const newWins = wins + (profit > 0 ? 1 : 0);
            const newLosses = losses + (profit < 0 ? 1 : 0);
            const newTrades = trades + 1;
            setBotStatus({
              running: true, paused, strategy, symbol,
              pnl: np, trades: newTrades, wins: newWins, losses: newLosses,
              streak: streakRef.current, bestStreak: bestStreakRef.current,
              baseEquity, currency: balance?.currency || "USD",
              takeProfit: Number(tp) || undefined, stopLoss: Number(sl) || undefined,
              confidence: analysis?.confidence ?? 0, direction: analysis?.recommendation ?? "WAIT",
              activeTrades: Math.max(0, activeTrades - 1),
              accountType, loginid: active.loginid, startedAt: Date.now(),
            });
            // TP / SL fire
            const tpV = Number(tp);
            if (!tpFiredRef.current && tpV > 0 && np >= tpV) {
              tpFiredRef.current = true;
              emitBotEvent({ kind: "tp", symbol, message: `Take profit hit at ${np.toFixed(2)}`, profit: np });
              emitTakeProfit({
                ts: Date.now(), pnl: np,
                roi: baseEquity > 0 ? (np / baseEquity) * 100 : 0,
                trades: newTrades, wins: newWins, losses: newLosses,
                strategy, symbol, confidence: analysis?.confidence ?? 0,
                currency: balance?.currency || "USD", accountType, reason: "take_profit",
              });
            }
            const slV = Number(sl);
            if (slV > 0 && np <= -slV) {
              emitBotEvent({ kind: "sl", symbol, message: `Stop loss reached at ${np.toFixed(2)}`, profit: np });
            }
            return np;
          });
          emitBotEvent({
            kind: profit >= 0 ? "won" : "lost", symbol,
            profit, confidence: analysis?.confidence,
            message: profit >= 0 ? `Trade won · cum ${(pnl + profit).toFixed(2)}` : `Trade lost · cum ${(pnl + profit).toFixed(2)}`,
          });
        }
        if (e.kind === "stopped") {
          log(`Stopped: ${e.reason}`, "info");
          setRunning(false);
          emitBotEvent({ kind: "info", message: `Bot stopped · ${e.reason}` });
          setBotStatus({ running: false });
        }
      },
      async (data) => {
        if (!user) return;
        if (data.profit === undefined) {
          await supabase.from("trades").insert({
            user_id: user.id,
            bot_run_id: runIdRef.current,
            contract_id: String(data.contract_id),
            symbol: cfg.symbol, contract_type: data.contract_type,
            stake: data.stake,
            duration: cfg.duration, duration_unit: cfg.duration_unit,
            is_virtual: active.is_virtual, loginid: active.loginid,
            status: "open",
          });
        } else {
          await supabase.from("trades").update({
            profit: data.profit,
            status: data.profit > 0 ? "won" : data.profit < 0 ? "lost" : "even",
            entry_spot: data.settled?.entry_spot,
            exit_spot: data.settled?.exit_spot,
            payout: data.settled?.payout,
            closed_at: new Date().toISOString(),
            raw: data.settled,
          }).eq("contract_id", String(data.contract_id)).eq("user_id", user.id);
          if (runIdRef.current) {
            await supabase.from("bot_runs").update({ pnl: runner.currentPnl, trades_count: runner.tradeCount }).eq("id", runIdRef.current);
          }
        }
      },
    );
    runnerRef.current = runner;
    runner.run().finally(async () => {
      setRunning(false); setPaused(false);
      setBotStatus({ running: false });
      if (runIdRef.current) {
        await supabase.from("bot_runs").update({
          status: "stopped", stopped_at: new Date().toISOString(),
          pnl: runner.currentPnl, trades_count: runner.tradeCount,
        }).eq("id", runIdRef.current);
      }
    });
  };

  const stop = () => runnerRef.current?.stop();
  const togglePause = () => {
    const r = runnerRef.current; if (!r) return;
    if (paused) { r.resume(); setPaused(false); } else { r.pause(); setPaused(true); }
  };
  const emergency = () => { runnerRef.current?.emergency(); toast.error("Emergency stop"); };

  useEffect(() => () => runnerRef.current?.stop("Page closed"), []);

  // Allow the TP modal "Stop Bot" button to stop the bot from anywhere
  useEffect(() => {
    const onStop = () => runnerRef.current?.stop("Stopped from celebration");
    window.addEventListener("hifex:bot-stop", onStop);
    return () => window.removeEventListener("hifex:bot-stop", onStop);
  }, []);

  return (
    <div className="space-y-6">
      <BotLaunchOverlay open={launching} onDone={() => setLaunching(false)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Trading Engine</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One-click automated trading · {active ? (active.is_virtual ? "Demo" : "Live") + " · " + active.loginid : "no account connected"}
          </p>
        </div>
      </div>

      {/* HERO COMMAND CENTER */}
      <BotCommandCenter
        running={running}
        paused={paused}
        state={state}
        stateDetail={stateDetail}
        symbol={symbol}
        strategyLabel={meta.name}
        pnl={pnl}
        trades={trades}
        wins={wins}
        losses={losses}
        activeTrades={activeTrades}
        currency={balance?.currency || "USD"}
        analysis={analysis}
        canStart={!!(client && active && user)}
        onStart={start}
        onPause={togglePause}
        onStop={stop}
        onEmergency={emergency}
      />

      {/* TWO-COLUMN: settings (collapsible) + live feed */}
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* LEFT: configuration */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <Card className="card-premium space-y-3 p-5">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Settings2 className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold">Strategy &amp; Risk</div>
                  <div className="text-[11px] text-muted-foreground">{meta.name} · {symbol} · stake {stake}</div>
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", settingsOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
          <div>
            <Label>Strategy</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as StrategyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {STRATEGIES.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="mt-2 rounded-lg border border-primary/15 bg-primary/5 p-3">
              <p className="text-xs leading-relaxed">{meta.desc}</p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                <Tiny label="Win" value={`${meta.winRate}%`} />
                <Tiny label="Risk" value={meta.risk} />
                <Tiny label="Market" value={meta.market} />
                <Tiny label="ROI" value={meta.roi} />
              </div>
            </div>
          </div>

          <div>
            <Label>Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DERIV_SYMBOLS.map((s) => <SelectItem key={s.symbol} value={s.symbol}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div><Label>Stake</Label><Input className="num" value={stake} onChange={(e) => setStake(e.target.value)} /></div>
            <div><Label>Duration</Label><Input className="num" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
            <div>
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="t">Ticks</SelectItem>
                  <SelectItem value="s">Sec</SelectItem>
                  <SelectItem value="m">Min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {strategy === "over_under_ai" && (
            <div><Label>Barrier (0-9)</Label><Input className="num" value={barrier} onChange={(e) => setBarrier(e.target.value)} /></div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Risk mode</Label>
              <Select value={riskMode} onValueChange={(v) => setRiskMode(v as RiskMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="safe">Safe</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stake mode</Label>
              <Select value={stakeMode} onValueChange={(v) => setStakeMode(v as StakeMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="smart">Smart (AI scaled)</SelectItem>
                  <SelectItem value="martingale">Martingale</SelectItem>
                  <SelectItem value="anti_martingale">Anti-martingale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div><Label>Take profit</Label><Input className="num" value={tp} onChange={(e) => setTp(e.target.value)} /></div>
            <div><Label>Stop loss</Label><Input className="num" value={sl} onChange={(e) => setSl(e.target.value)} /></div>
            <div><Label>Max DD</Label><Input className="num" value={maxDrawdown} onChange={(e) => setMaxDrawdown(e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div><Label>Max trades</Label><Input className="num" value={maxTrades} onChange={(e) => setMaxTrades(e.target.value)} /></div>
            <div><Label>Loss streak</Label><Input className="num" value={maxConsecLosses} onChange={(e) => setMaxConsecLosses(e.target.value)} /></div>
            <div><Label>Min conf %</Label><Input className="num" value={minConfidence} onChange={(e) => setMinConfidence(e.target.value)} /></div>
          </div>

          {(stakeMode === "martingale" || stakeMode === "anti_martingale") && (
            <div><Label>Multiplier</Label><Input className="num" value={martingale} onChange={(e) => setMartingale(e.target.value)} /></div>
          )}

            <p className="flex items-center gap-1 pt-1 text-[10px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-warning" /> Bot runs in your browser. Closing this tab stops it.
            </p>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* RIGHT: live activity */}
        <div className="space-y-4">
          <div className="card-premium overflow-hidden p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
                <Brain className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold">AI Market Read · {symbol}</div>
                <div className="text-[11px] text-muted-foreground">Reasoning updates every tick</div>
              </div>
            </div>
            {!analysis ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-background/30 p-6 text-center text-xs text-muted-foreground">
                Waiting for tick stream…
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">
                  {analysis.recommendationText}
                </div>
                <div className="rounded-xl border border-border/60 bg-background/30 p-3">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase text-muted-foreground">
                    <span>Buy / Sell pressure</span>
                    <span className="num text-foreground">{analysis.buyPressure}% / {analysis.sellPressure}%</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-bear/30">
                    <div className="bg-bull transition-all duration-500" style={{ width: `${analysis.buyPressure}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <LiveTradeFeed />
        </div>
      </div>
    </div>
  );
}
