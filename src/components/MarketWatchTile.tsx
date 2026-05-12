import { useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTicks } from "@/hooks/use-ticks";
import { analyze } from "@/lib/ai-analysis";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/utils";

export function MarketWatchTile({
  symbol, name, selected, onClick,
}: { symbol: string; name: string; selected?: boolean; onClick?: () => void; }) {
  const ticks = useTicks(symbol, 50);
  const quotes = useMemo(() => ticks.map((t) => t.quote), [ticks]);
  const a = useMemo(() => analyze(quotes), [quotes]);

  const last = quotes[quotes.length - 1] || 0;
  const first = quotes[0] || last;
  const pct = first ? ((last - first) / first) * 100 : 0;
  const positive = pct >= 0;

  const sigColor =
    a?.recommendation === "RISE" ? "text-bull bg-bull/15 border-bull/40" :
    a?.recommendation === "FALL" ? "text-bear bg-bear/15 border-bear/40" :
    "text-muted-foreground bg-muted/40 border-border";

  const sigIcon =
    a?.recommendation === "RISE" ? <TrendingUp className="h-3 w-3" /> :
    a?.recommendation === "FALL" ? <TrendingDown className="h-3 w-3" /> :
    <Minus className="h-3 w-3" />;

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
          <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{name}</div>
          <div className="num mt-0.5 text-lg font-semibold leading-none">
            {last ? last.toFixed(4) : "—"}
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
          positive ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"
        )}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {pct ? `${pct >= 0 ? "+" : ""}${pct.toFixed(3)}%` : "0.000%"}
        </div>
      </div>

      <div className="mt-2 h-10">
        <Sparkline values={quotes} color={positive ? "var(--color-bull)" : "var(--color-bear)"} />
      </div>

      {/* AI signal pill */}
      <div className="mt-2 flex items-center justify-between gap-1.5">
        <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", sigColor)}>
          {sigIcon}
          {a?.recommendation || "WAIT"}
        </span>
        <span className="num text-[10px] text-primary inline-flex items-center gap-0.5">
          <Sparkles className="h-2.5 w-2.5" /> {a?.confidence ?? 0}%
        </span>
      </div>

      {/* Buy/Sell pressure bar */}
      <div className="mt-2">
        <div className="flex h-1 overflow-hidden rounded-full bg-bear/30">
          <div className="bg-bull transition-all" style={{ width: `${a?.buyPressure ?? 50}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          <span>Vol {a?.volatility.toFixed(0) ?? 0}</span>
          <span>{a?.sentiment ?? "—"}</span>
        </div>
      </div>
    </button>
  );
}
