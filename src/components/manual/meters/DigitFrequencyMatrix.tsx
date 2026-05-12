import { useTicks } from "@/hooks/use-ticks";

export function DigitFrequencyMatrix({ symbol, target = 0 }: { symbol: string; target?: number }) {
  const ticks = useTicks(symbol, 150);
  const digits = ticks.map((t) => Number(String(t.quote.toFixed(5)).replace(".", "").slice(-1)));
  const counts = Array.from({ length: 10 }, (_, i) => digits.filter((d) => d === i).length);
  const total = Math.max(1, digits.length);
  const probs = counts.map((c) => (c / total) * 100);
  const targetProb = probs[target] ?? 0;
  const diffProb = 100 - targetProb;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-2">
        {probs.map((p, i) => {
          const isTarget = i === target;
          const intensity = Math.min(1, p / Math.max(...probs, 1));
          return (
            <div key={i} className={`relative overflow-hidden rounded-xl border p-3 transition-all ${isTarget ? "border-[var(--meter-ai)]/60" : "border-white/5"}`}
                 style={{ background: `oklch(0.7 0.18 250 / ${intensity * 0.18})` }}>
              <div className={`text-2xl font-bold num text-center ${isTarget ? "text-[var(--meter-ai)]" : "text-foreground/80"}`}>{i}</div>
              <div className="text-[10px] num text-center text-muted-foreground">{p.toFixed(1)}%</div>
              {isTarget && <div className="absolute inset-0 ring-1 ring-[var(--meter-ai)]/40 rounded-xl pointer-events-none animate-pulse" />}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--meter-ai)]/30 bg-[var(--meter-ai)]/10 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Matches {target}</div>
          <div className="num text-xl font-bold text-[var(--meter-ai)]">{targetProb.toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border border-[var(--meter-bull)]/30 bg-[var(--meter-bull)]/10 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Differs</div>
          <div className="num text-xl font-bold text-[var(--meter-bull)]">{diffProb.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}