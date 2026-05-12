import { useEffect, useMemo, useRef, useState } from "react";
import { useTicks } from "@/hooks/use-ticks";
import { analyze } from "@/lib/ai-analysis";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

const COLOR = {
  under: "oklch(0.74 0.16 220)",   // electric cyan/blue
  underGlow: "oklch(0.74 0.16 220 / 0.45)",
  over:  "oklch(0.66 0.24 18)",    // neon red/magenta
  overGlow:  "oklch(0.66 0.24 18 / 0.45)",
  ai:    "oklch(0.86 0.14 90)",
  aiGlow:"oklch(0.86 0.14 90 / 0.55)",
};

type AIState = "SCANNING" | "ANALYZING" | "WAITING" | "ENTRY READY" | "EXECUTING";

function buildInsights(barrier: number, under: number, over: number, vol: number, accel: number): string[] {
  const dom = Math.abs(under - over);
  const out: string[] = [];
  out.push(under > over ? `UNDER ${barrier} dominance strengthening` : over > under ? `OVER ${barrier} dominance strengthening` : "Threshold equilibrium — neutral flow");
  if (dom > 22) out.push("Threshold breakout forming");
  else if (dom < 6) out.push("Digit compression detected");
  out.push(under > over ? "Momentum favoring low digits" : "Momentum favoring high digits");
  if (vol > 60) out.push("High-frequency imbalance detected");
  else out.push("Stable digit rhythm — clean signal");
  if (accel > 1.2) out.push("AI confidence rising");
  return out;
}

function useDigitFlow(symbol: string, barrier: number) {
  const ticks = useTicks(symbol, 120);
  const lastEpoch = ticks.length ? ticks[ticks.length - 1].epoch : 0;

  const colsEmaRef = useRef<number[]>(Array.from({ length: 10 }, () => 10));
  const underEmaRef = useRef(50);
  const accelRef = useRef(0);

  const [pulse, setPulse] = useState(0);
  useEffect(() => { if (lastEpoch) setPulse((p) => p + 1); }, [lastEpoch]);

  const quotes = ticks.map((t) => t.quote);
  const a = analyze(quotes);
  const digits = quotes.map((q) => Number(String(q.toFixed(5)).replace(".", "").slice(-1)));

  // Recency-weighted column percentages
  const cols = Array.from({ length: 10 }, () => 0);
  let wTotal = 0;
  for (let i = 0; i < digits.length; i++) {
    const w = Math.pow(0.96, digits.length - 1 - i);
    wTotal += w;
    cols[digits[i]] += w;
  }
  for (let i = 0; i < 10; i++) cols[i] = wTotal ? (cols[i] / wTotal) * 100 : 10;

  // EMA per column → smooth liquid motion
  const ALPHA = 0.3;
  for (let i = 0; i < 10; i++) {
    colsEmaRef.current[i] = colsEmaRef.current[i] * (1 - ALPHA) + cols[i] * ALPHA;
  }

  // Under/over weighted pressure
  let underW = 0, overW = 0;
  for (let i = 0; i < digits.length; i++) {
    const w = Math.pow(0.94, digits.length - 1 - i);
    if (digits[i] < barrier) underW += w;
    else if (digits[i] > barrier) overW += w;
  }
  const tot = Math.max(1e-6, underW + overW);
  const underRaw = (underW / tot) * 100;
  const prev = underEmaRef.current;
  underEmaRef.current = prev * 0.72 + underRaw * 0.28;

  const targetAccel = Math.min(2.5, Math.abs(underRaw - prev) / 8);
  accelRef.current = accelRef.current * 0.8 + targetAccel * 0.2;

  const under = underEmaRef.current;
  const over = 100 - under;
  const dom = Math.abs(under - over);
  const intensity = Math.max(
    0.2,
    Math.min(1, dom / 70 + (a?.volatility ?? 0) / 200 + accelRef.current / 4),
  );

  return {
    cols: colsEmaRef.current.slice(),
    digits: digits.slice(-14),
    under, over, intensity, accel: accelRef.current, pulse,
    analysis: a,
  };
}

export function OverUnderHistogram({ symbol, barrier = 5 }: { symbol: string; barrier?: number }) {
  const flow = useDigitFlow(symbol, barrier);
  const { cols, digits, under, over, intensity, accel, pulse, analysis: a } = flow;
  const vol = a?.volatility ?? 0;

  const underA = useAnimatedNumber(under, 380);
  const overA = useAnimatedNumber(over, 380);
  const dom = Math.abs(under - over);

  // AI state machine
  const ready = (a?.entryScore ?? 0) >= 65 && (a?.confidence ?? 0) >= 70 && dom > 12;
  const aiState: AIState = ready
    ? "ENTRY READY"
    : vol > 65
      ? "ANALYZING"
      : accel > 1.3
        ? "ANALYZING"
        : dom < 5
          ? "WAITING"
          : "SCANNING";
  const stateColor: Record<AIState, string> = {
    SCANNING: COLOR.under,
    ANALYZING: COLOR.ai,
    WAITING: "oklch(0.7 0.02 260)",
    "ENTRY READY": "oklch(0.74 0.18 150)",
    EXECUTING: COLOR.over,
  };

  // Insight rotation
  const insights = useMemo(
    () => buildInsights(barrier, under, over, vol, accel),
    [barrier, Math.round(under / 3), Math.round(vol / 8), Math.round(accel * 4), Math.round(over / 3)],
  );
  const [insightIdx, setInsightIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setInsightIdx((i) => (i + 1) % Math.max(1, insights.length)), 2800);
    return () => clearInterval(id);
  }, [insights.length]);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const particles = Array.from({ length: isMobile ? 6 : 12 });

  return (
    <div
      className="therm-stage relative w-full p-3 sm:p-5"
      style={{ ["--therm-glow" as any]: under >= over ? COLOR.underGlow : COLOR.overGlow }}
    >
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

      {/* Top row: AI status + last digits ticker */}
      <div className="relative mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden rounded-xl border border-white/5 bg-black/30 px-2 py-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Last</span>
          <div className="flex items-center gap-1">
            {digits.map((d, i) => {
              const isLast = i === digits.length - 1;
              const contributing = (under > over && d < barrier) || (over > under && d > barrier);
              const color = d < barrier ? COLOR.under : d > barrier ? COLOR.over : COLOR.ai;
              return (
                <span
                  key={`${i}-${d}-${pulse}`}
                  className={`num inline-block ${isLast ? "digit-pop text-base font-bold" : "text-xs font-semibold"} `}
                  style={{
                    color,
                    textShadow: contributing || isLast ? `0 0 8px ${color}` : undefined,
                    opacity: contributing || isLast ? 1 : 0.55,
                  }}
                >
                  {d}
                </span>
              );
            })}
          </div>
        </div>
        <div
          className="relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            borderColor: `${stateColor[aiState]}55`,
            background: `${stateColor[aiState]}1a`,
            color: stateColor[aiState],
            boxShadow: `0 0 16px -4px ${stateColor[aiState]}`,
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full" style={{ background: stateColor[aiState], opacity: 0.7 }} />
            <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: stateColor[aiState] }} />
          </span>
          {aiState}
        </div>
      </div>

      {/* Digit columns */}
      <div className="relative">
        <div className="flex h-[200px] items-end justify-between gap-1 sm:h-[220px] sm:gap-1.5">
          {cols.map((p, i) => {
            const isOver = i > barrier;
            const isUnder = i < barrier;
            const isThr = i === barrier;
            const colColor = isThr ? COLOR.ai : isUnder ? COLOR.under : COLOR.over;
            const colGlow  = isThr ? COLOR.aiGlow : isUnder ? COLOR.underGlow : COLOR.overGlow;
            // Contribution-aware glow strength
            const isDom = (isUnder && under > over) || (isOver && over > under);
            const opacityBoost = isDom ? 1 : 0.7;
            const fillH = Math.max(6, Math.min(100, p * 4)); // amplify probability for visual range
            return (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div className="num text-[10px] text-muted-foreground">{p.toFixed(0)}%</div>
                <div
                  key={`col-${i}-${pulse}`}
                  className="relative w-full overflow-hidden rounded-xl border border-white/10"
                  style={{
                    height: "150px",
                    background:
                      "linear-gradient(180deg, oklch(1 0 0 / 0.04), oklch(0 0 0 / 0.4)), oklch(0.1 0.02 260)",
                    boxShadow: `inset 0 0 ${14 + intensity * 14}px ${colGlow}, 0 0 ${10 + intensity * 14}px -10px ${colGlow}`,
                    transition: "box-shadow .4s ease",
                  }}
                >
                  {/* Threshold ring marker */}
                  {isThr && (
                    <div
                      className="pointer-events-none absolute inset-0 rounded-xl"
                      style={{
                        boxShadow: `inset 0 0 0 1px ${COLOR.ai}, inset 0 0 24px ${COLOR.aiGlow}`,
                        animation: "therm-pulse-soft 2.4s ease-in-out infinite",
                      }}
                    />
                  )}
                  {/* Liquid fill */}
                  <div
                    className="therm-liquid"
                    style={{
                      height: `${fillH}%`,
                      ["--liquid-color" as any]: colColor,
                      ["--therm-wave-dur" as any]: `${Math.max(1.6, 4.5 - intensity * 2.6)}s`,
                      transition: "height .55s cubic-bezier(.2,.7,.3,1)",
                      opacity: opacityBoost,
                    }}
                  >
                    <div className="fill" />
                  </div>
                  {/* Glass highlight */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(120deg, oklch(1 0 0 / 0.1) 0%, transparent 30%, transparent 70%, oklch(0 0 0 / 0.25) 100%)",
                    }}
                  />
                </div>
                <div
                  className={`num text-xs font-semibold ${isThr ? "" : "text-muted-foreground"}`}
                  style={isThr ? { color: COLOR.ai, textShadow: `0 0 10px ${COLOR.ai}` } : isDom ? { color: colColor } : undefined}
                >
                  {i}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Horizontal pressure meter UNDER ↔ OVER */}
      <div className="relative mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
          <span className="flex items-center gap-1.5" style={{ color: COLOR.under }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR.under, boxShadow: `0 0 8px ${COLOR.under}` }} />
            Under {barrier} <span className="num font-bold">{underA.toFixed(0)}%</span>
          </span>
          <span className="flex items-center gap-1.5" style={{ color: COLOR.over }}>
            <span className="num font-bold">{overA.toFixed(0)}%</span> Over {barrier}
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR.over, boxShadow: `0 0 8px ${COLOR.over}` }} />
          </span>
        </div>
        <div
          className="relative h-3 w-full overflow-hidden rounded-full border border-white/10"
          style={{
            background:
              "linear-gradient(180deg, oklch(1 0 0 / 0.04), oklch(0 0 0 / 0.4)), oklch(0.1 0.02 260)",
            boxShadow: `inset 0 0 ${10 + intensity * 12}px ${under >= over ? COLOR.underGlow : COLOR.overGlow}`,
          }}
        >
          {/* Under flows from left */}
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${underA}%`,
              background: `linear-gradient(90deg, ${COLOR.under}, color-mix(in oklab, ${COLOR.under} 70%, black))`,
              boxShadow: `0 0 ${10 + intensity * 12}px ${COLOR.underGlow}`,
              transition: "width .55s cubic-bezier(.2,.7,.3,1)",
            }}
          />
          {/* Over flows from right */}
          <div
            className="absolute inset-y-0 right-0"
            style={{
              width: `${overA}%`,
              background: `linear-gradient(270deg, ${COLOR.over}, color-mix(in oklab, ${COLOR.over} 70%, black))`,
              boxShadow: `0 0 ${10 + intensity * 12}px ${COLOR.overGlow}`,
              transition: "width .55s cubic-bezier(.2,.7,.3,1)",
            }}
          />
          {/* Center divider */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/30" />
        </div>
      </div>

      {/* AI insight strip */}
      <div className="relative mt-3 overflow-hidden rounded-xl border border-white/5 bg-black/30 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full" style={{ background: COLOR.ai, opacity: 0.6 }} />
            <span className="relative h-2 w-2 rounded-full" style={{ background: COLOR.ai }} />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLOR.ai }}>
            Live AI insight
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
            vol <span className="num text-foreground">{vol.toFixed(0)}%</span>
          </span>
        </div>
        <div className="relative mt-1 h-5 overflow-hidden">
          <div
            key={insightIdx}
            className="therm-text-cycle absolute inset-0 truncate text-sm font-medium"
            style={{ color: under >= over ? COLOR.under : COLOR.over }}
          >
            {insights[insightIdx]}
          </div>
        </div>
      </div>
    </div>
  );
}