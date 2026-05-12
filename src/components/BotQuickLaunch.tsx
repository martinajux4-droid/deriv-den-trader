import { Link } from "@tanstack/react-router";
import { Bot, Play, Settings2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBotStatus } from "@/hooks/use-bot-status";
import { cn } from "@/lib/utils";

export function BotQuickLaunch() {
  const status = useBotStatus();
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-4">
      <div
        className={cn(
          "absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl",
          status.running ? "bg-bull/20" : "bg-primary/15"
        )}
      />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "grid h-9 w-9 place-items-center rounded-lg",
              status.running ? "bg-bull/20 text-bull" : "bg-primary/15 text-primary"
            )}>
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">AI Bot Control</div>
              <div className="text-[11px] text-muted-foreground">
                {status.running ? "Live execution active" : "Idle · ready to deploy"}
              </div>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
              status.running ? "bg-bull/15 text-bull" : "bg-muted text-muted-foreground"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", status.running ? "bg-bull animate-pulse" : "bg-muted-foreground")} />
            {status.running ? "RUNNING" : "STOPPED"}
          </span>
        </div>

        {status.running ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Strategy" value={status.strategy?.replace(/_/g, " ") || "—"} />
            <Mini label="Symbol" value={status.symbol || "—"} />
            <Mini label="P&L" value={
              status.pnl != null ? `${status.pnl >= 0 ? "+" : ""}${status.pnl.toFixed(2)}` : "—"
            } tone={status.pnl != null && status.pnl >= 0 ? "bull" : "bear"} />
          </div>
        ) : (
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" /> 7 strategies · martingale · TP/SL</li>
            <li className="flex items-center gap-2"><Settings2 className="h-3 w-3 text-accent" /> Risk caps + max trades</li>
          </ul>
        )}

        <Button asChild size="sm" className="mt-4 w-full bg-gold-gradient text-primary-foreground hover:opacity-90">
          <Link to="/bot">
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {status.running ? "Open bot console" : "Configure & start"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-2">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className={cn("num mt-1 truncate text-sm font-semibold",
        tone === "bull" && "bull", tone === "bear" && "bear")}>{value}</div>
    </div>
  );
}
