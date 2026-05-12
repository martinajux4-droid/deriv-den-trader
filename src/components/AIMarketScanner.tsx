import { useEffect, useMemo, useState } from "react";
import { Brain, Radar, Sparkles, TrendingUp, TrendingDown, Crosshair, Activity, Zap } from "lucide-react";
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
  symbol: string;
  name: string;
  short: string;
  ready: boolean;
  momentum: number;     // signed % change over window
  momentumAbs: number;  // 0-100
  volatility: number;   // 0-100
  buy: number;          // 0-100
  sell: number;         // 0-100
  trend: number;        // 0-100 (consistency)
  speed: number;        // 0-100
  entry: number;        // 0-100
  risk: number;         // 0-100
  confidence: number;   // 0-100
  direction: "RISE" | "FALL" | "WAIT";
  last: number;
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

  // step changes for buy/sell pressure & trend consistency
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

const SCAN_LINES = [
  (s: string) => `Scanning ${s}…`,
  (s: string) => `Reading order flow on ${s}`,
  (s: string) => `Comparing momentum vs ${s}`,
  (s: string) => `Measuring volatility on ${s}`,
  (s: string) => `Validating entry quality on ${s}`,
];

export function AIMarketScanner({
  activeSymbol,
  minConfidence = 70,
  onSelectMarket,
}: {
  activeSymbol?: string;
  minConfidence?: number;
  onSelectMarket?: (symbol: string) => void;
}) {
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [cursor, setCursor] = useState(0);
  const [tickerLine, setTickerLine] = useState("Initializing AI scanner…");

  // rotate which market the AI is "actively" focusing on
  useEffect(() => {
    const id = setInterval(() => setCursor((c) => (c + 1) % SCAN_SYMBOLS.length), 1100);
    return () => clearInterval(id);
  }, []);

  const focus = SCAN_SYMBOLS[cursor];
  const focusScore = scores[focus.symbol];

  // dynamic ticker text
  useEffect(() => {
    if (!focusScore?.ready) {
      setTickerLine(`Scanning ${focus.short}…`);
      return;
    }
    const lines: string[] = [];
    if (focusScore.confidence >= 75) lines.push(`High probability setup detected on ${focus.short}`);
    else if (focusScore.confidence >= 60) lines.push(`${focus.short} showing ${focusScore.direction === "RISE" ? "bullish" : "bearish"} pressure`);
    else if (focusScore.momentumAbs < 20) lines.push(`Momentum weak — skipping ${focus.short}`);
    else lines.push(SCAN_LINES[Math.floor(Math.random() * SCAN_LINES.length)](focus.short));
    setTickerLine(lines[0]);
  }, [cursor, focusScore?.ready, focusScore?.confidence, focusScore?.direction, focusScore?.momentumAbs, focus.short]);

  const ranked = useMemo(() => {
    return SCAN_SYMBOLS
      .map((m) => scores[m.symbol] ?? scoreSymbol(m, []))
      .sort((a, b) => b.confidence - a.confidence);
  }, [scores]);

  const best = ranked[0]?.ready ? ranked[0] : null;
  const bestQualified = best && best.confidence >= minConfidence ? best : null;

  return (
    <div className="card-premium relative overflow-hidden p-5 sm:p-6">
      {/* hidden tick subscribers */}
      <div className="hidden">
        {SCAN_SYMBOLS.map((m) => (
          <SymbolFeeder key={m.symbol} meta={m}
            onScore={(s) => setScores((cur) => ({ ...cur, [m.symbol]: s }))} />
        ))}
      </div>

      {/* ambient grid + sweep */}
      <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-[0.05] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black,transparent_80%)]" />
      <div className="scan-sweep opacity-25" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gold-gradient text-primary-foreground shadow-[0_0_30px_oklch(0.82_0.15_85/0.45)]">
            <Brain className="h-5 w-5" />
            <span className="absolute -inset-1 rounded-xl border border-primary/30 ai-ring-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">AI Market Scanner</div>
              <span className="inline-flex items-center gap-1 rounded-full border border-bull/40 bg-bull/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-bull">
                <span className="h-1 w-1 rounded-full bg-bull animate-pulse" /> Live
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Quant engine scanning {SCAN_SYMBOLS.length} markets · 1-tick analysis
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/8 px-3 py-1.5 text-[11px] text-accent backdrop-blur-sm">
          <Radar className="h-3.5 w-3.5 animate-pulse" />
          <span className="num truncate max-w-[260px]">{tickerLine}</span>
        </div>
      </div>

      {/* BEST MARKET banner */}
      <div className={cn(
        "relative mt-5 overflow-hidden rounded-2xl border p-4 transition-all",
        bestQualified
          ? "border-primary/40 bg-primary/8 shadow-[0_0_50px_-10px_oklch(0.82_0.15_85/0.5)]"
          : "border-border/60 bg-background/30",
      )}>
        {bestQualified && <div className="pointer-events-none absolute inset-0 shimmer-gold opacity-25" />}
        <div className="relative flex flex-wrap items-center gap-4">
          <div className={cn(
            "grid h-12 w-12 place-items-center rounded-xl",
            bestQualified ? "bg-gold-gradient text-primary-foreground" : "bg-muted/40 text-muted-foreground",
          )}>
            <Crosshair className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {bestQualified ? "Best market found" : "Searching best market…"}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xl font-semibold">
                {best ? best.name : "—"}
              </span>
              {best && (
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                  best.direction === "RISE" && "border-bull/40 bg-bull/10 text-bull",
                  best.direction === "FALL" && "border-bear/40 bg-bear/10 text-bear",
                  best.direction === "WAIT" && "border-border bg-muted/40 text-muted-foreground",
                )}>
                  {best.direction === "RISE" ? <TrendingUp className="h-3 w-3" /> : best.direction === "FALL" ? <TrendingDown className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                  {best.direction}
                </span>
              )}
            </div>
            {best && (
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-4">
                <Stat label="Confidence" value={`${best.confidence}%`} tone="primary" />
                <Stat label="Momentum" value={`${Math.round(best.momentumAbs)}%`} />
                <Stat label="Volatility" value={`${Math.round(best.volatility)}%`} />
                <Stat label="Entry quality" value={`${best.entry}%`} tone="accent" />
              </div>
            )}
          </div>
          {bestQualified && onSelectMarket && best && best.symbol !== activeSymbol && (
            <button
              onClick={() => onSelectMarket(best.symbol)}
              className="group inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[12px] font-semibold text-primary transition hover:bg-primary/20"
            >
              <Zap className="h-3.5 w-3.5 group-hover:animate-pulse" />
              Switch to {best.short}
            </button>
          )}
        </div>
      </div>

      {/* RANKED MARKETS */}
      <div className="relative mt-5 space-y-2">
        {ranked.map((s, i) => {
          const isFocus = s.symbol === focus.symbol;
          const isActive = s.symbol === activeSymbol;
          const isBest = bestQualified && s.symbol === bestQualified.symbol;
          return (
            <div
              key={s.symbol}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-background/40 px-3 py-2.5 transition-all",
                isFocus ? "border-accent/50 bg-accent/5 shadow-[0_0_20px_-6px_oklch(0.62_0.18_250/0.5)]" : "border-border/60",
                isActive && "ring-1 ring-bull/40",
                isBest && "border-primary/40",
              )}
            >
              {isFocus && <div className="scan-sweep opacity-20" />}
              <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "grid h-7 w-7 place-items-center rounded-lg text-[10px] font-semibold",
                    i === 0 ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground",
                  )}>#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold">{s.short}</span>
                      {isActive && <span className="text-[9px] uppercase tracking-widest text-bull">trading</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{s.name}</div>
                  </div>
                </div>

                {/* mini meters */}
                <div className="hidden min-w-0 items-center gap-3 sm:flex">
                  <Meter label="MOM" value={s.momentumAbs} tone={s.direction === "FALL" ? "bear" : "bull"} />
                  <Meter label="VOL" value={s.volatility} tone="accent" />
                  <PressureBar buy={s.buy} sell={s.sell} />
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[9px] uppercase text-muted-foreground">Conf</div>
                    <div className={cn(
                      "num text-sm font-semibold",
                      s.confidence >= 75 ? "text-primary" : s.confidence >= 60 ? "text-accent" : "text-muted-foreground",
                    )}>{s.ready ? `${s.confidence}%` : "—"}</div>
                  </div>
                  {s.ready && (
                    s.direction === "RISE" ? <TrendingUp className="h-4 w-4 text-bull" /> :
                    s.direction === "FALL" ? <TrendingDown className="h-4 w-4 text-bear" /> :
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative mt-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        Neural ranking updates every tick · momentum hunter
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "primary" | "accent" }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn(
        "num text-sm font-semibold",
        tone === "primary" && "text-primary",
        tone === "accent" && "text-accent",
        !tone && "text-foreground",
      )}>{value}</div>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: "bull" | "bear" | "accent" }) {
  const bg = tone === "bull" ? "bg-bull" : tone === "bear" ? "bg-bear" : "bg-accent";
  return (
    <div className="flex min-w-[90px] flex-1 items-center gap-2">
      <span className="text-[9px] uppercase text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background/60">
        <div className={cn("h-full transition-all duration-500", bg)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function PressureBar({ buy, sell }: { buy: number; sell: number }) {
  return (
    <div className="flex min-w-[110px] flex-1 items-center gap-2">
      <span className="text-[9px] uppercase text-bull">{buy}</span>
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-bear/40">
        <div className="bg-bull transition-all duration-500" style={{ width: `${buy}%` }} />
      </div>
      <span className="text-[9px] uppercase text-bear">{sell}</span>
    </div>
  );
}