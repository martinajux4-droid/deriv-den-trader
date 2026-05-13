import { useEffect, useMemo, useState } from "react";
import { useTicks } from "@/hooks/use-ticks";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { cn } from "@/lib/utils";

const WINDOWS = [50, 100, 200, 500, 1000] as const;
type Win = (typeof WINDOWS)[number];

const COLORS = {
  even: "oklch(0.72 0.16 215)", // cyan/blue
  odd:  "oklch(0.66 0.22 25)",  // red
  ai:   "oklch(0.86 0.14 90)",  // gold
};

function lastDigit(q: number) {
  return Number(String(q.toFixed(5)).replace(".", "").slice(-1));
}

export function EvenOddBoard({ symbol }: { symbol: string }) {
  const [win, setWin] = useState<Win>(100);
  const ticks = useTicks(symbol, win);

  const digits = useMemo(() => ticks.map((t) => lastDigit(t.quote)), [ticks]);
  const latest = ticks.length ? ticks[ticks.length - 1].quote : 0;
  const last = digits[digits.length - 1] ?? 0;

  const total = digits.length || 1;
  const evenCount = digits.filter((d) => d % 2 === 0).length;
  const evenPct = (evenCount / total) * 100;
  const oddPct = 100 - evenPct;

  const evenA = useAnimatedNumber(evenPct, 380);
  const oddA = useAnimatedNumber(oddPct, 380);
  const dominant: "EVEN" | "ODD" = evenPct >= oddPct ? "EVEN" : "ODD";
  const dominantColor = dominant === "EVEN" ? COLORS.even : COLORS.odd;

  // streak detection on dominant parity
  let streak = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    const isEven = digits[i] % 2 === 0;
    const want = dominant === "EVEN";
    if (isEven === want) streak++; else break;
  }

  // pulse on new tick
  const lastEpoch = ticks.length ? ticks[ticks.length - 1].epoch : 0;
  const [pulse, setPulse] = useState(0);
  useEffect(() => { if (lastEpoch) setPulse((p) => p + 1); }, [lastEpoch]);

  const recent = digits.slice(-Math.min(80, digits.length));

  return (
    <div className="space-y-3">
      {/* Top: window selector + dominant chip */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWin(w)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition",
                win === w
                  ? "bg-white/10 text-foreground shadow-[0_0_12px_oklch(0.86_0.14_90/0.35)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: `${COLORS.even}22`, color: COLORS.even, border: `1px solid ${COLORS.even}55` }}
          >
            Even {evenA.toFixed(2)}%
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: `${COLORS.odd}22`, color: COLORS.odd, border: `1px solid ${COLORS.odd}55` }}
          >
            Odd {oddA.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Digit history strip — like Hifex's E/O grid */}
      <div className="rounded-xl border border-white/10 bg-black/40 p-2">
        <div className="grid auto-cols-min grid-flow-col gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recent.map((d, i) => {
            const isEven = d % 2 === 0;
            const isLast = i === recent.length - 1;
            const c = isEven ? COLORS.even : COLORS.odd;
            return (
              <div
                key={`${i}-${pulse % 2}-${d}`}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-md border text-[10px] font-bold num transition",
                  isLast && "scale-110 animate-pulse",
                )}
                style={{
                  background: `${c}1a`,
                  borderColor: `${c}55`,
                  color: c,
                  boxShadow: isLast ? `0 0 12px ${c}` : undefined,
                }}
                title={isEven ? "EVEN" : "ODD"}
              >
                {isEven ? "E" : "O"}
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">Last {recent.length} digits</span>
          <span className="num">
            Last digit:{" "}
            <span className="font-bold" style={{ color: dominantColor }}>
              {last}
            </span>
          </span>
        </div>
      </div>

      {/* Latest price */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Latest Price</span>
        <span key={latest} className="num text-base font-semibold tabular-nums" style={{ color: COLORS.ai, textShadow: `0 0 10px ${COLORS.ai}55` }}>
          {latest ? latest.toFixed(3) : "--"}
        </span>
      </div>

      {/* Dual percentage bars */}
      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Percentage</span>
          <span>
            Sample: <span className="num text-foreground">{total}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 items-end gap-3 h-[150px] sm:h-[180px]">
          <Column label="EVEN" pct={evenA} color={COLORS.even} dominant={dominant === "EVEN"} />
          <Column label="ODD"  pct={oddA}  color={COLORS.odd}  dominant={dominant === "ODD"} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-center text-[11px] text-muted-foreground">
          <div>Even <span className="num font-semibold" style={{ color: COLORS.even }}>{evenA.toFixed(2)}%</span></div>
          <div>Odd  <span className="num font-semibold" style={{ color: COLORS.odd }}>{oddA.toFixed(2)}%</span></div>
        </div>
      </div>

      {/* AI signal strip */}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full" style={{ background: dominantColor, opacity: 0.6 }} />
          <span className="relative h-2 w-2 rounded-full" style={{ background: dominantColor }} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: dominantColor }}>
          {dominant} bias
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Streak <span className="num font-semibold text-foreground">{streak}</span> · Edge{" "}
          <span className="num font-semibold text-foreground">{Math.abs(evenPct - oddPct).toFixed(2)}%</span>
        </span>
      </div>
    </div>
  );
}

function Column({ label, pct, color, dominant }: { label: string; pct: number; color: string; dominant: boolean }) {
  const h = Math.max(4, Math.min(100, pct));
  return (
    <div className="flex h-full flex-col items-center justify-end">
      <div className="num text-xs font-semibold mb-1" style={{ color }}>
        {pct.toFixed(2)}%
      </div>
      <div
        className="w-full rounded-t-md transition-all duration-500"
        style={{
          height: `${h}%`,
          background: `linear-gradient(180deg, ${color}, ${color}55)`,
          boxShadow: dominant ? `0 0 18px ${color}, inset 0 0 14px ${color}88` : `inset 0 0 8px ${color}55`,
          borderTop: `1px solid ${color}`,
        }}
      />
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
