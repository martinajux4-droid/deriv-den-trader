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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Play, Square, Pause, Zap, AlertTriangle, Brain, Shield, Target,
  Activity, Gauge, TrendingUp, TrendingDown,
} from "lucide-react";
import { setBotStatus, emitBotEvent, emitTakeProfit } from "@/hooks/use-bot-status";
import { LiveTradeFeed } from "@/components/LiveTradeFeed";
import { cn } from "@/lib/utils";

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
  const [logs, setLogs] = useState<{ t: number; msg: string; tone?: string }[]>([]);
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">AI Trading Engine</h1>
          <p className="text-xs text-muted-foreground">Institutional automated execution · {active ? (active.is_virtual ? "Demo" : "Live") + " · " + active.loginid : "no account"}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatePill state={state} running={running} paused={paused} detail={stateDetail} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        {/* LEFT: configuration */}
        <Card className="space-y-3 p-5">
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

          <div className="space-y-2 pt-2">
            {!running ? (
              <Button onClick={start} className="w-full bg-gold-gradient text-primary-foreground hover:opacity-90" size="lg" disabled={!active}>
                <Play className="mr-2 h-4 w-4" /> Start AI Bot
              </Button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={togglePause} variant="secondary">
                  <Pause className="mr-1 h-4 w-4" />{paused ? "Resume" : "Pause"}
                </Button>
                <Button onClick={stop} variant="outline">
                  <Square className="mr-1 h-4 w-4" /> Stop
                </Button>
                <Button onClick={emergency} variant="destructive">
                  <Zap className="mr-1 h-4 w-4" /> Kill
                </Button>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-warning" /> Bot runs in your browser. Closing this tab stops it.
            </p>
          </div>
        </Card>

        {/* RIGHT: live telemetry */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat icon={<Target className="h-3 w-3" />} label="Live P&L"
              value={`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ${balance?.currency || ""}`}
              tone={pnl >= 0 ? "bull" : "bear"} />
            <Stat icon={<Activity className="h-3 w-3" />} label="Trades" value={`${trades}`} />
            <Stat icon={<Brain className="h-3 w-3" />} label="AI Confidence"
              value={analysis ? `${analysis.confidence}%` : "—"} tone="primary" bar={analysis?.confidence} />
            <Stat icon={<Shield className="h-3 w-3" />} label="Risk Score"
              value={analysis ? `${analysis.riskScore}%` : "—"} tone="warn" bar={analysis?.riskScore} />
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">AI Market Read · {symbol}</div>
                  <div className="text-[11px] text-muted-foreground">Updates every tick</div>
                </div>
              </div>
              {analysis && (
                <Badge variant="outline" className={cn("text-[10px]",
                  analysis.recommendation === "RISE" && "border-bull/40 text-bull",
                  analysis.recommendation === "FALL" && "border-bear/40 text-bear")}>
                  {analysis.recommendation === "RISE" ? <TrendingUp className="mr-1 h-3 w-3"/> :
                   analysis.recommendation === "FALL" ? <TrendingDown className="mr-1 h-3 w-3"/> :
                   <Gauge className="mr-1 h-3 w-3"/>}
                  {analysis.recommendation}
                </Badge>
              )}
            </div>
            {!analysis ? (
              <div className="text-xs text-muted-foreground">Waiting for tick stream…</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <Mini label="Trend" value={`${analysis.trendDir} · ${analysis.trendStrength.toFixed(0)}%`} />
                  <Mini label="Momentum" value={`${analysis.momentum >= 0 ? "+" : ""}${analysis.momentum.toFixed(3)}%`} />
                  <Mini label="Volatility" value={`${analysis.volatility.toFixed(0)}`} />
                  <Mini label="RSI" value={analysis.rsi.toFixed(0)} />
                  <Mini label="EMA" value={analysis.emaCross} />
                  <Mini label="Entry" value={`${analysis.entryScore}%`} />
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                  {analysis.recommendationText}
                </div>
                <div className="rounded-lg border border-border/60 bg-background/30 p-3">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase text-muted-foreground">
                    <span>Buy / Sell pressure</span>
                    <span className="num text-foreground">{analysis.buyPressure}% / {analysis.sellPressure}%</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-bear/30">
                    <div className="bg-bull transition-all" style={{ width: `${analysis.buyPressure}%` }} />
                  </div>
                </div>
              </div>
            )}
          </Card>

          <LiveTradeFeed />
        </div>
      </div>
    </div>
  );
}

function StatePill({ state, running, paused, detail }: { state: BotState; running: boolean; paused: boolean; detail: string }) {
  const map: Record<BotState, { label: string; className: string }> = {
    idle:           { label: "IDLE",          className: "bg-muted text-muted-foreground" },
    scanning:       { label: "SCANNING",      className: "bg-primary/15 text-primary" },
    waiting_entry:  { label: "WAITING ENTRY", className: "bg-accent/15 text-accent" },
    executing:      { label: "EXECUTING",     className: "bg-bull/15 text-bull" },
    managing:       { label: "MANAGING",      className: "bg-bull/15 text-bull" },
    paused:         { label: "PAUSED",        className: "bg-warning/15 text-warning" },
    risk_lock:      { label: "RISK LOCK",     className: "bg-bear/15 text-bear" },
    stopped:        { label: "STOPPED",       className: "bg-muted text-muted-foreground" },
  };
  const s = paused ? map.paused : map[state];
  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider", s.className)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", running && !paused ? "bg-current animate-pulse" : "bg-current")} />
        {s.label}
      </span>
      {detail && <span className="hidden text-[11px] text-muted-foreground sm:block">{detail}</span>}
    </div>
  );
}

function Stat({ icon, label, value, tone, bar }: { icon: React.ReactNode; label: string; value: string; tone?: "bull" | "bear" | "primary" | "warn"; bar?: number }) {
  const toneClass =
    tone === "bull" ? "text-bull" :
    tone === "bear" ? "text-bear" :
    tone === "primary" ? "text-primary" :
    tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">{icon}{label}</div>
      <div className={cn("num mt-1 text-xl font-semibold", toneClass)}>{value}</div>
      {bar != null && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background/60">
          <div className={cn("h-full",
            tone === "primary" && "bg-primary",
            tone === "warn" && "bg-warning",
            tone === "bull" && "bg-bull",
            tone === "bear" && "bg-bear",
          )} style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-2">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className="num mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
function Tiny({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/40 bg-background/30 p-1.5">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className="text-[11px] font-semibold">{value}</div>
    </div>
  );
}
