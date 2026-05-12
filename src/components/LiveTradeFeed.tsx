import { useEffect, useRef, useState } from "react";
import { BOT_EVT, type BotFeedEvent } from "@/hooks/use-bot-status";
import { Activity, TrendingUp, TrendingDown, Target, ShieldAlert, Sparkles, Brain, AlertTriangle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<BotFeedEvent["kind"], React.ComponentType<{ className?: string }>> = {
  scan: Brain,
  open: Activity,
  won: TrendingUp,
  lost: TrendingDown,
  tp: Target,
  sl: ShieldAlert,
  switch: RefreshCcw,
  info: Sparkles,
  warn: AlertTriangle,
};

const TONE: Record<BotFeedEvent["kind"], string> = {
  scan: "text-primary",
  open: "text-accent",
  won: "text-bull",
  lost: "text-bear",
  tp: "text-bull",
  sl: "text-bear",
  switch: "text-warning",
  info: "text-muted-foreground",
  warn: "text-warning",
};

export function LiveTradeFeed({ initial = [], max = 60, className }: { initial?: BotFeedEvent[]; max?: number; className?: string }) {
  const [events, setEvents] = useState<BotFeedEvent[]>(initial);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent<BotFeedEvent>).detail;
      setEvents((cur) => [detail, ...cur].slice(0, max));
    };
    window.addEventListener(BOT_EVT, onEvt as EventListener);
    return () => window.removeEventListener(BOT_EVT, onEvt as EventListener);
  }, [max]);

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 text-primary">
            <Activity className="h-3.5 w-3.5" />
          </span>
          <div>
            <div className="text-xs font-semibold tracking-wide">Live Trade Feed</div>
            <div className="text-[10px] text-muted-foreground">Real-time AI activity</div>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-bull">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bull shadow-[0_0_8px_oklch(0.74_0.18_150)]" />
          Live
        </span>
      </div>
      <div ref={ref} className="max-h-[420px] overflow-auto">
        {events.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-muted-foreground">
            Waiting for AI activity… start the bot to stream events.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {events.map((e) => {
              const Icon = ICONS[e.kind];
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
                  <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-background/60", TONE[e.kind])}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium">
                      <span className={TONE[e.kind]}>{labelOf(e.kind)}</span>
                      {e.symbol && <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">{e.symbol}</span>}
                      {e.contract && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">{e.contract}</span>}
                      {e.confidence != null && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">AI {e.confidence}%</span>}
                      {e.profit != null && (
                        <span className={cn("num ml-auto rounded px-1.5 py-0.5 text-[11px] font-semibold",
                          e.profit >= 0 ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear")}>
                          {e.profit >= 0 ? "+" : ""}{e.profit.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{e.message}</div>
                  </div>
                  <span className="num shrink-0 text-[10px] text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function labelOf(k: BotFeedEvent["kind"]) {
  switch (k) {
    case "scan": return "AI Scan";
    case "open": return "Trade Opened";
    case "won":  return "Trade Won";
    case "lost": return "Trade Lost";
    case "tp":   return "Take Profit";
    case "sl":   return "Stop Loss";
    case "switch": return "Strategy Switch";
    case "warn": return "Warning";
    default: return "Info";
  }
}