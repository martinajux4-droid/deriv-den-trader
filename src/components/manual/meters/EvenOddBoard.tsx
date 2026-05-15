import { useEffect, useMemo, useRef, useState } from "react";
import { useTicks } from "@/hooks/use-ticks";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { cn } from "@/lib/utils";
import { Activity, Brain, Sparkles, TrendingUp } from "lucide-react";

const WINDOWS = [50, 100, 200, 500, 1000] as const;
type Win = (typeof WINDOWS)[number];

// Hifex-like neon green theme
const C = {
  even: "oklch(0.78 0.2 145)",      // neon green
  evenSoft: "oklch(0.78 0.2 145 / 0.18)",
  odd:  "oklch(0.32 0.02 240)",     // dark slate
  oddBorder: "oklch(0.55 0.04 240)",
  ai:   "oklch(0.86 0.14 90)",      // gold
};

function lastDigit(q: number) {
  return Number(String(q.toFixed(5)).replace(".", "").slice(-1));
}

export function EvenOddBoard({ symbol }: { symbol: string }) {
  const [win, setWin] = useState<Win>(100);
  const ticks = useTicks(symbol, win);

  const digits = useMemo(() => ticks.map((t) => lastDigit(t.quote)), [ticks]);
  const latest = ticks.length ? ticks[ticks.length - 1].quote : 0;
  const prevPrice = ticks.length > 1 ? ticks[ticks.length - 2].quote : latest;
  const priceUp = latest >= prevPrice;
  const animatedPrice = useAnimatedNumber(latest, 320);
  const last = digits[digits.length - 1] ?? 0;

  const total = digits.length || 1;
  const evenCount = digits.filter((d) => d % 2 === 0).length;
  const evenPct = (evenCount / total) * 100;
  const oddPct = 100 - evenPct;

  const evenA = useAnimatedNumber(evenPct, 380);
  const oddA = useAnimatedNumber(oddPct, 380);
  const dominant: "EVEN" | "ODD" = evenPct >= oddPct ? "EVEN" : "ODD";
  const edge = Math.abs(evenPct - oddPct);

  // streak
  let streak = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    const isEven = digits[i] % 2 === 0;
    const want = dominant === "EVEN";
    if (isEven === want) streak++; else break;
  }

  // confidence: blend of edge + streak (0..100)
  const confidence = Math.min(99, Math.round(50 + edge * 1.6 + Math.min(streak, 8) * 2.5));
  const confA = useAnimatedNumber(confidence, 420);

  // pulse + auto-scroll for new tick
  const lastEpoch = ticks.length ? ticks[ticks.length - 1].epoch : 0;
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current; if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [lastEpoch]);

  const recent = digits.slice(-Math.min(80, digits.length));

  return (
    <div className="space-y-3">
      {/* Window selector + dominant chips */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWin(w)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition",
                win === w
                  ? "bg-[oklch(0.78_0.2_145/0.18)] text-[oklch(0.92_0.18_145)] shadow-[0_0_14px_oklch(0.78_0.2_145/0.5)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider num"
            style={{ background: C.evenSoft, color: C.even, border: `1px solid ${C.even}` }}
          >
            E {evenA.toFixed(1)}%
          </span>
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider num"
            style={{ background: "oklch(1 0 0 / 0.04)", borderColor: C.oddBorder, color: "oklch(0.85 0.02 240)" }}
          >
            O {oddA.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Live price block — big, glowy */}
      <div
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-black/70 to-black/40 px-4 py-3"
        style={{
          borderColor: "oklch(0.78 0.2 145 / 0.3)",
          boxShadow: "0 0 30px -10px oklch(0.78 0.2 145 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.05)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(80% 60% at 0% 50%, oklch(0.78 0.2 145 / 0.18), transparent 60%)",
          }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full" style={{ background: C.even, opacity: 0.7 }} />
              <span className="relative h-2 w-2 rounded-full" style={{ background: C.even }} />
            </span>
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Live · {symbol}</div>
              <div className="text-[10px] text-muted-foreground">Last digit <span className="num font-bold" style={{ color: dominant === "EVEN" ? C.even : "oklch(0.85 0.02 240)" }}>{last}</span></div>
            </div>
          </div>
          <div className="text-right">
            <div
              key={lastEpoch}
              className="num text-2xl font-bold tabular-nums leading-none"
              style={{
                color: priceUp ? C.even : "oklch(0.7 0.18 25)",
                textShadow: `0 0 18px ${priceUp ? "oklch(0.78 0.2 145 / 0.6)" : "oklch(0.65 0.22 25 / 0.55)"}`,
              }}
            >
              {animatedPrice ? animatedPrice.toFixed(3) : "--"}
            </div>
            <div className={cn("text-[10px] font-semibold num", priceUp ? "text-bull" : "text-bear")}>
              {priceUp ? "▲ up" : "▼ down"}
            </div>
          </div>
        </div>
      </div>

      {/* Digit history — circles */}
      <div className="rounded-2xl border border-white/10 bg-black/50 p-2.5 backdrop-blur">
        <div ref={stripRef} className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recent.map((d, i) => {
            const isEven = d % 2 === 0;
            const isLast = i === recent.length - 1;
            return (
              <div
                key={`${i}-${d}`}
                className={cn(
                  "grid h-7 w-7 flex-none place-items-center rounded-full border text-[10px] font-bold num transition",
                  isLast && "scale-110",
                )}
                style={
                  isEven
                    ? {
                        background: `radial-gradient(circle at 30% 30%, ${C.even}, oklch(0.5 0.18 145))`,
                        borderColor: C.even,
                        color: "oklch(0.12 0.04 145)",
                        boxShadow: isLast
                          ? `0 0 14px ${C.even}, inset 0 0 6px oklch(1 0 0 / 0.3)`
                          : `0 0 6px ${C.even}66`,
                      }
                    : {
                        background: "radial-gradient(circle at 30% 30%, oklch(0.42 0.03 240), oklch(0.18 0.02 240))",
                        borderColor: C.oddBorder,
                        color: "oklch(0.92 0.02 240)",
                        boxShadow: isLast ? "0 0 12px oklch(0.7 0.04 240 / 0.6)" : "none",
                      }
                }
                title={isEven ? `EVEN · ${d}` : `ODD · ${d}`}
              >
                {d}
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">Last {recent.length} digits</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.even, boxShadow: `0 0 6px ${C.even}` }} /> Even
            <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.04_240)]" /> Odd
          </span>
        </div>
      </div>

      {/* Dual percentage chart */}
      <div className="rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Distribution</span>
          <span>Sample <span className="num text-foreground">{total}</span></span>
        </div>
        <div className="grid grid-cols-2 items-end gap-3 h-[140px] sm:h-[170px]">
          <Column label="EVEN" pct={evenA} kind="even" dominant={dominant === "EVEN"} />
          <Column label="ODD"  pct={oddA}  kind="odd"  dominant={dominant === "ODD"} />
        </div>
      </div>

      {/* Summary / AI prediction bar */}
      <div
        className="relative overflow-hidden rounded-2xl border p-3"
        style={{
          borderColor: dominant === "EVEN" ? "oklch(0.78 0.2 145 / 0.4)" : C.oddBorder,
          background:
            dominant === "EVEN"
              ? "linear-gradient(135deg, oklch(0.18 0.08 145 / 0.6), oklch(0.08 0.02 240 / 0.7))"
              : "linear-gradient(135deg, oklch(0.18 0.02 240 / 0.7), oklch(0.08 0.02 240 / 0.7))",
          boxShadow:
            dominant === "EVEN"
              ? "0 0 28px -10px oklch(0.78 0.2 145 / 0.5)"
              : "0 0 22px -12px oklch(0.5 0.04 240 / 0.6)",
        }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<Sparkles className="h-3 w-3" />} label="Even %" value={`${evenA.toFixed(1)}%`} color={C.even} />
          <Stat icon={<Sparkles className="h-3 w-3" />} label="Odd %" value={`${oddA.toFixed(1)}%`} color="oklch(0.85 0.02 240)" />
          <Stat
            icon={<Brain className="h-3 w-3" />}
            label="AI Predict"
            value={dominant}
            color={dominant === "EVEN" ? C.even : "oklch(0.85 0.02 240)"}
            pulse
          />
          <Stat
            icon={<TrendingUp className="h-3 w-3" />}
            label="Confidence"
            value={`${Math.round(confA)}%`}
            color={confidence >= 70 ? C.even : confidence >= 60 ? C.ai : "oklch(0.7 0.18 25)"}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">Streak <span className="num font-semibold text-foreground">{streak}</span></span>
          <span className="uppercase tracking-wider">Edge <span className="num font-semibold text-foreground">{edge.toFixed(2)}%</span></span>
        </div>
      </div>
    </div>
  );
}

function Column({ label, pct, kind, dominant }: { label: string; pct: number; kind: "even" | "odd"; dominant: boolean }) {
  const h = Math.max(4, Math.min(100, pct));
  const isEven = kind === "even";
  const color = isEven ? C.even : "oklch(0.85 0.02 240)";
  const fill = isEven
    ? `linear-gradient(180deg, ${C.even}, oklch(0.45 0.18 145))`
    : `linear-gradient(180deg, oklch(0.55 0.04 240), oklch(0.22 0.02 240))`;
  return (
    <div className="flex h-full flex-col items-center justify-end">
      <div className="num text-xs font-semibold mb-1" style={{ color }}>
        {pct.toFixed(2)}%
      </div>
      <div
        className="w-full rounded-t-lg transition-all duration-500"
        style={{
          height: `${h}%`,
          background: fill,
          boxShadow: dominant
            ? `0 0 22px ${isEven ? C.even : "oklch(0.6 0.04 240)"}, inset 0 0 16px oklch(1 0 0 / 0.18)`
            : `inset 0 0 8px oklch(0 0 0 / 0.4)`,
          borderTop: `1px solid ${isEven ? C.even : C.oddBorder}`,
        }}
      />
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
        {label}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color, pulse }: { icon: React.ReactNode; label: string; value: string; color: string; pulse?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className={cn("num mt-0.5 text-sm font-bold tabular-nums", pulse && "animate-pulse")} style={{ color, textShadow: `0 0 10px ${color}55` }}>
        {value}
      </div>
    </div>
  );
}
