import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { supabase } from "@/integrations/supabase/client";
import {
  BotRunner, type StrategyConfig, type StrategyType, type RiskMode,
  type BotState,
} from "@/lib/bot-engine";
import type { Analysis } from "@/lib/ai-analysis";
import { DERIV_SYMBOLS } from "@/lib/deriv-symbols";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { AlertTriangle, Settings2, ChevronDown, Brain, TrendingUp, Hash, Sigma, Shuffle, Zap, Sparkles, ShieldAlert } from "lucide-react";
import { setBotStatus, emitBotEvent, emitTakeProfit } from "@/hooks/use-bot-status";
import { BotCommandCenter } from "@/components/BotCommandCenter";
import { MarketScanOverlay } from "@/components/MarketScanOverlay";
import { SettlementPopup, type SettlementResult } from "@/components/manual/SettlementPopup";
import { LiveTradeTicker, type LiveTradeInfo } from "@/components/LiveTradeTicker";
import { cn } from "@/lib/utils";
import { playExecute, playProfit, playLoss, startScanLoop, stopScanLoop, primeAudio } from "@/lib/audio-engine";

export const Route = createFileRoute("/_authenticated/bot")({
  component: BotPage,
});

type StrategyMeta = {
  id: StrategyType; name: string; tag: string; desc: string;
  winRate: number; risk: "Low" | "Med" | "High"; market: string; roi: string;
  speed: "Instant" | "Fast" | "Smart"; aiConf: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "accent" | "bull" | "bear";
};

const STRATEGIES: StrategyMeta[] = [
  { id: "rise_fall_ai",       name: "Rise / Fall AI",      tag: "Trend",   desc: "Trend + EMA cross + buy pressure → CALL/PUT.",          winRate: 72, risk: "Med",  market: "V75 / V100", roi: "+8–14%",  speed: "Smart",   aiConf: 78, icon: TrendingUp, tone: "primary" },
  { id: "even_odd_ai",        name: "Even / Odd AI",       tag: "Digits",  desc: "Last-digit parity bias detection on tick stream.",      winRate: 64, risk: "Low",  market: "V100",        roi: "+6–10%",  speed: "Fast",    aiConf: 72, icon: Sigma,      tone: "accent"  },
  { id: "over_under_ai",      name: "Over / Under AI",     tag: "Digits",  desc: "Selects digit barrier with the strongest statistical edge.", winRate: 66, risk: "Med",  market: "V100",     roi: "+6–11%",  speed: "Fast",    aiConf: 74, icon: Hash,       tone: "bull"    },
  { id: "matches_differs_ai", name: "Matches / Differs AI",tag: "Digits",  desc: "Hunts hot/cold digits and fires DIGITDIFF on rare repeats.", winRate: 70, risk: "Med",  market: "V75 / V100", roi: "+7–13%", speed: "Instant", aiConf: 80, icon: Shuffle,    tone: "bear"    },
];

function BotPage() {
  const { user } = useAuth();
  const { client, active, balance } = useDeriv();
  const [strategy, setStrategy] = useState<StrategyType>("rise_fall_ai");
  const [symbol, setSymbol] = useState("R_100");
  const [stake, setStake] = useState("1");
  const [ticks, setTicks] = useState("5");
  const [barrier, setBarrier] = useState("5");
  const [martingale, setMartingale] = useState("2");
  const [tp, setTp] = useState("10");
  const [maxLosses, setMaxLosses] = useState("3");
  const [minConfidence, setMinConfidence] = useState("70");
  const [dailyLossLimit, setDailyLossLimit] = useState("25");
  const [maxTrades, setMaxTrades] = useState("10");

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState<BotState>("idle");
  const [stateDetail, setStateDetail] = useState<string>("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [, setLogs] = useState<{ t: number; msg: string; tone?: string }[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const autoStoppedRef = useRef(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [dangerConf, setDangerConf] = useState(0);
  const [settlement, setSettlement] = useState<SettlementResult>(null);
  const [liveTrade, setLiveTrade] = useState<LiveTradeInfo>(null);
  const openTradesRef = useRef<Map<number, { contract_type: string; stake: number }>>(new Map());
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

  const beginScan = () => {
    if (!client || !active || !user) { toast.error("Connect a Deriv account first"); return; }
    setScanOpen(true);
  };

  const start = async (overrideSymbol?: string) => {
    if (!client || !active || !user) { toast.error("Connect a Deriv account first"); return; }
    const sym = overrideSymbol || symbol;
    if (overrideSymbol && overrideSymbol !== symbol) setSymbol(overrideSymbol);
    primeAudio();
    const cfg: StrategyConfig = {
      type: strategy, symbol: sym, stake: Number(stake),
      duration: Math.max(1, Number(ticks) || 1), duration_unit: "t",
      barrier: Number(barrier),
      martingale: Number(martingale),
      take_profit: Number(tp) || undefined,
      max_consecutive_losses: Number(maxLosses) || undefined,
      daily_loss_limit: Number(dailyLossLimit) || undefined,
      max_trades: Number(maxTrades) || undefined,
      risk_mode: "normal" as RiskMode,
      stake_mode: "martingale",
      min_confidence: Number(minConfidence) || 65,
    };

    const { data: run } = await supabase.from("bot_runs").insert({
      user_id: user.id, status: "running", strategy_id: null, notes: JSON.stringify(cfg),
    }).select().single();
    runIdRef.current = run?.id ?? null;

    setRunning(true); setPaused(false); setLogs([]); setPnl(0); setTrades(0);
    setWins(0); setLosses(0); setActiveTrades(0);
    streakRef.current = 0; bestStreakRef.current = 0; tpFiredRef.current = false;
    autoStoppedRef.current = false;
    setDangerOpen(false);
    const baseEquity = balance?.balance ?? 0;
    const accountType: "Demo" | "Real" = active.is_virtual ? "Demo" : "Real";
    setBotStatus({
      running: true, paused: false, strategy, symbol: sym,
      pnl: 0, trades: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, peak: 0,
      baseEquity, currency: balance?.currency || "USD",
      takeProfit: Number(tp) || undefined,
      confidence: 0, direction: "WAIT", activeTrades: 0,
      accountType, loginid: active.loginid, startedAt: Date.now(),
    });
    emitBotEvent({ kind: "info", message: `Bot online · ${strategy} on ${sym} · ${accountType} account`, symbol: sym });

    const runner = new BotRunner(
      client, cfg, balance?.currency || "USD",
      (e) => {
        if (e.kind === "log") log(e.msg, e.level);
        if (e.kind === "state") {
          setState(e.state); setStateDetail(e.detail || "");
          if (e.state === "scanning" && e.detail) {
            emitBotEvent({ kind: "scan", message: e.detail, symbol });
          }
          if (e.state === "scanning" || e.state === "waiting_entry") startScanLoop();
          else stopScanLoop();
        }
        if (e.kind === "analysis") {
          setAnalysis(e.analysis);
          setBotStatus({
            running: true, paused, strategy, symbol,
            pnl, trades, wins, losses,
            streak: streakRef.current, bestStreak: bestStreakRef.current,
            baseEquity, currency: balance?.currency || "USD",
            takeProfit: Number(tp) || undefined,
            confidence: e.analysis.confidence, direction: e.analysis.recommendation,
            activeTrades, accountType, loginid: active.loginid, startedAt: Date.now(),
          });
        }
        if (e.kind === "trade_open") {
          setActiveTrades((n) => n + 1);
          openTradesRef.current.set(e.contract_id, { contract_type: e.contract_type, stake: e.stake });
          playExecute();
          setLiveTrade({
            contract_id: e.contract_id,
            contract_type: e.contract_type,
            stake: e.stake,
            symbol: cfg.symbol,
            currency: balance?.currency || "USD",
          });
          emitBotEvent({
            kind: "open", symbol, contract: e.contract_type,
            confidence: analysis?.confidence,
            message: `Opened ${e.contract_type} · stake ${e.stake.toFixed(2)} ${balance?.currency || ""}`,
          });
        }
        if (e.kind === "trade_close") {
          setActiveTrades((n) => Math.max(0, n - 1));
          const profit = e.profit;
          if (profit > 0) playProfit();
          else if (profit < 0) playLoss();
          const meta = openTradesRef.current.get(e.contract_id);
          openTradesRef.current.delete(e.contract_id);
          setSettlement({
            profit,
            contract_type: meta?.contract_type || cfg.type,
            stake: meta?.stake ?? Number(stake),
            entry_spot: null,
            exit_spot: null,
            currency: balance?.currency || "USD",
          });
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
              takeProfit: Number(tp) || undefined,
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
          stopScanLoop();
          if (e.reason?.includes("Max trades")) {
            toast.success(`Target reached · ${e.reason} · PnL ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ${balance?.currency || ""}`);
          }
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

  useEffect(() => () => { runnerRef.current?.stop("Page closed"); stopScanLoop(); }, []);

  // Auto-stop when market confidence collapses below 56% — show danger popup.
  useEffect(() => {
    const r = runnerRef.current;
    if (!r || !running || !analysis) return;
    if (analysis.confidence < 56 && !autoStoppedRef.current) {
      autoStoppedRef.current = true;
      setDangerConf(analysis.confidence);
      setDangerOpen(true);
      r.stop(`Danger market · confidence ${analysis.confidence}% below 56%`);
      emitBotEvent({
        kind: "info",
        message: `⚠️ Danger market · auto-stopped at ${analysis.confidence}% confidence`,
        symbol,
      });
    }
  }, [analysis, running, symbol]);

  // Allow the TP modal "Stop Bot" button to stop the bot from anywhere
  useEffect(() => {
    const onStop = () => runnerRef.current?.stop("Stopped from celebration");
    window.addEventListener("hifex:bot-stop", onStop);
    return () => window.removeEventListener("hifex:bot-stop", onStop);
  }, []);

  return (
    <div className="space-y-6">
      <SettlementPopup result={settlement} onClose={() => setSettlement(null)} />
      {dangerOpen && (
        <div className="pointer-events-none fixed inset-0 z-[110] flex items-start justify-center pt-24 px-4 animate-fade-in">
          <div className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-bear/70 bg-bear/15 p-5 backdrop-blur-xl shadow-[0_0_60px_-10px_var(--meter-bear)]">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-full bg-bear/25 text-bear animate-pulse">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-bear">Danger market</div>
                <div className="mt-0.5 text-base font-extrabold">Auto-stopped trading</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Market confidence on <span className="font-semibold text-foreground">{symbol}</span> dropped
                  to <span className="num font-bold text-bear">{dangerConf}%</span> — below the 56% safety floor.
                  Re-scan when conditions improve.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDangerOpen(false)}>
                    Dismiss
                  </Button>
                  <Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                    onClick={() => { setDangerOpen(false); beginScan(); }}>
                    Re-scan markets
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <MarketScanOverlay
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onExecute={(sym) => {
          setScanOpen(false);
          start(sym);
        }}
      />

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
        protection={{
          dailyRemaining: Math.max(0, Number(dailyLossLimit) + Math.min(0, pnl)),
          drawdown: Math.min(0, pnl),
          exposure: Number(stake) || 0,
          currency: balance?.currency || "USD",
        }}
        onStart={beginScan}
        onPause={togglePause}
        onStop={stop}
        onEmergency={emergency}
      />

      {liveTrade && (
        <LiveTradeTicker
          trade={liveTrade}
          onClear={() => setLiveTrade(null)}
          paused={paused}
          onPause={togglePause}
          onResume={togglePause}
          sellAfterTicks={Math.max(1, Number(ticks) || 1)}
          onBotStop={stop}
          onSettlement={(r) => {
            setSettlement({
              profit: r.profit,
              contract_type: r.contract_type,
              stake: r.stake,
              entry_spot: r.entry_spot,
              exit_spot: r.exit_spot,
              currency: r.currency,
            });
          }}
        />
      )}

      {/* Settings (collapsible) */}
      <div className="grid gap-6">
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
            <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">AI Strategy</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STRATEGIES.map((s) => {
                const active = strategy === s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStrategy(s.id)}
                    disabled={running}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-300",
                      active
                        ? "border-primary/60 bg-gradient-to-br from-primary/10 via-background/40 to-accent/10 shadow-[0_0_30px_-8px_oklch(0.82_0.15_85/0.5)] ring-1 ring-primary/40"
                        : "border-border/50 bg-background/40 hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    {active && <div className="pointer-events-none absolute inset-0 shimmer-gold opacity-20" />}
                    <div className="relative flex items-start gap-2.5">
                      <span className={cn(
                        "grid h-9 w-9 flex-none place-items-center rounded-xl border transition-colors",
                        s.tone === "primary" && "border-primary/40 bg-primary/10 text-primary",
                        s.tone === "accent"  && "border-accent/40 bg-accent/10 text-accent",
                        s.tone === "bull"    && "border-bull/40 bg-bull/10 text-bull",
                        s.tone === "bear"    && "border-bear/40 bg-bear/10 text-bear",
                      )}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[13px] font-semibold leading-tight">{s.name}</div>
                          {active && <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          <span className="text-bull num font-semibold">{s.winRate}% win</span>
                          <span>·</span>
                          <span className="num">AI {s.aiConf}%</span>
                          <span>·</span>
                          <span>{s.market}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className={cn(
                            "rounded-full border px-1.5 py-[1px] text-[9px] uppercase tracking-wider",
                            s.risk === "Low"  && "border-bull/40 text-bull",
                            s.risk === "Med"  && "border-warning/40 text-warning",
                            s.risk === "High" && "border-bear/40 text-bear",
                          )}>{s.risk} risk</span>
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 px-1.5 py-[1px] text-[9px] uppercase tracking-wider text-primary">
                            <Zap className="h-2.5 w-2.5" />{s.speed}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">{meta.desc}</p>
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
            <div><Label>Ticks</Label><Input className="num" value={ticks} onChange={(e) => setTicks(e.target.value)} /></div>
            <div><Label>Martingale</Label><Input className="num" value={martingale} onChange={(e) => setMartingale(e.target.value)} /></div>
          </div>

          {(strategy === "over_under_ai" || strategy === "matches_differs_ai") && (
            <div><Label>Barrier digit (0-9)</Label><Input className="num" value={barrier} onChange={(e) => setBarrier(e.target.value)} /></div>
          )}

          <div className="grid grid-cols-4 gap-2">
            <div><Label>Take profit</Label><Input className="num" value={tp} onChange={(e) => setTp(e.target.value)} /></div>
            <div><Label>Max losses</Label><Input className="num" value={maxLosses} onChange={(e) => setMaxLosses(e.target.value)} /></div>
            <div><Label>Min conf %</Label><Input className="num" value={minConfidence} onChange={(e) => setMinConfidence(e.target.value)} /></div>
            <div><Label>Max trades</Label><Input className="num" value={maxTrades} onChange={(e) => setMaxTrades(e.target.value)} /></div>
          </div>

            <p className="flex items-center gap-1 pt-1 text-[10px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-warning" /> Bot runs in your browser. Closing this tab stops it.
            </p>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}


