import { useTicks } from "@/hooks/use-ticks";
import { analyze } from "@/lib/ai-analysis";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

export function RiseFallPressure({ symbol }: { symbol: string }) {
  const ticks = useTicks(symbol, 80);
  const a = analyze(ticks.map((t) => t.quote));
  const buy = a?.buyPressure ?? 50;
  const sell = a?.sellPressure ?? 50;
  const buyA = useAnimatedNumber(buy);
  const sellA = useAnimatedNumber(sell);
  const dir = buy >= sell ? "BULL" : "BEAR";
  const dom = Math.abs(buy - sell);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[170px] w-full overflow-hidden rounded-xl border border-white/5 bg-black/30">
        {/* wave bars */}
        <div className="absolute inset-0 flex items-end gap-1 px-2 pb-2">
          {ticks.slice(-32).map((t, i, arr) => {
            const prev = arr[i - 1]?.quote ?? t.quote;
            const up = t.quote >= prev;
            const h = 30 + (i / arr.length) * 60 + (up ? 10 : -10);
            return (
              <div key={t.epoch + "-" + i} className="wave-bar flex-1 rounded-t"
                   style={{ height: `${Math.max(8, Math.min(100, h))}%`, background: up ? "var(--meter-bull)" : "var(--meter-bear)", animationDelay: `${i * 30}ms`, opacity: 0.7 }} />
            );
          })}
        </div>
        <div className="absolute inset-x-0 top-2 flex items-center justify-between px-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Momentum wave</span>
          <span className={`text-xs font-bold ${dir === "BULL" ? "text-[var(--meter-bull)]" : "text-[var(--meter-bear)]"}`}>{dir}</span>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Bull pressure</span><span className="num text-foreground">{buyA.toFixed(0)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full transition-all duration-500" style={{ width: `${buyA}%`, background: "linear-gradient(90deg, var(--meter-bull), oklch(0.55 0.2 265))", boxShadow: "0 0 12px var(--meter-bull)" }} />
        </div>
        <div className="mb-1.5 mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Bear pressure</span><span className="num text-foreground">{sellA.toFixed(0)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full transition-all duration-500" style={{ width: `${sellA}%`, background: "linear-gradient(90deg, var(--meter-bear), oklch(0.55 0.2 15))", boxShadow: "0 0 12px var(--meter-bear)" }} />
        </div>
      </div>
      <div className="rounded-xl border border-[var(--meter-ai)]/30 bg-[var(--meter-ai)]/5 px-3 py-2 text-center">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Dominance</div>
        <div className="num text-xl font-bold text-[var(--meter-ai)]">{dom.toFixed(0)}%</div>
      </div>
    </div>
  );
}