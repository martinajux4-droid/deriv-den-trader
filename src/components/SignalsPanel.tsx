import { useMemo } from "react";
import { Sparkles, ArrowUp, ArrowDown, Brain } from "lucide-react";
import { useTicks } from "@/hooks/use-ticks";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SIGNAL_SYMBOLS = [
  { symbol: "R_75", name: "Volatility 75" },
  { symbol: "R_100", name: "Volatility 100" },
  { symbol: "R_50", name: "Volatility 50" },
  { symbol: "BOOM1000", name: "Boom 1000" },
  { symbol: "CRASH1000", name: "Crash 1000" },
];

function SignalRow({ symbol, name }: { symbol: string; name: string }) {
  const ticks = useTicks(symbol, 30);

  const sig = useMemo(() => {
    if (ticks.length < 6) return null;
    const q = ticks.map((t) => t.quote);
    const last = q[q.length - 1];
    const prev = q[q.length - 6];
    const momentum = ((last - prev) / prev) * 100;
    const dir = momentum >= 0 ? "RISE" : "FALL";
    const conf = Math.max(55, Math.min(97, Math.round(60 + Math.abs(momentum) * 60)));
    const risk = Math.max(15, Math.min(80, 100 - conf + 10));
    const win = Math.max(50, Math.min(95, conf - 5));
    return { dir, conf, risk, win, momentum, last };
  }, [ticks]);

  if (!sig) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
        <div className="text-sm text-muted-foreground">Analyzing {name}…</div>
      </div>
    );
  }
  const up = sig.dir === "RISE";
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition hover:border-primary/40 hover:bg-card/70">
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
          up ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"
        )}
      >
        {up ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{name}</span>
          <Badge variant="outline" className={cn("text-[10px]", up ? "border-bull/40 text-bull" : "border-bear/40 text-bear")}>
            {sig.dir}
          </Badge>
        </div>
        <div className="num text-[11px] text-muted-foreground">
          Entry {sig.last.toFixed(4)} · Mom {sig.momentum >= 0 ? "+" : ""}{sig.momentum.toFixed(3)}%
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <div className="text-[10px] uppercase text-muted-foreground">Confidence</div>
        <div className="num text-sm font-semibold text-primary">{sig.conf}%</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase text-muted-foreground">Win prob</div>
        <div className="num text-sm font-semibold text-foreground">{sig.win}%</div>
      </div>
    </div>
  );
}

export function SignalsPanel() {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">AI Signals</div>
            <div className="text-[11px] text-muted-foreground">Live momentum scanner · updates each tick</div>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Sparkles className="h-3 w-3 text-primary" /> Live
        </Badge>
      </div>
      <div className="space-y-2">
        {SIGNAL_SYMBOLS.map((s) => <SignalRow key={s.symbol} {...s} />)}
      </div>
    </div>
  );
}
