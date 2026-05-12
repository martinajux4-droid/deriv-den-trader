import { useEffect, useMemo, useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Minus, Activity, Flame, ShieldAlert, Zap } from "lucide-react";
import { useTicks } from "@/hooks/use-ticks";
import { analyze } from "@/lib/ai-analysis";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { cn } from "@/lib/utils";

/**
 * Luxury AI Market Meter — watch-inspired circular gauge.
 * Buy pressure (blue/bull) on the left, Sell pressure (red/bear) on the right,
 * animated needle, glow rings, and a live AI insight footer.
 */
export function MarketWatchTile({
  symbol, name, selected, onClick,
}: { symbol: string; name: string; selected?: boolean; onClick?: () => void; }) {
  const ticks = useTicks(symbol, 60);
  const quotes = useMemo(() => ticks.map((t) => t.quote), [ticks]);
  const a = useMemo(() => analyze(quotes), [quotes]);

  const buy = a?.buyPressure ?? 50;
  const sell = a?.sellPressure ?? 50;
  const conf = a?.confidence ?? 0;
  const vol = a?.volatility ?? 0;
  const entry = a?.entryScore ?? 0;
  const last = quotes[quotes.length - 1] || 0;
  const first = quotes[0] || last;
  const pct = first ? ((last - first) / first) * 100 : 0;

  const aBuy = useAnimatedNumber(buy, 700);
  const aSell = useAnimatedNumber(sell, 700);
  const aConf = useAnimatedNumber(conf, 700);
  const aEntry = useAnimatedNumber(entry, 700);
  const aPrice = useAnimatedNumber(last, 400);

  // Needle: -90deg (full sell) → +90deg (full buy). buy 50% = 0deg.
  const needle = ((buy - 50) / 50) * 90;
  const aNeedle = useAnimatedNumber(needle, 700);

  // Pulse on each new tick
  const [pulse, setPulse] = useState(0);
  useEffect(() => { setPulse((p) => p + 1); }, [last]);

  const dir = a?.recommendation || "WAIT";
  const dirCls =
    dir === "RISE" ? "from-sky-400/30 via-sky-500/10 to-transparent text-sky-300 border-sky-400/40" :
    dir === "FALL" ? "from-rose-500/30 via-rose-500/10 to-transparent text-rose-300 border-rose-400/40" :
    "from-zinc-400/20 via-zinc-500/5 to-transparent text-zinc-300 border-zinc-500/30";
  const dirIcon =
    dir === "RISE" ? <TrendingUp className="h-3 w-3" /> :
    dir === "FALL" ? <TrendingDown className="h-3 w-3" /> :
    <Minus className="h-3 w-3" />;

  const insight =
    !a ? "Calibrating market data…" :
    dir === "RISE" ? `Bullish momentum · AI ${conf}% on CALL entries.` :
    dir === "FALL" ? `Bearish flow dominant · AI ${conf}% on PUT entries.` :
    `Range conditions · awaiting breakout (RSI ${a.rsi.toFixed(0)}).`;

  const heat = vol > 70 ? "EXTREME" : vol > 45 ? "HIGH" : vol > 22 ? "MEDIUM" : "CALM";
  const heatCls = vol > 70 ? "text-rose-300 border-rose-400/40" :
                  vol > 45 ? "text-amber-300 border-amber-400/40" :
                  vol > 22 ? "text-sky-300 border-sky-400/40" :
                              "text-emerald-300 border-emerald-400/40";

  // SVG gauge geometry (semicircle, 180→0 deg from left to right)
  const R = 64;
  const CX = 80, CY = 84;
  const arc = (startDeg: number, endDeg: number) => {
    const toXY = (deg: number) => {
      const r = (Math.PI / 180) * deg;
      return [CX + R * Math.cos(r), CY - R * Math.sin(r)];
    };
    const [x1, y1] = toXY(startDeg);
    const [x2, y2] = toXY(endDeg);
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    const sweep = endDeg < startDeg ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };

  // Buy fills from 180° leftward to a fraction of the half. We render the full
  // semicircle as two halves: blue (left half 180→90) and red (right half 90→0),
  // each masked by buy/sell pressure.
  const buyDeg = 180 - (buy / 100) * 90;   // 180 (full empty) → 90 (full)
  const sellDeg = 0 + (sell / 100) * 90;   // 0  (full empty) → 90 (full)

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border bg-card/40 p-4 text-left transition-all",
        "backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/40",
        selected ? "border-primary/60 ring-1 ring-primary/30 shadow-[0_0_40px_oklch(0.82_0.15_85/0.18)]"
                 : "border-white/5 hover:shadow-[0_8px_32px_oklch(0_0_0/0.5)]"
      )}
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 0% 0%, oklch(0.62 0.18 250 / 0.08), transparent 55%)," +
          "radial-gradient(120% 80% at 100% 0%, oklch(0.65 0.22 25 / 0.08), transparent 55%)," +
          "linear-gradient(180deg, oklch(0.18 0.015 260 / 0.85), oklch(0.13 0.015 260 / 0.85))",
      }}
    >
      {/* Top metallic header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_oklch(0.74_0.18_150)]" />
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {name}
            </span>
          </div>
          <div className="num mt-1 text-base font-semibold leading-none text-foreground/95" key={pulse}>
            {aPrice ? aPrice.toFixed(4) : "—"}
          </div>
          <div className={cn("mt-0.5 num text-[10px]", pct >= 0 ? "text-bull" : "text-bear")}>
            {pct >= 0 ? "+" : ""}{pct.toFixed(3)}%
          </div>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-md border bg-gradient-to-b px-1.5 py-0.5 text-[9px] font-bold tracking-wider",
          dirCls
        )}>
          {dirIcon}{dir}
        </span>
      </div>

      {/* Watch-inspired gauge */}
      <div className="relative mx-auto mt-2 h-[110px] w-full max-w-[220px]">
        <svg viewBox="0 0 160 110" className="h-full w-full">
          <defs>
            <linearGradient id={`g-blue-${symbol}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(0.7 0.2 250)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="oklch(0.55 0.2 265)" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id={`g-red-${symbol}`} x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="oklch(0.7 0.22 25)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="oklch(0.55 0.2 15)" stopOpacity="0.7" />
            </linearGradient>
            <radialGradient id={`g-center-${symbol}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.32 0.04 260)" />
              <stop offset="100%" stopColor="oklch(0.14 0.015 260)" />
            </radialGradient>
            <filter id={`glow-${symbol}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Outer track */}
          <path d={arc(180, 0)} stroke="oklch(1 0 0 / 0.06)" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Tick marks */}
          {Array.from({ length: 21 }).map((_, i) => {
            const deg = 180 - i * 9;
            const r1 = (Math.PI / 180) * deg;
            const x1 = CX + (R + 6) * Math.cos(r1), y1 = CY - (R + 6) * Math.sin(r1);
            const x2 = CX + (R + (i % 5 === 0 ? 12 : 9)) * Math.cos(r1), y2 = CY - (R + (i % 5 === 0 ? 12 : 9)) * Math.sin(r1);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(1 0 0 / 0.18)" strokeWidth={i % 5 === 0 ? 1.2 : 0.6} />;
          })}

          {/* Buy arc (left half, 180 → 90) */}
          <path d={arc(180, buyDeg)} stroke={`url(#g-blue-${symbol})`} strokeWidth="10" fill="none" strokeLinecap="round" filter={`url(#glow-${symbol})`} />
          {/* Sell arc (right half, 0 → 90) */}
          <path d={arc(0, sellDeg)} stroke={`url(#g-red-${symbol})`} strokeWidth="10" fill="none" strokeLinecap="round" filter={`url(#glow-${symbol})`} />

          {/* Center disc */}
          <circle cx={CX} cy={CY} r="40" fill={`url(#g-center-${symbol})`} stroke="oklch(1 0 0 / 0.08)" />
          <circle cx={CX} cy={CY} r="40" fill="none" stroke="oklch(0.82 0.15 85 / 0.25)" strokeDasharray="2 4" className="origin-center animate-[spin_22s_linear_infinite]" style={{ transformOrigin: `${CX}px ${CY}px` }} />

          {/* Needle */}
          <g style={{ transform: `rotate(${-aNeedle}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: "transform 600ms cubic-bezier(.2,.7,.3,1)" }}>
            <line x1={CX} y1={CY} x2={CX} y2={CY - 54} stroke="oklch(0.92 0.05 85)" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx={CX} cy={CY - 54} r="2.2" fill="oklch(0.92 0.05 85)" />
          </g>
          <circle cx={CX} cy={CY} r="3.2" fill="oklch(0.86 0.14 90)" stroke="oklch(0.18 0.04 85)" strokeWidth="0.8" />

          {/* Center text */}
          <text x={CX} y={CY - 14} textAnchor="middle" fontSize="8" fill="oklch(0.7 0.02 260)" fontFamily="ui-monospace, monospace" letterSpacing="1.2">AI CONF</text>
          <text x={CX} y={CY - 2} textAnchor="middle" fontSize="14" fontWeight="700" fill="oklch(0.96 0.005 250)" fontFamily="ui-monospace, monospace">{aConf.toFixed(0)}%</text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize="7" fill="oklch(0.7 0.02 260)" fontFamily="ui-monospace, monospace" letterSpacing="1">ENTRY {aEntry.toFixed(0)}</text>
        </svg>

        {/* Floating particle (subtle) */}
        <span className="pointer-events-none absolute left-1/2 top-2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary/70 blur-[1px] animate-[pulse_2.5s_ease-in-out_infinite]" />
      </div>

      {/* Buy / Sell rails */}
      <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-lg border border-sky-400/15 bg-sky-500/5 p-1.5">
          <div className="flex items-center justify-between text-sky-300">
            <span className="inline-flex items-center gap-1 font-semibold tracking-wide"><TrendingUp className="h-3 w-3" />BUY</span>
            <span className="num font-bold">{aBuy.toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-sky-500/10">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500 shadow-[0_0_12px_oklch(0.62_0.2_250/0.7)] transition-all" style={{ width: `${buy}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-rose-400/15 bg-rose-500/5 p-1.5">
          <div className="flex items-center justify-between text-rose-300">
            <span className="num font-bold">{aSell.toFixed(0)}%</span>
            <span className="inline-flex items-center gap-1 font-semibold tracking-wide">SELL<TrendingDown className="h-3 w-3" /></span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-rose-500/10">
            <div className="ml-auto h-full rounded-full bg-gradient-to-l from-rose-400 to-rose-500 shadow-[0_0_12px_oklch(0.65_0.22_25/0.7)] transition-all" style={{ width: `${sell}%` }} />
          </div>
        </div>
      </div>

      {/* Stats chips */}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className={cn("inline-flex items-center gap-1 rounded-md border bg-black/20 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide", heatCls)}>
          <Flame className="h-2.5 w-2.5" />HEAT {heat}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-zinc-300">
          <Activity className="h-2.5 w-2.5" />VOL {vol.toFixed(0)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/5 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-amber-300">
          <Zap className="h-2.5 w-2.5" />TRD {a?.trendStrength.toFixed(0) ?? 0}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-fuchsia-400/30 bg-fuchsia-400/5 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-fuchsia-300">
          <ShieldAlert className="h-2.5 w-2.5" />REV {a?.reversalProb.toFixed(0) ?? 0}%
        </span>
      </div>

      {/* AI insight footer */}
      <div className="relative mt-2 overflow-hidden rounded-lg border border-white/5 bg-black/30 p-2">
        <div className="flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] text-primary/90">
          <Sparkles className="h-2.5 w-2.5" /> LIVE MARKET INSIGHT
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-foreground/85">{insight}</p>
        <span className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      {/* Selected highlight */}
      {selected && (
        <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-primary/40" />
      )}
    </button>
  );
}
