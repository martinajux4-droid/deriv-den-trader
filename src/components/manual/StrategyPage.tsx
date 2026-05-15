import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Cpu, Activity, Gauge } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { supabase } from "@/integrations/supabase/client";
import { DERIV_SYMBOLS } from "@/lib/deriv-symbols";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LivePriceStream } from "./LivePriceStream";
import { AIMomentumStrip } from "./AIMomentumStrip";
import { TradeInputs, type TradeConfig } from "./TradeInputs";
import { ActionButtons } from "./ActionButtons";
import { ManualHistoryTable } from "./ManualHistoryTable";
import { LiveTradeCard, type LiveTrade } from "./LiveTradeCard";
import { SettlementPopup, type SettlementResult } from "./SettlementPopup";
import { OverUnderHistogram } from "./meters/OverUnderHistogram";
import { DigitFrequencyMatrix } from "./meters/DigitFrequencyMatrix";
import { MarketThermometer } from "./meters/MarketThermometer";
import { EvenOddBoard } from "./meters/EvenOddBoard";
import { useTicks } from "@/hooks/use-ticks";
import { analyze, digitStats } from "@/lib/ai-analysis";
import { AIAnalysisPanel, type AiPhase } from "./AIAnalysisPanel";

export type StrategyId = "even-odd" | "over-under" | "matches-differs" | "rise-fall" | "under-digit";

const STRATEGY: Record<StrategyId, {
  title: string; subtitle: string;
  contracts: [string, string]; // [primary, secondary]
  labels: [string, string];
  needsBarrier: boolean;
  showDigit: boolean;
  accent: string; // css color
  accentBg: string;
  accentLabel: string;
  theme: string; // risk-panel theme class
}> = {
  "even-odd":         { title: "Even / Odd",        subtitle: "Last-digit parity strategy", contracts: ["DIGITEVEN", "DIGITODD"], labels: ["EVEN", "ODD"],         needsBarrier: false, showDigit: false, accent: "var(--meter-bull)",     accentBg: "oklch(0.7 0.18 250 / 0.18)",  accentLabel: "Parity AI",     theme: "risk-panel-evenodd" },
  "over-under":       { title: "Over / Under",      subtitle: "Digit threshold prediction", contracts: ["DIGITOVER", "DIGITUNDER"], labels: ["OVER", "UNDER"],     needsBarrier: true,  showDigit: true,  accent: "var(--meter-momentum)", accentBg: "oklch(0.82 0.16 200 / 0.16)", accentLabel: "Threshold AI", theme: "risk-panel-overunder" },
  "matches-differs":  { title: "Matches / Differs", subtitle: "Digit pattern recognition",  contracts: ["DIGITMATCH", "DIGITDIFF"], labels: ["MATCHES", "DIFFERS"], needsBarrier: true,  showDigit: true,  accent: "var(--meter-ai)",       accentBg: "oklch(0.86 0.14 90 / 0.16)",  accentLabel: "Pattern AI",   theme: "risk-panel-matches" },
  "rise-fall":        { title: "Rise / Fall",       subtitle: "Directional momentum trades", contracts: ["CALL", "PUT"], labels: ["RISE", "FALL"],                 needsBarrier: false, showDigit: false, accent: "var(--meter-bear)",     accentBg: "oklch(0.65 0.22 25 / 0.14)",  accentLabel: "Momentum AI", theme: "risk-panel-risefall" },
  "under-digit":      { title: "Under / Digit",     subtitle: "Smart digit prediction matrix", contracts: ["DIGITUNDER", "DIGITOVER"], labels: ["UNDER", "OVER"],     needsBarrier: true,  showDigit: true,  accent: "oklch(0.78 0.16 320)",  accentBg: "oklch(0.78 0.16 320 / 0.16)", accentLabel: "Predictive AI", theme: "risk-panel-overunder" },
};

function Meter({ id, symbol, digit, trading }: {
  id: StrategyId; symbol: string; digit: number;
  trading?: {
    running: boolean; paused: boolean; busy: boolean;
    onStart: () => void; onPause: () => void; onStop: () => void; onTradeNow: () => void;
  };
}) {
  if (id === "even-odd") return <MarketThermometer mode="even-odd" symbol={symbol} {...(trading || {})} />;
  if (id === "over-under") return <OverUnderHistogram symbol={symbol} barrier={digit} />;
  if (id === "matches-differs") return <DigitFrequencyMatrix symbol={symbol} target={digit} />;
  if (id === "under-digit") return <DigitFrequencyMatrix symbol={symbol} target={digit} />;
  return <MarketThermometer mode="rise-fall" symbol={symbol} {...(trading || {})} />;
}

export function StrategyPage({ id }: { id: StrategyId }) {
  const cfgKey = `manual:${id}:cfg`;
  const { user } = useAuth();
  const { client, active, balance, profile } = useDeriv();
  const meta = STRATEGY[id];

  const [symbol, setSymbol] = useState<string>(profile?.default_symbol || "R_100");
  const [direction, setDirection] = useState<0 | 1>(0); // 0 -> primary, 1 -> secondary
  const [cfg, setCfg] = useState<TradeConfig>(() => {
    if (typeof window !== "undefined") {
      try { const raw = localStorage.getItem(cfgKey); if (raw) return JSON.parse(raw); } catch {}
    }
    return { stake: 1, takeProfit: 10, maxLoss: 5, stopLoss: 0, martingale: 2, ticks: 5, duration: 5, durationUnit: "t", digit: 5, riskMultiplier: 1, stakeList: "" };
  });
  useEffect(() => { try { localStorage.setItem(cfgKey, JSON.stringify(cfg)); } catch {} }, [cfg, cfgKey]);

  const symMeta = DERIV_SYMBOLS.find((s) => s.symbol === symbol);

  const [running, setRunning] = useState(false);
  const [safeMode, setSafeMode] = useState(false);
  const [paused, setPaused] = useState(false);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const sessionPnlRef = useRef(0);
  const stakeRef = useRef(cfg.stake);
  const [sessionPnl, setSessionPnl] = useState(0);
  const [busy, setBusy] = useState(false);
  const [liveTrade, setLiveTrade] = useState<LiveTrade | null>(null);
  const [settlement, setSettlement] = useState<SettlementResult>(null);
  const aiEnabledRef = useRef(true);

  // ===== AI gating state (used for even-odd) =====
  const [aiPhase, setAiPhase] = useState<AiPhase>("idle");
  const [lastResult, setLastResult] = useState<"win" | "loss" | "even" | null>(null);
  const consecLossesRef = useRef(0);
  const tickQuotesRef = useRef<number[]>([]);
  const pageTicks = useTicks(symbol, 80);
  useEffect(() => { tickQuotesRef.current = pageTicks.map((t) => t.quote); }, [pageTicks]);

  // Live AI panel data
  const aiAnalysis = useMemo(() => analyze(pageTicks.map((t) => t.quote)), [pageTicks]);
  const aiDigits = useMemo(() => digitStats(pageTicks.map((t) => t.quote)), [pageTicks]);
  const aiStreak = useMemo(() => {
    const quotes = pageTicks.map((t) => t.quote);
    if (!quotes.length) return { kind: "—" as const, len: 0 };
    const digits = quotes.map((q) => Number(String(q.toFixed(5)).replace(".", "").slice(-1)));
    const lastKind: "EVEN" | "ODD" = digits[digits.length - 1] % 2 === 0 ? "EVEN" : "ODD";
    let len = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
      const k = digits[i] % 2 === 0 ? "EVEN" : "ODD";
      if (k === lastKind) len++; else break;
    }
    return { kind: lastKind, len };
  }, [pageTicks]);
  const aiDecision: "EVEN" | "ODD" | "WAIT" = useMemo(() => {
    if (id !== "even-odd") return "WAIT";
    const want: "EVEN" | "ODD" = direction === 0 ? "EVEN" : "ODD";
    const wantPct = want === "EVEN" ? aiDigits.even : aiDigits.odd;
    const conf = aiAnalysis?.confidence ?? 0;
    const vol = aiAnalysis?.volatility ?? 0;
    const ok = wantPct >= 56 && conf >= 65 && vol < 85 && !(aiStreak.kind === want && aiStreak.len >= 5);
    return ok ? want : "WAIT";
  }, [id, direction, aiDigits, aiAnalysis, aiStreak]);

  // Wait until AI confirms (or running stops)
  const awaitConfirmation = async (): Promise<boolean> => {
    setAiPhase("analyzing");
    await new Promise((r) => setTimeout(r, 600));
    if (!runningRef.current) return false;
    setAiPhase("scanning");
    await new Promise((r) => setTimeout(r, 600));
    if (!runningRef.current) return false;
    setAiPhase("waiting");
    const want: "EVEN" | "ODD" = direction === 0 ? "EVEN" : "ODD";
    const start = Date.now();
    while (runningRef.current && Date.now() - start < 30_000) {
      while (pausedRef.current && runningRef.current) await new Promise((r) => setTimeout(r, 250));
      if (!runningRef.current) return false;
      const quotes = tickQuotesRef.current;
      if (quotes.length >= 20) {
        const ds = digitStats(quotes);
        const a = analyze(quotes);
        const wantPct = want === "EVEN" ? ds.even : ds.odd;
        const conf = a?.confidence ?? 0;
        const vol = a?.volatility ?? 0;
        // streak guard
        const digits = quotes.map((q) => Number(String(q.toFixed(5)).replace(".", "").slice(-1)));
        const lastKind = digits[digits.length - 1] % 2 === 0 ? "EVEN" : "ODD";
        let len = 0;
        for (let i = digits.length - 1; i >= 0; i--) {
          const k = digits[i] % 2 === 0 ? "EVEN" : "ODD";
          if (k === lastKind) len++; else break;
        }
        const streakBlock = lastKind === want && len >= 5;
        if (wantPct >= 56 && conf >= 65 && vol < 85 && !streakBlock) {
          setAiPhase("ready");
          await new Promise((r) => setTimeout(r, 250));
          return true;
        }
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    return runningRef.current;
  };

  const placeOnce = async (auto = false): Promise<number | null> => {
    if (!client || !active || !user) { toast.error("Connect a Deriv account first"); return null; }
    const contract = meta.contracts[direction];
    const amount = auto ? stakeRef.current : cfg.stake;
    setBusy(true);
    try {
      const proposal = await client.getProposal({
        contract_type: contract,
        symbol,
        amount,
        duration: cfg.ticks,
        duration_unit: "t",
        currency: balance?.currency || "USD",
        ...(meta.needsBarrier ? { barrier: cfg.digit } : {}),
      });
      const buy = await client.buyContract(proposal.id, proposal.ask_price);

      const { data: trade } = await supabase.from("trades").insert({
        user_id: user.id,
        contract_id: String(buy.contract_id),
        symbol,
        contract_type: contract,
        stake: amount,
        payout: buy.payout,
        duration: cfg.ticks,
        duration_unit: "t",
        is_virtual: active.is_virtual,
        loginid: active.loginid,
        status: "open",
      }).select().single();

      setLiveTrade({
        contract_id: buy.contract_id,
        contract_type: contract,
        stake: amount,
        entry_spot: null,
        current_spot: null,
        exit_spot: null,
        profit: null,
        status: "open",
      });

      const settled = await client.waitForContract(buy.contract_id, (c: any) => {
        setLiveTrade((prev) => prev && {
          ...prev,
          entry_spot: c.entry_spot ?? prev.entry_spot,
          current_spot: c.current_spot ?? c.entry_spot ?? prev.current_spot,
          exit_spot: c.exit_spot ?? prev.exit_spot,
          profit: c.profit ?? prev.profit,
        });
      });
      const profit = Number(settled.profit ?? 0);
      const status: LiveTrade["status"] = profit > 0 ? "won" : profit < 0 ? "lost" : "even";
      setLiveTrade({
        contract_id: buy.contract_id,
        contract_type: contract,
        stake: amount,
        entry_spot: settled.entry_spot ?? null,
        current_spot: settled.exit_spot ?? null,
        exit_spot: settled.exit_spot ?? null,
        profit,
        status,
      });
      setSettlement({
        profit,
        contract_type: contract,
        stake: amount,
        entry_spot: settled.entry_spot ?? null,
        exit_spot: settled.exit_spot ?? null,
        currency: balance?.currency,
      });
      // clear the live card after a brief moment so history remains the source of truth
      setTimeout(() => setLiveTrade((cur) => (cur && cur.contract_id === buy.contract_id ? null : cur)), 4000);
      if (trade) {
        await supabase.from("trades").update({
          profit, payout: settled.payout,
          entry_spot: settled.entry_spot, exit_spot: settled.exit_spot,
          status: profit > 0 ? "won" : profit < 0 ? "lost" : "even",
          closed_at: new Date().toISOString(), raw: settled,
        }).eq("id", trade.id);
      }
      return profit;
    } catch (e: any) {
      toast.error(e.message || e.error?.message || "Trade failed");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const startLoop = async (useAi = true) => {
    if (runningRef.current) return;
    aiEnabledRef.current = useAi;
    runningRef.current = true; setRunning(true);
    sessionPnlRef.current = 0; setSessionPnl(0);
    stakeRef.current = cfg.stake;
    consecLossesRef.current = 0;
    setLastResult(null);
    setAiPhase(useAi && id === "even-odd" ? "analyzing" : "idle");

    while (runningRef.current) {
      // honor pause
      while (pausedRef.current && runningRef.current) {
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!runningRef.current) break;

      // AI gating for even-odd
      if (useAi && id === "even-odd") {
        const ok = await awaitConfirmation();
        if (!ok || !runningRef.current) break;
      }
      setAiPhase("executing");
      const profit = await placeOnce(true);
      if (profit == null) break;
      sessionPnlRef.current += profit;
      setSessionPnl(sessionPnlRef.current);
      setLastResult(profit > 0 ? "win" : profit < 0 ? "loss" : "even");
      if (profit < 0) consecLossesRef.current += 1; else consecLossesRef.current = 0;

      if (cfg.takeProfit > 0 && sessionPnlRef.current >= cfg.takeProfit) {
        toast.success(`Take profit hit: +${sessionPnlRef.current.toFixed(2)}`); break;
      }
      if (cfg.maxLoss > 0 && sessionPnlRef.current <= -Math.abs(cfg.maxLoss)) {
        toast.error(`Max loss hit: ${sessionPnlRef.current.toFixed(2)}`); break;
      }
      // martingale
      if (profit < 0 && cfg.martingale > 1) {
        stakeRef.current = Math.max(0.35, +(stakeRef.current * cfg.martingale).toFixed(2));
      } else {
        stakeRef.current = cfg.stake;
      }
      // cooldown after consecutive losses
      if (useAi && consecLossesRef.current >= 3) {
        setAiPhase("cooldown");
        const start = Date.now();
        while (runningRef.current && Date.now() - start < 8000) {
          await new Promise((r) => setTimeout(r, 300));
        }
        consecLossesRef.current = 0;
      }
      // safe-mode or non-AI pause between trades
      if (safeMode || !aiEnabledRef.current) await new Promise((r) => setTimeout(r, 1500));
    }
    runningRef.current = false; setRunning(false);
    setAiPhase("idle");
  };
  const stopLoop = () => { runningRef.current = false; pausedRef.current = false; setPaused(false); setRunning(false); setAiPhase("idle"); };
  const pauseLoop = () => { pausedRef.current = true; setPaused(true); };
  const resumeLoop = () => { pausedRef.current = false; setPaused(false); };
  useEffect(() => () => { runningRef.current = false; }, []);

  const headerAccent = useMemo(() => ({ background: meta.accentBg, color: meta.accent }), [meta]);

  // Header live status
  const headerTicks = useTicks(symbol, 60);
  const headerAnalysis = analyze(headerTicks.map((t) => t.quote));
  const ready = (headerAnalysis?.entryScore ?? 0) >= 60 && (headerAnalysis?.confidence ?? 0) >= 70;
  const vol = headerAnalysis?.volatility ?? 0;

  return (
    <div className="animate-fade-in space-y-4 pb-28 md:pb-28">
      {/* Header */}
      <div className="glass-card p-3 sm:p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/manual" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] truncate" style={headerAccent}>{meta.accentLabel}</span>
                <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${ready ? "border-bull/40 bg-bull/10 text-bull" : "border-white/10 bg-white/[0.02] text-muted-foreground"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-bull animate-pulse" : "bg-muted-foreground"}`} />
                  {ready ? "Engine ready" : "Calibrating"}
                </span>
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{meta.title}</h1>
              <p className="text-[11px] text-muted-foreground sm:text-xs">{meta.subtitle}</p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="input-glow h-10 w-full border-0 sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DERIV_SYMBOLS.map((s) => <SelectItem key={s.symbol} value={s.symbol}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground"><Cpu className="h-2.5 w-2.5" />AI engine</div>
            <div className="text-xs font-semibold" style={{ color: meta.accent }}>{meta.accentLabel}</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground"><Activity className="h-2.5 w-2.5" />Market readiness</div>
            <div className="text-xs num font-semibold">{headerAnalysis?.entryScore ?? 0}/100</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground"><Gauge className="h-2.5 w-2.5" />Volatility</div>
            <div className={`text-xs num font-semibold ${vol >= 70 ? "text-bear" : vol >= 40 ? "text-warning" : "text-bull"}`}>{vol.toFixed(0)}%</div>
          </div>
        </div>
        <div className="mt-3 border-t border-white/5 pt-3 sm:mt-4 sm:pt-4">
          <LivePriceStream symbol={symbol} name={symMeta?.name || symbol} />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Meter */}
        <div className="glass-card p-3 sm:p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Market meter</div>
              <div className="text-sm font-medium">Live signal — {meta.title}</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="num">{symbol}</span>
            </div>
          </div>
          <Meter
            id={id}
            symbol={symbol}
            digit={cfg.digit}
            trading={{
              running, paused, busy,
              onStart: () => (paused ? resumeLoop() : startLoop()),
              onPause: pauseLoop,
              onStop: stopLoop,
              onTradeNow: () => placeOnce(false),
            }}
          />
        </div>

        {/* Inputs + actions — Premium AI Risk Control Panel */}
        <div className="space-y-3">
          <div className={`risk-panel ${meta.theme} p-4`}>
            <div className="risk-panel-particles" aria-hidden />
            <div className="risk-panel-scan" aria-hidden />
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Risk Control</div>
              <span className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${running ? "border-bull/40 bg-bull/10 text-bull" : "border-white/10 bg-white/[0.02] text-muted-foreground"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-bull animate-pulse" : "bg-muted-foreground"}`} />
                {running ? "Live trading" : "Standby"}
              </span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-1">
              {meta.labels.map((lbl, i) => {
                const isActive = direction === i;
                const flavor = i === 0 ? "risk-tab-water" : "risk-tab-fire";
                return (
                  <button key={lbl} onClick={() => setDirection(i as 0 | 1)}
                          className={`risk-tab py-2 text-xs font-semibold uppercase tracking-[0.18em] ${isActive ? flavor : "risk-tab-idle"}`}>
                    <span className="relative z-[2]">{lbl}</span>
                  </button>
                );
              })}
            </div>

            <TradeInputs cfg={cfg} setCfg={setCfg} showDigit={meta.showDigit} />

            <div className={`risk-pnl mt-3 flex items-center justify-between px-3 py-2 text-xs ${sessionPnl >= 0 ? "risk-pnl-bull" : "risk-pnl-bear"}`}>
              <span className="relative z-[1] text-muted-foreground uppercase tracking-[0.16em] text-[10px]">Session P&amp;L</span>
              <span className={`relative z-[1] num font-semibold text-base ${sessionPnl >= 0 ? "text-bull" : "text-bear"}`}>{sessionPnl >= 0 ? "+" : ""}{sessionPnl.toFixed(2)}</span>
            </div>

            <div className="mt-3">
              <ActionButtons running={running} safeMode={safeMode} disabled={busy && !running}
                             tradeBusy={busy}
                             paused={paused}
                             onStart={() => (paused ? resumeLoop() : startLoop(true))}
                             onStartManual={() => startLoop(false)}
                             onPause={pauseLoop}
                             onStop={stopLoop} onSafe={() => setSafeMode((s) => !s)}
                             onTradeNow={() => placeOnce(false)} />
            </div>
            {!active && <p className="mt-2 text-[11px] text-bear">Connect a Deriv account in Settings to trade.</p>}
          </div>
          <LiveTradeCard trade={liveTrade} />
        </div>
      </div>

      {/* AI momentum + history */}
      {id === "even-odd" && (
        <AIAnalysisPanel
          phase={aiPhase}
          analysis={aiAnalysis}
          evenPct={aiDigits.even}
          oddPct={aiDigits.odd}
          lastDigit={aiDigits.lastDigit}
          streak={aiStreak}
          decision={aiDecision}
          lastResult={lastResult}
        />
      )}
      <AIMomentumStrip symbol={symbol} />
      <ManualHistoryTable contractTypes={meta.contracts} />
      <SettlementPopup result={settlement} onClose={() => setSettlement(null)} />
    </div>
  );
}