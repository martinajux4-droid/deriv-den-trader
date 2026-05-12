import { useTicks } from "@/hooks/use-ticks";
import { digitStats } from "@/lib/ai-analysis";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

export function EvenOddDial({ symbol }: { symbol: string }) {
  const ticks = useTicks(symbol, 80);
  const quotes = ticks.map((t) => t.quote);
  const stats = quotes.length ? digitStats(quotes) : { even: 50, odd: 50, lastDigit: 0, over5: 50, under5: 50 };
  const evenA = useAnimatedNumber(stats.even);
  const r = 70;
  const c = 2 * Math.PI * r;
  const evenLen = (evenA / 100) * c;
  const lastDigits = quotes.slice(-12).map((q) => Number(String(q.toFixed(5)).replace(".", "").slice(-1)));

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[180px] w-[180px]">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={r} stroke="oklch(1 0 0 / 0.06)" strokeWidth="14" fill="none" />
          <circle cx="90" cy="90" r={r} stroke="var(--meter-bull)" strokeWidth="14" fill="none"
                  strokeDasharray={`${evenLen} ${c}`} strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 8px var(--meter-bull))" }} />
          <circle cx="90" cy="90" r={r} stroke="var(--meter-bear)" strokeWidth="14" fill="none"
                  strokeDasharray={`${c - evenLen} ${c}`} strokeDashoffset={-evenLen} strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 8px var(--meter-bear))" }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Last digit</div>
            <div key={stats.lastDigit} className="digit-pop text-5xl font-bold text-shimmer-gold num">{stats.lastDigit}</div>
          </div>
        </div>
      </div>
      <div className="flex w-full items-center justify-between text-xs">
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--meter-bull)]" /><span className="text-muted-foreground">Even</span><span className="num font-semibold">{stats.even}%</span></div>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--meter-bear)]" /><span className="text-muted-foreground">Odd</span><span className="num font-semibold">{stats.odd}%</span></div>
      </div>
      <div className="flex w-full justify-center gap-1 overflow-hidden">
        {lastDigits.map((d, i) => (
          <div key={i} className={`grid h-7 w-7 place-items-center rounded-md text-xs num font-semibold ${d % 2 === 0 ? "bg-[var(--meter-bull)]/20 text-[var(--meter-bull)]" : "bg-[var(--meter-bear)]/20 text-[var(--meter-bear)]"}`}>{d}</div>
        ))}
      </div>
    </div>
  );
}