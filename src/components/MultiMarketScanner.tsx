import { useEffect, useMemo, useRef, useState } from "react";
import { useDeriv } from "@/hooks/use-deriv";
import { analyze, type Analysis } from "@/lib/ai-analysis";
import { Activity, Brain, Flame, Radar, Target, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type MarketDef = { symbol: string; name: string; group: "Vol" | "1s" | "Boom/Crash" | "Step" | "Jump" };

const SCAN_MARKETS: MarketDef[] = [
  { symbol: "R_10",     name: "Vol 10",   group: "Vol" },
  { symbol: "R_25",     name: "Vol 25",   group: "Vol" },
  { symbol: "R_50",     name: "Vol 50",   group: "Vol" },
  { symbol: "R_75",     name: "Vol 75",   group: "Vol" },
  { symbol: "R_100",    name: "Vol 100",  group: "Vol" },
  { symbol: "1HZ10V",   name: "Vol 10 (1s)",  group: "1s" },
  { symbol: "1HZ25V",   name: "Vol 25 (1s)",  group: "1s" },
  { symbol: "1HZ50V",   name: "Vol 50 (1s)",  group: "1s" },
  { symbol: "1HZ75V",   name: "Vol 75 (1s)",  group: "1s" },
  { symbol: "1HZ100V",  name: "Vol 100 (1s)", group: "1s" },
  { symbol: "1HZ150V",  name: "Vol 150 (1s)", group: "1s" },
  { symbol: "1HZ250V",  name: "Vol 250 (1s)", group: "1s" },
  { symbol: "1HZ300V",  name: "Vol 300 (1s)", group: "1s" },
  { symbol: "BOOM1000", name: "Boom 1000",    group: "Boom/Crash" },
  { symbol: "BOOM500",  name: "Boom 500",     group: "Boom/Crash" },
  { symbol: "CRASH1000", name: "Crash 1000",  group: "Boom/Crash" },
  { symbol: "CRASH500",  name: "Crash 500",   group: "Boom/Crash" },
  { symbol: "stpRNG",   name: "Step Index",   group: "Step" },
  { symbol: "JD10",     name: "Jump 10",      group: "Jump" },
  { symbol: "JD25",     name: "Jump 25",      group: "Jump" },
  { symbol: "JD50",     name: "Jump 50",      group: "Jump" },
  { symbol: "JD75",     name: "Jump 75",      group: "Jump" },
  { symbol: "JD100",    name: "Jump 100",     group: "Jump" },
];

type Row = MarketDef & { ticks: number[]; analysis: Analysis | null; live: boolean };

export type ScannerSignal = {
  symbol: string; name: string; confidence: number;
  direction: "RISE" | "FALL" | "WAIT"; momentum: number; volatility: number;
  state: "execute" | "wait" | "danger";
};

function signalState(conf: number, vol: number): ScannerSignal["state"] {
  if (vol >= 85) return "danger";
  if (conf >= 61) return "execute";
  return "wait";
}

export function MultiMarketScanner({
  activeSymbol, onSelectMarket, onBestSignal,
}: {
  activeSymbol?: string;
  onSelectMarket?: (symbol: string) => void;
  onBestSignal?: (s: ScannerSignal | null) => void;
}) {
  const { client } = useDeriv();
  const [rows, setRows] = useState<Row[]>(() =>
    SCAN_MARKETS.map((m) => ({ ...m, ticks: [], analysis: null, live: false })),
  );
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    const offs: Array<() => void> = [];
    setScanning(true);
    (async () => {
      for (const m of SCAN_MARKETS) {
        if (cancelled) break;
        try {
          const hist: any = await client.send({
            ticks_history: m.symbol, count: 40, end: "latest", style: "ticks",
          });
          if (cancelled) break;
          if (hist?.history?.prices) {
            const prices = (hist.history.prices as any[]).map((p) => Number(p)).slice(-40);
            setRows((rs) => rs.map((r) => (r.symbol === m.symbol ? { ...r, ticks: prices, live: true } : r)));
          }
          const off = await client.subscribeTicks(m.symbol, (t) => {
            setRows((rs) => rs.map((r) => {
              if (r.symbol !== m.symbol) return r;
              const ticks = [...r.ticks, t.quote].slice(-60);
              return { ...r, ticks, live: true };
            }));
          });
          offs.push(off);
        } catch {
          // unsupported symbol — skip silently
        }
      }
    })();
    return () => { cancelled = true; setScanning(false); offs.forEach((o) => o()); };
  }, [client]);

  const ranked = useMemo(() => {
    const enriched = rows.map((r) => {
      const analysis = r.ticks.length >= 15 ? analyze(r.ticks) : null;
      return { ...r, analysis };
    });
    return [...enriched].sort(
      (a, b) => (b.analysis?.confidence ?? 0) - (a.analysis?.confidence ?? 0),
    );
  }, [rows]);

  const best = ranked.find((r) => r.analysis) ?? null;
  const bestSig: ScannerSignal | null = best && best.analysis
    ? {
        symbol: best.symbol, name: best.name,
        confidence: best.analysis.confidence,
        direction: best.analysis.recommendation,
        momentum: best.analysis.momentum,
        volatility: best.analysis.volatility,
        state: signalState(best.analysis.confidence, best.analysis.volatility),
      }
    : null;

  const lastEmit = useRef<string>("");
  useEffect(() => {
    if (!onBestSignal) return;
    const key = bestSig ? `${bestSig.symbol}:${bestSig.confidence}:${bestSig.direction}:${bestSig.state}` : "none";
    if (key !== lastEmit.current) {
      lastEmit.current = key;
      onBestSignal(bestSig);
    }
  }, [bestSig, onBestSignal]);

  return (
    <div className="card-premium overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-gradient-to-r from-primary/10 via-background/0 to-accent/10 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Radar className={cn("h-4 w-4", scanning && "animate-spin [animation-duration:4s]")} />
            <span className="absolute inset-0 rounded-xl ring-1 ring-primary/30 animate-pulse" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Multi-Market AI Scanner</h3>
              <span className="rounded-full border border-bull/40 bg-bull/10 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider text-bull">
                Live
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Hunting {SCAN_MARKETS.length} markets · auto-ranking by AI confidence
            </p>
          </div>
        </div>
        <BestBadge sig={bestSig} />
      </div>

      {/* TOP MARKET HERO */}
      {bestSig && (
        <div className={cn(
          "relative overflow-hidden border-b border-border/40 p-4 transition-all",
          bestSig.state === "execute" && "bg-gradient-to-br from-bull/15 via-background/0 to-bull/5",
          bestSig.state === "wait"    && "bg-gradient-to-br from-warning/10 via-background/0 to-warning/5",
          bestSig.state === "danger"  && "bg-gradient-to-br from-bear/15 via-background/0 to-bear/5",
        )}>
          {bestSig.state === "execute" && (
            <div className="pointer-events-none absolute inset-0 ring-1 ring-bull/40 shadow-[0_0_50px_-10px_oklch(0.7_0.18_145/0.6)] animate-pulse" />
          )}
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <Flame className="h-3 w-3 text-warning" /> Top Market
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight">{bestSig.name}</span>
                <span className="rounded-md border border-border/60 bg-background/40 px-1.5 py-[1px] text-[10px] num text-muted-foreground">
                  {bestSig.symbol}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {bestSig.state === "execute" && (
                  <span className="font-semibold text-bull">⚡ EXECUTE TRADE NOW · AI confirmation reached</span>
                )}
                {bestSig.state === "wait" && (
                  <span className="font-semibold text-warning">⏸ Market weakening — waiting for stronger confirmation</span>
                )}
                {bestSig.state === "danger" && (
                  <span className="font-semibold text-bear">⚠ Market unstable — high volatility</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DirChip dir={bestSig.direction} />
              <ConfDial conf={bestSig.confidence} state={bestSig.state} />
              {onSelectMarket && bestSig.symbol !== activeSymbol && (
                <button
                  type="button"
                  onClick={() => onSelectMarket(bestSig.symbol)}
                  className="rounded-xl border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-primary/20"
                >
                  <Zap className="mr-1 inline h-3 w-3" />Hunt
                </button>
              )}
            </div>
          </div>
          <div className="relative mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            <Mini icon={<Target className="h-3 w-3" />} label="Confidence" value={`${bestSig.confidence}%`} />
            <Mini icon={<Activity className="h-3 w-3" />} label="Momentum" value={`${bestSig.momentum.toFixed(2)}%`} />
            <Mini icon={<Brain className="h-3 w-3" />} label="Volatility" value={`${bestSig.volatility.toFixed(0)}%`} />
            <Mini icon={<TrendingUp className="h-3 w-3" />} label="Signal" value={bestSig.state.toUpperCase()} />
            <Mini icon={<Flame className="h-3 w-3" />} label="Heat" value={`${Math.min(100, Math.round((bestSig.confidence * 0.7) + (bestSig.volatility * 0.3)))}%`} />
          </div>
        </div>
      )}

      {/* RANKED GRID */}
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.map((r, idx) => {
          const conf = r.analysis?.confidence ?? 0;
          const dir = r.analysis?.recommendation ?? "WAIT";
          const vol = r.analysis?.volatility ?? 0;
          const state: ScannerSignal["state"] = r.analysis ? signalState(conf, vol) : "wait";
          const isActive = r.symbol === activeSymbol;
          const isBest = idx === 0 && !!r.analysis;
          return (
            <button
              key={r.symbol}
              type="button"
              onClick={() => onSelectMarket?.(r.symbol)}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-2.5 text-left transition-all",
                isBest && state === "execute" && "border-bull/60 bg-bull/5 shadow-[0_0_24px_-6px_oklch(0.7_0.18_145/0.7)]",
                isBest && state === "wait"    && "border-warning/50 bg-warning/5",
                isBest && state === "danger"  && "border-bear/60 bg-bear/5",
                !isBest && isActive && "border-primary/50 bg-primary/5",
                !isBest && !isActive && "border-border/40 bg-background/30 hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn(
                    "h-1.5 w-1.5 flex-none rounded-full",
                    r.live ? "bg-bull animate-pulse" : "bg-muted",
                  )} />
                  <span className="text-[12px] font-semibold truncate">{r.name}</span>
                </div>
                <span className={cn(
                  "rounded-full px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider",
                  state === "execute" && "bg-bull/15 text-bull",
                  state === "wait"    && "bg-warning/15 text-warning",
                  state === "danger"  && "bg-bear/15 text-bear",
                )}>
                  {state === "execute" ? "READY" : state === "danger" ? "RISK" : "WAIT"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="num text-foreground font-semibold">{conf}%</span>
                <DirTiny dir={dir} />
                <span className="num">vol {vol.toFixed(0)}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    state === "execute" && "bg-bull",
                    state === "wait"    && "bg-warning",
                    state === "danger"  && "bg-bear",
                  )}
                  style={{ width: `${conf}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BestBadge({ sig }: { sig: ScannerSignal | null }) {
  if (!sig) {
    return (
      <span className="rounded-full border border-border/60 bg-background/40 px-2 py-1 text-[10px] uppercase text-muted-foreground">
        Collecting data…
      </span>
    );
  }
  const tone =
    sig.state === "execute" ? "border-bull/50 bg-bull/15 text-bull"
    : sig.state === "danger" ? "border-bear/50 bg-bear/15 text-bear"
    : "border-warning/50 bg-warning/15 text-warning";
  return (
    <span className={cn("flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider", tone)}>
      <Flame className="h-3 w-3" /> {sig.name} · {sig.confidence}%
    </span>
  );
}

function DirChip({ dir }: { dir: "RISE" | "FALL" | "WAIT" }) {
  if (dir === "RISE") return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-bull/40 bg-bull/10 px-2 py-1 text-[11px] font-bold text-bull">
      <TrendingUp className="h-3 w-3" /> RISE
    </span>
  );
  if (dir === "FALL") return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-bear/40 bg-bear/10 px-2 py-1 text-[11px] font-bold text-bear">
      <TrendingDown className="h-3 w-3" /> FALL
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/40 px-2 py-1 text-[11px] font-bold text-muted-foreground">
      WAIT
    </span>
  );
}

function DirTiny({ dir }: { dir: "RISE" | "FALL" | "WAIT" }) {
  if (dir === "RISE") return <span className="text-bull font-bold">▲ RISE</span>;
  if (dir === "FALL") return <span className="text-bear font-bold">▼ FALL</span>;
  return <span>WAIT</span>;
}

function ConfDial({ conf, state }: { conf: number; state: ScannerSignal["state"] }) {
  const ring = state === "execute" ? "ring-bull/60" : state === "danger" ? "ring-bear/60" : "ring-warning/60";
  const text = state === "execute" ? "text-bull" : state === "danger" ? "text-bear" : "text-warning";
  return (
    <div className={cn("grid h-12 w-12 place-items-center rounded-full bg-background/60 ring-2", ring)}>
      <span className={cn("num text-sm font-bold", text)}>{conf}%</span>
    </div>
  );
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="num text-[12px] font-bold">{value}</div>
    </div>
  );
}