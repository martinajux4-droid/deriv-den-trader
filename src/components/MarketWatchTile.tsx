import { useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import { useTicks } from "@/hooks/use-ticks";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/utils";

export function MarketWatchTile({
  symbol,
  name,
  selected,
  onClick,
}: {
  symbol: string;
  name: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const ticks = useTicks(symbol, 50);
  const quotes = ticks.map((t) => t.quote);

  const stats = useMemo(() => {
    if (quotes.length < 2) return { last: 0, change: 0, pct: 0, vol: 0, ai: 0, dir: 0, buyP: 50 };
    const last = quotes[quotes.length - 1];
    const first = quotes[0];
    const change = last - first;
    const pct = (change / first) * 100;
    // volatility: stddev of pct returns
    const rets: number[] = [];
    for (let i = 1; i < quotes.length; i++) rets.push((quotes[i] - quotes[i - 1]) / quotes[i - 1]);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
    const vol = Math.min(100, Math.sqrt(variance) * 100000);
    // buy pressure: ratio of up ticks
    const ups = rets.filter((r) => r > 0).length;
    const buyP = Math.round((ups / rets.length) * 100);
    // AI confidence: combine trend strength + volatility consistency
    const trend = Math.abs(pct) * 4;
    const ai = Math.max(35, Math.min(98, Math.round(50 + trend - (vol > 60 ? 10 : 0))));
    return { last, change, pct, vol, ai, dir: Math.sign(change), buyP };
  }, [quotes]);

  const positive = stats.dir >= 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border bg-card/60 p-3 text-left transition-all",
        "hover:border-primary/40 hover:bg-card/90 hover:-translate-y-0.5",
        selected ? "border-primary/60 ring-1 ring-primary/30" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {name}
          </div>
          <div className="num mt-0.5 text-lg font-semibold leading-none">
            {stats.last ? stats.last.toFixed(4) : "—"}
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
            positive ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"
          )}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {stats.pct ? `${stats.pct >= 0 ? "+" : ""}${stats.pct.toFixed(3)}%` : "0.000%"}
        </div>
      </div>

      <div className="mt-2 h-10">
        <Sparkline values={quotes} color={positive ? "var(--color-bull)" : "var(--color-bear)"} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
        <div>
          <div className="text-[9px] uppercase opacity-70">Vol</div>
          <div className="num text-foreground/90">{stats.vol.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase opacity-70">Buy</div>
          <div className="num text-foreground/90">{stats.buyP}%</div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-0.5 text-[9px] uppercase opacity-70">
            <Sparkles className="h-2.5 w-2.5 text-primary" /> AI
          </div>
          <div className="num text-primary">{stats.ai}%</div>
        </div>
      </div>
    </button>
  );
}
