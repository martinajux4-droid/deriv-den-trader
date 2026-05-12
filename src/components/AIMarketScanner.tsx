import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles, TrendingUp, TrendingDown, Crosshair, Activity, Zap, ChevronDown } from "lucide-react";
import { useTicks } from "@/hooks/use-ticks";
import { cn } from "@/lib/utils";

type ScanSymbol = { symbol: string; name: string; short: string };

const SCAN_SYMBOLS: ScanSymbol[] = [
  { symbol: "R_10",       name: "Volatility 10",  short: "V10"  },
  { symbol: "R_25",       name: "Volatility 25",  short: "V25"  },
  { symbol: "R_50",       name: "Volatility 50",  short: "V50"  },
  { symbol: "R_75",       name: "Volatility 75",  short: "V75"  },
  { symbol: "R_100",      name: "Volatility 100", short: "V100" },
  { symbol: "BOOM1000",   name: "Boom 1000",      short: "BOOM" },
  { symbol: "CRASH1000",  name: "Crash 1000",     short: "CRSH" },
];

type Score = {
  symbol: string; name: string; short: string; ready: boolean;
  momentum: number; momentumAbs: number; volatility: number;
  buy: number; sell: number; trend: number; speed: number;
  entry: number; risk: number; confidence: number;
  direction: "RISE" | "FALL" | "WAIT"; last: number;
};

function scoreSymbol(meta: ScanSymbol, ticks: { quote: number; epoch: number }[]): Score {
  const empty: Score = {
    symbol: meta.symbol, name: meta.name, short: meta.short, ready: false,
    momentum: 0, momentumAbs: 0, volatility: 0, buy: 50, sell: 50, trend: 0,
    speed: 0, entry: 0, risk: 60, confidence: 0, direction: "WAIT", last: 0,
  };
  if (ticks.length < 8) return empty;
  const q = ticks.map((t) => t.quote);
  const last = q[q.length - 1];
  const prev = q[Math.max(0, q.length - 11)];
  const momentum = ((last - prev) / prev) * 100;
  const momentumAbs = Math.min(100, Math.abs(momentum) * 80);

  let ups = 0, downs = 0, sumAbs = 0;
  for (let i = 1; i < q.length; i++) {
    const d = q[i] - q[i - 1];
    if (d > 0) ups++; else if (d < 0) downs++;
    sumAbs += Math.abs(d);
  }
  const total = ups + downs || 1;
  const buy = Math.round((ups / total) * 100);
  const sell = 100 - buy;

  const mean = q.reduce((a, b) => a + b, 0) / q.length;
  const variance = q.reduce((a, b) => a + (b - mean) ** 2, 0) / q.length;
  const stdev = Math.sqrt(variance);
  const volatility = Math.min(100, (stdev / Math.max(1e-6, mean)) * 8000);

  const trend = Math.min(100, Math.abs(buy - 50) * 2 + momentumAbs * 0.3);
  const speed = Math.min(100, (sumAbs / Math.max(1e-6, mean)) * 6000);
  const entry = Math.round(Math.min(100, trend * 0.55 + momentumAbs * 0.35 + Math.min(50, volatility) * 0.2));
  const risk = Math.round(Math.max(8, Math.min(95, 100 - entry * 0.6 + Math.max(0, volatility - 60) * 0.4)));
  const confidence = Math.round(Math.max(0, Math.min(98, entry * 0.7 + (100 - risk) * 0.3)));
  const direction: "RISE" | "FALL" | "WAIT" =
    confidence < 55 ? "WAIT" : momentum >= 0 ? "RISE" : "FALL";

  return {
    symbol: meta.symbol, name: meta.name, short: meta.short, ready: true,
    momentum, momentumAbs, volatility, buy, sell, trend, speed,
    entry, risk, confidence, direction, last,
  };
}

function SymbolFeeder({ meta, onScore }: { meta: ScanSymbol; onScore: (s: Score) => void }) {
  const ticks = useTicks(meta.symbol, 40);
  useEffect(() => { onScore(scoreSymbol(meta, ticks)); /* eslint-disable-next-line */ }, [ticks]);
  return null;
}

function entryGrade(entry: number) {
  if (entry >= 85) return "A+";
  if (entry >= 75) return "A";
  if (entry >= 65) return "B";
  if (entry >= 55) return "C";
  return "—";
}

export function AIMarketScanner({
  activeSymbol,
  minConfidence = 70,
  onSelectMarket,
  running = false,
}: {
  activeSymbol?: string;
  minConfidence?: number;
  onSelectMarket?: (symbol: string) => void;
  running?: boolean;
}) {
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [open, setOpen] = useState(false);
  const [userToggled, setUserToggled] = useState(false);

  // Auto-minimize when bot starts running, unless user manually toggled
  useEffect(() => {
    if (!userToggled) setOpen(!running);
  }, [running, userToggled]);

  const ranked = useMemo(() => {
    return SCAN_SYMBOLS
      .map((m) => scores[m.symbol] ?? scoreSymbol(m, []))
      .sort((a, b) => b.confidence - a.confidence);
  }, [scores]);

  const best = ranked[0]?.ready ? ranked[0] : null;
  const bestQualified = best && best.confidence >= minConfidence ? best : null;
  const top3 = ranked.slice(0, 3);

  // Minimized header chip values
  const headSymbol = best?.short ?? "—";
  const headConf = best?.ready ? `${best.confidence}%` : "—";
  const headDir = best?.direction ?? "WAIT";

  const toggle = () => { setUserToggled(true); setOpen((o) => !o); };

  return (
    <div className={cn(
      "card-premium relative overflow-hidden transition-all duration-500",
      open ? "p-5 sm:p-6" : "p-3 sm:p-4",
    )}>
      {/* hidden tick subscribers — always mounted so live data keeps flowing */}
      <div className="hidden">
        {SCAN_SYMBOLS.map((m) => (
          <SymbolFeeder key={m.symbol} meta={m}
            onScore={(s) => setScores((cur) => ({ ...cur, [m.symbol]: s }))} />
        ))}
      </div>

      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-[0.04] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black,transparent_80%)]" />

      {/* COMPACT HEADER — always visible, click to expand */}
      <button
        type="button"
        onClick={toggle}
        className="relative flex w-full items-center gap-3 text-left"
      >
        <div className="relative grid h-10 w-10 flex-none place-items-center rounded-xl bg-gold-gradient text-primary-foreground shadow-[0_0_24px_oklch(0.82_0.15_85/0.4)]">
          <Brain className="h-4 w-4" />
          <span className="absolute -inset-1 rounded-xl border border-primary/30 ai-ring-pulse" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-semibold tracking-tight">AI Scanner</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-bull/40 bg-bull/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-bull">
              <span className="h-1 w-1 rounded-full bg-bull animate-pulse" /> Live
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="num font-semibold text-foreground">{headSymbol}</span>
            <span>·</span>
            <span className={cn(
              "num font-semibold",
              best && best.confidence >= 75 ? "text-primary" : "text-accent",
            )}>{headConf}</span>
            <span>·</span>
            <span className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              headDir === "RISE" && "text-bull",
              headDir === "FALL" && "text-bear",
              headDir === "WAIT" && "text-muted-foreground",
            )}>
              {headDir === "RISE" ? <TrendingUp className="h-3 w-3" /> :
               headDir === "FALL" ? <TrendingDown className="h-3 w-3" /> :
               <Activity className="h-3 w-3" />} {headDir}
            </span>
          </div>
        </div>

        <ChevronDown className={cn(
          "h-4 w-4 flex-none text-muted-foreground transition-transform duration-300",
          open && "rotate-180",
        )} />
      </button>

      {/* EXPANDED CONTENT */}
      <div className={cn(
        "grid transition-all duration-500 ease-out",
        open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}>
        <div className="overflow-hidden">
          {/* AI summary card */}
          <div className={cn(
            "relative overflow-hidden rounded-2xl border p-4 transition-all",
            bestQualified
              ? "border-primary/40 bg-primary/8 shadow-[0_0_40px_-12px_oklch(0.82_0.15_85/0.5)]"
              : "border-border/60 bg-background/30",
          )}>
            {bestQualified && <div className="pointer-events-none absolute inset-0 shimmer-gold opacity-20" />}
            <div className="relative flex flex-wrap items-center gap-3">
              <div className={cn(
                "grid h-11 w-11 flex-none place-items-center rounded-xl",
                bestQualified ? "bg-gold-gradient text-primary-foreground" : "bg-muted/40 text-muted-foreground",
              )}>
                <Crosshair className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  {bestQualified ? "Strongest momentum" : "Searching markets…"}
                </div>
                <div className="mt-0.5 truncate text-base font-semibold">
                  {best ? best.name : "—"}
                </div>
                {best && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span><span className="text-[9px] uppercase tracking-wider">Conf </span><span className="num font-semibold text-primary">{best.confidence}%</span></span>
                    <span><span className="text-[9px] uppercase tracking-wider">Dir </span><span className={cn(
                      "font-semibold",
                      best.direction === "RISE" && "text-bull",
                      best.direction === "FALL" && "text-bear",
                    )}>{best.direction}</span></span>
                    <span><span className="text-[9px] uppercase tracking-wider">Quality </span><span className="num font-semibold text-accent">{entryGrade(best.entry)}</span></span>
                  </div>
                )}
              </div>
              {bestQualified && onSelectMarket && best && best.symbol !== activeSymbol && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectMarket(best.symbol); }}
                  className="group inline-flex flex-none items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[12px] font-semibold text-primary transition hover:bg-primary/20"
                >
                  <Zap className="h-3.5 w-3.5 group-hover:animate-pulse" />
                  Switch
                </button>
              )}
            </div>
          </div>

          {/* TOP 3 markets — clean compact rows */}
          <div className="mt-3 space-y-1.5">
            <div className="px-1 text-[10px] uppercase tracking-widest text-muted-foreground">Top 3 markets</div>
            {top3.map((s, i) => {
              const isActive = s.symbol === activeSymbol;
              const isBest = bestQualified && s.symbol === bestQualified.symbol;
              return (
                <div
                  key={s.symbol}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl border bg-background/40 px-3 py-2 transition-all",
                    isBest ? "border-primary/40" : "border-border/60",
                    isActive && "ring-1 ring-bull/40",
                  )}
                >
                  <span className={cn(
                    "grid h-7 w-7 flex-none place-items-center rounded-lg text-[10px] font-semibold",
                    i === 0 ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground",
                  )}>#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold">{s.short}</span>
                      {isActive && <span className="text-[9px] uppercase tracking-widest text-bull">trading</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>Mom <span className="num text-foreground">{Math.round(s.momentumAbs)}</span></span>
                      <span>·</span>
                      <span>Quality <span className="num text-accent">{entryGrade(s.entry)}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "num text-sm font-semibold",
                      s.confidence >= 75 ? "text-primary" : s.confidence >= 60 ? "text-accent" : "text-muted-foreground",
                    )}>{s.ready ? `${s.confidence}%` : "—"}</div>
                    {s.ready && (
                      s.direction === "RISE" ? <TrendingUp className="h-4 w-4 text-bull" /> :
                      s.direction === "FALL" ? <TrendingDown className="h-4 w-4 text-bear" /> :
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Updates every tick · momentum hunter
          </div>
        </div>
      </div>
    </div>
  );
}
