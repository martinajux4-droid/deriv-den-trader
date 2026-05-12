import { useTicks } from "@/hooks/use-ticks";

export function OverUnderHistogram({ symbol, barrier = 5 }: { symbol: string; barrier?: number }) {
  const ticks = useTicks(symbol, 120);
  const digits = ticks.map((t) => Number(String(t.quote.toFixed(5)).replace(".", "").slice(-1)));
  const counts = Array.from({ length: 10 }, (_, i) => digits.filter((d) => d === i).length);
  const max = Math.max(1, ...counts);
  const total = Math.max(1, digits.length);
  const over = digits.filter((d) => d > barrier).length / total * 100;
  const under = 100 - over;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-[170px] items-end justify-between gap-1">
        {counts.map((c, i) => {
          const isOver = i > barrier;
          const h = (c / max) * 100;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="text-[10px] num text-muted-foreground">{c}</div>
              <div className="relative w-full overflow-hidden rounded-t-md bg-white/[0.03]" style={{ height: "120px" }}>
                <div className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                     style={{
                       height: `${h}%`,
                       background: isOver ? "linear-gradient(180deg, var(--meter-bull), oklch(0.55 0.2 265))" : "linear-gradient(180deg, var(--meter-bear), oklch(0.55 0.2 15))",
                       boxShadow: `0 0 12px ${isOver ? "var(--meter-bull)" : "var(--meter-bear)"}`,
                     }} />
              </div>
              <div className={`text-xs num font-semibold ${i === barrier ? "text-[var(--meter-ai)]" : "text-muted-foreground"}`}>{i}</div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--meter-bull)]/30 bg-[var(--meter-bull)]/10 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Over {barrier}</div>
          <div className="num text-xl font-bold text-[var(--meter-bull)]">{over.toFixed(0)}%</div>
        </div>
        <div className="rounded-xl border border-[var(--meter-bear)]/30 bg-[var(--meter-bear)]/10 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Under {barrier}</div>
          <div className="num text-xl font-bold text-[var(--meter-bear)]">{under.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}