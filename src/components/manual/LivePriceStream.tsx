import { useTicks } from "@/hooks/use-ticks";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

export function LivePriceStream({ symbol, name }: { symbol: string; name: string }) {
  const ticks = useTicks(symbol, 30);
  const last = ticks[ticks.length - 1]?.quote ?? 0;
  const prev = ticks[ticks.length - 2]?.quote ?? last;
  const up = last >= prev;
  const animated = useAnimatedNumber(last, 350);

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{name}</div>
        <div className={`num text-3xl md:text-4xl font-bold tracking-tight transition-colors ${up ? "text-[var(--meter-bull)]" : "text-[var(--meter-bear)]"}`}
             style={{ textShadow: `0 0 24px ${up ? "oklch(0.7 0.18 250 / 0.5)" : "oklch(0.65 0.22 25 / 0.5)"}` }}>
          {animated.toFixed(3)}
        </div>
      </div>
      <div className="flex h-10 items-end gap-0.5">
        {ticks.slice(-24).map((t, i, arr) => {
          const p = arr[i - 1]?.quote ?? t.quote;
          const u = t.quote >= p;
          return <div key={t.epoch + "" + i} className="w-1 rounded-sm" style={{ height: `${20 + (i / arr.length) * 80}%`, background: u ? "var(--meter-bull)" : "var(--meter-bear)", opacity: 0.6 + (i / arr.length) * 0.4 }} />;
        })}
      </div>
    </div>
  );
}