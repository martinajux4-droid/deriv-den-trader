import { useEffect, useMemo, useState } from "react";
import { useTicks } from "@/hooks/use-ticks";
import { analyze, digitStats } from "@/lib/ai-analysis";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

type Mode = "even-odd" | "rise-fall";

type Side = {
  label: string;
  value: number;          // 0..100
  color: string;          // oklch
  glow: string;           // oklch with alpha
};

const COLORS = {
  even:  "oklch(0.7 0.18 250)",   // electric blue
  odd:   "oklch(0.65 0.22 25)",   // neon red
  rise:  "oklch(0.74 0.18 150)",  // emerald
  fall:  "oklch(0.62 0.23 22)",   // deep red
  ai:    "oklch(0.86 0.14 90)",   // gold
};

function buildInsights(mode: Mode, left: number, right: number, vol: number, trend: string): string[] {
  const dom = Math.abs(left - right);
  const out: string[] = [];
  if (mode === "even-odd") {
    out.push(left > right ? "Even parity dominance detected" : right > left ? "Odd parity dominance detected" : "Parity equilibrium — neutral flow");
    if (dom > 18) out.push("Strong digit imbalance — bias forming");
    else if (dom < 6) out.push("Digit balance tight — wait for break");
    if (vol > 65) out.push("Volatility spike incoming");
    else out.push("Stable tick rhythm — clean signal");
  } else {
    out.push(left > right ? "Momentum shifting bullish" : right > left ? "Bearish pressure building" : "Trend flat — directional pause");
    out.push(trend === "UP" ? "Uptrend intact — buyers in control" : trend === "DOWN" ? "Downtrend intact — sellers in control" : "Range-bound — awaiting breakout");
    if (dom > 20) out.push("Conviction high — AI confidence rising");
    if (vol > 65) out.push("Volatility expansion detected");
  }
  return out;
}

export function MarketThermometer({ mode, symbol }: { mode: Mode; symbol: string }) {
  const ticks = useTicks(symbol, 80);
  const quotes = ticks.map((t) => t.quote);
  const a = analyze(quotes);

  let left: Side, right: Side;
  let lastDigit = 0;
  if (mode === "even-odd") {
    const s = quotes.length ? digitStats(quotes) : { even: 50, odd: 50, lastDigit: 0, over5: 50, under5: 50 };
    lastDigit = s.lastDigit;
    left  = { label: "EVEN", value: s.even, color: COLORS.even, glow: "oklch(0.7 0.18 250 / 0.45)" };
    right = { label: "ODD",  value: s.odd,  color: COLORS.odd,  glow: "oklch(0.65 0.22 25 / 0.45)" };
  } else {
    const buy  = a?.buyPressure  ?? 50;
    const sell = a?.sellPressure ?? 50;
    left  = { label: "RISE", value: buy,  color: COLORS.rise, glow: "oklch(0.74 0.18 150 / 0.45)" };
    right = { label: "FALL", value: sell, color: COLORS.fall, glow: "oklch(0.62 0.23 22 / 0.45)" };
  }

  const lA = useAnimatedNumber(left.value);
  const rA = useAnimatedNumber(right.value);
  const dom = Math.abs(left.value - right.value);
  const dominant = left.value >= right.value ? left : right;
  const vol = a?.volatility ?? 0;
  const trend = a?.trendDir ?? "FLAT";

  // Center balance ring: 50% = balanced, dominant side fills more
  const total = Math.max(1, lA + rA);
  const leftPct = (lA / total) * 100;
  const r = 78;
  const c = 2 * Math.PI * r;
  const leftLen = (leftPct / 100) * c;

  // Cycle insights
  const insights = useMemo(() => buildInsights(mode, left.value, right.value, vol, trend), [mode, Math.round(left.value / 4), Math.round(right.value / 4), Math.round(vol / 10), trend]);
  const [insightIdx, setInsightIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setInsightIdx((i) => (i + 1) % Math.max(1, insights.length)), 4500);
    return () => clearInterval(id);
  }, [insights.length]);

  const tickMarks = Array.from({ length: 60 });
  const particles = Array.from({ length: 14 });
  const bubblesL = Array.from({ length: 4 });
  const bubblesR = Array.from({ length: 4 });

  return (
    <div
      className="therm-stage relative w-full p-4 sm:p-6"
      style={{ ["--therm-glow" as any]: dominant.glow }}
    >
      {/* Ambient layers */}
      <div className="therm-radar" />
      <div className="therm-scan" />
      {particles.map((_, i) => (
        <span
          key={i}
          className="therm-particle"
          style={{
            left: `${(i * 53) % 95 + 2}%`,
            bottom: `${(i * 17) % 30}%`,
            animationDuration: `${8 + (i % 5) * 1.4}s`,
            animationDelay: `${(i * 0.6) % 6}s`,
            opacity: 0.5,
          }}
        />
      ))}

      {/* Layout: left bar | center ring | right bar */}
      <div className="relative grid grid-cols-[64px_1fr_64px] items-stretch gap-3 sm:grid-cols-[80px_1fr_80px] sm:gap-5">
        {/* LEFT liquid pressure bar */}
        <LiquidBar side={left} animated={lA} bubbles={bubblesL} intensity={intensity} pulse={pulse} />

        {/* CENTER reactor */}
        <div className="relative mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center">
          {/* Outer rotating ticks */}
          <svg viewBox="0 0 200 200" className="therm-ring-rotate absolute inset-0 h-full w-full opacity-60">
            {tickMarks.map((_, i) => {
              const angle = (i / tickMarks.length) * 360;
              const long = i % 5 === 0;
              return (
                <line
                  key={i}
                  x1="100" y1={long ? 6 : 10}
                  x2="100" y2={long ? 16 : 14}
                  stroke="oklch(1 0 0 / 0.35)"
                  strokeWidth={long ? 1.2 : 0.6}
                  transform={`rotate(${angle} 100 100)`}
                />
              );
            })}
          </svg>
          {/* Counter-rotating subtle ring */}
          <svg viewBox="0 0 200 200" className="therm-ring-rotate-rev absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] opacity-40">
            <circle cx="100" cy="100" r="92" fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="0.5" strokeDasharray="2 6" />
          </svg>
          {/* Glow halo */}
          <div
            className="therm-pulse absolute inset-6 rounded-full"
            style={{
              background: `radial-gradient(circle, ${dominant.glow} 0%, transparent 70%)`,
              filter: "blur(14px)",
            }}
          />
          {/* Balance ring */}
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="100" cy="100" r={r} stroke="oklch(1 0 0 / 0.06)" strokeWidth="10" fill="none" />
            <circle
              cx="100" cy="100" r={r}
              stroke={left.color} strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={`${leftLen} ${c}`}
              style={{ filter: `drop-shadow(0 0 10px ${left.color})`, transition: "stroke-dasharray .6s ease" }}
            />
            <circle
              cx="100" cy="100" r={r}
              stroke={right.color} strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={`${c - leftLen} ${c}`} strokeDashoffset={-leftLen}
              style={{ filter: `drop-shadow(0 0 10px ${right.color})`, transition: "stroke-dasharray .6s ease, stroke-dashoffset .6s ease" }}
            />
          </svg>
          {/* Inner glass dome */}
          <div
            className="absolute inset-[18%] rounded-full border border-white/10"
            style={{
              background:
                "radial-gradient(circle at 30% 25%, oklch(1 0 0 / 0.12), transparent 55%), radial-gradient(circle at 70% 80%, oklch(0 0 0 / 0.5), transparent 60%), oklch(0.12 0.02 260 / 0.8)",
              backdropFilter: "blur(8px)",
              boxShadow: `inset 0 0 40px ${dominant.glow}, inset 0 1px 0 oklch(1 0 0 / 0.1)`,
            }}
          />
          {/* Center readout */}
          <div className="relative z-10 text-center">
            {mode === "even-odd" ? (
              <>
                <div className="text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Last digit</div>
                <div key={lastDigit} className="digit-pop num text-6xl font-bold" style={{ color: COLORS.ai, textShadow: `0 0 20px ${COLORS.ai}` }}>
                  {lastDigit}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: dominant.color }}>
                  {dominant.label} +{dom.toFixed(0)}%
                </div>
              </>
            ) : (
              <>
                <div className="text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Dominance</div>
                <div className="num text-5xl font-bold" style={{ color: dominant.color, textShadow: `0 0 20px ${dominant.glow}` }}>
                  {dom.toFixed(0)}<span className="text-2xl opacity-70">%</span>
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: dominant.color }}>
                  {dominant.label} pressure
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT liquid pressure bar */}
        <LiquidBar side={right} animated={rA} bubbles={bubblesR} intensity={intensity} pulse={pulse} />
      </div>

      {/* Side labels + percentages */}
      <div className="relative mt-4 grid grid-cols-2 gap-3 text-xs sm:gap-6">
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: left.color, boxShadow: `0 0 8px ${left.color}` }} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{left.label}</span>
          </div>
          <span className="num text-base font-semibold" style={{ color: left.color }}>{lA.toFixed(0)}%</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: right.color, boxShadow: `0 0 8px ${right.color}` }} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{right.label}</span>
          </div>
          <span className="num text-base font-semibold" style={{ color: right.color }}>{rA.toFixed(0)}%</span>
        </div>
      </div>

      {/* AI insight strip */}
      <div className="relative mt-4 overflow-hidden rounded-xl border border-white/5 bg-black/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full" style={{ background: COLORS.ai, opacity: 0.6 }} />
            <span className="relative h-2 w-2 rounded-full" style={{ background: COLORS.ai }} />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.ai }}>
            Live market insight
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
            vol <span className="num text-foreground">{vol.toFixed(0)}%</span>
          </span>
        </div>
        <div className="relative mt-1 h-5 overflow-hidden">
          <div
            key={insightIdx}
            className="therm-text-cycle absolute inset-0 truncate text-sm font-medium"
            style={{ color: dominant.color }}
          >
            {insights[insightIdx]}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiquidBar({
  side, animated, bubbles, intensity, pulse,
}: { side: Side; animated: number; bubbles: unknown[]; intensity: number; pulse: number }) {
  const h = Math.max(4, Math.min(100, animated));
  const waveDur = `${Math.max(1.6, 4.5 - intensity * 2.6)}s`;
  const bubbleDurBase = Math.max(2.2, 3.5 - intensity * 1.6);
  return (
    <div className="relative flex flex-col items-center">
      <div
        key={`bar-${pulse}`}
        className="relative h-[260px] w-full overflow-hidden rounded-2xl border border-white/10 sm:h-[300px]"
        style={{
          background:
            "linear-gradient(180deg, oklch(1 0 0 / 0.04), oklch(0 0 0 / 0.4)), oklch(0.1 0.02 260)",
          boxShadow: `inset 0 0 ${24 + intensity * 18}px ${side.glow}, 0 0 ${24 + intensity * 22}px -10px ${side.glow}`,
          transition: "box-shadow .4s ease",
        }}
      >
        {/* tick scale */}
        <div className="pointer-events-none absolute inset-y-2 left-1 flex flex-col justify-between opacity-40">
          {Array.from({ length: 11 }).map((_, i) => (
            <span key={i} className="block h-px w-2 bg-white/40" />
          ))}
        </div>
        {/* liquid */}
        <div
          className="therm-liquid"
          style={{
            height: `${h}%`,
            ["--liquid-color" as any]: side.color,
            transition: "height .55s cubic-bezier(.2,.7,.3,1)",
            ["--therm-wave-dur" as any]: waveDur,
          }}
        >
          <div className="fill" />
          {bubbles.map((_, i) => (
            <span
              key={i}
              className="therm-bubble"
              style={{
                left: `${20 + i * 18}%`,
                animationDelay: `${i * 0.6}s`,
                animationDuration: `${bubbleDurBase + i * 0.5}s`,
              }}
            />
          ))}
        </div>
        {/* glass highlight */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, oklch(1 0 0 / 0.12) 0%, transparent 30%, transparent 70%, oklch(0 0 0 / 0.25) 100%)",
          }}
        />
        {/* value chip */}
        <div
          className="absolute left-1/2 top-2 -translate-x-1/2 rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 text-[10px] num font-semibold backdrop-blur"
          style={{ color: side.color, textShadow: `0 0 8px ${side.glow}` }}
        >
          {animated.toFixed(0)}%
        </div>
      </div>
      <div
        className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: side.color, textShadow: `0 0 10px ${side.glow}` }}
      >
        {side.label}
      </div>
    </div>
  );
}