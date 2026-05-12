import { Bot, TrendingUp, TrendingDown, Activity, Brain, Flame, Pause } from "lucide-react";
import { useBotStatus } from "@/hooks/use-bot-status";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { cn } from "@/lib/utils";

export function LiveAIStatus() {
  const bot = useBotStatus();
  if (!bot.running) return null;

  const pnl = bot.pnl ?? 0;
  const animPnl = useAnimatedNumber(pnl, 500);
  const wins = bot.wins ?? 0;
  const trades = bot.trades ?? 0;
  const winRate = trades ? Math.round((wins / trades) * 100) : 0;
  const roi = bot.baseEquity && bot.baseEquity > 0 ? (pnl / bot.baseEquity) * 100 : 0;
  const positive = pnl >= 0;
  const cur = bot.currency || "USD";
  const tp = bot.takeProfit ?? 0;
  const sl = bot.stopLoss ?? 0;
  const tpProgress = tp > 0 ? Math.max(0, Math.min(100, (pnl / tp) * 100)) : 0;
  const slProgress = sl > 0 && pnl < 0 ? Math.max(0, Math.min(100, (-pnl / sl) * 100)) : 0;

  return (
    <section className="card-premium relative overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-[0.04]" />
      <div className="relative flex flex-wrap items-center gap-3">
        <div className={cn(
          "grid h-10 w-10 place-items-center rounded-xl",
          positive ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"
        )}>
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest",
              bot.paused
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-bull/40 bg-bull/10 text-bull"
            )}>
              <span className={cn("h-1 w-1 rounded-full bg-current", !bot.paused && "animate-pulse")} />
              {bot.paused ? "Paused" : "Live AI"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {bot.accountType || "Demo"} · analyzing <span className="text-foreground">{bot.symbol}</span>
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Live status</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Live P&amp;L</div>
          <div className={cn("num text-2xl font-bold tabular-nums sm:text-3xl",
            positive ? "text-bull" : "text-bear")}>
            {positive ? "+" : ""}{animPnl.toFixed(2)} <span className="text-xs opacity-70">{cur}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
            {positive ? <TrendingUp className="h-3 w-3 text-bull" /> : <TrendingDown className="h-3 w-3 text-bear" />}
            <span className="num">ROI {roi >= 0 ? "+" : ""}{roi.toFixed(2)}%</span>
            {bot.bestStreak ? (
              <><span>·</span><Flame className="h-3 w-3 text-warning" /><span className="num">{bot.bestStreak}</span></>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Active trades" value={`${bot.activeTrades ?? 0}`} icon={<Activity className="h-3.5 w-3.5" />} />
        <Tile label="Win rate" value={`${winRate}%`} sub={`${wins}/${trades}`} tone={winRate >= 60 ? "bull" : "neutral"} />
        <Tile
          label="AI confidence"
          value={`${bot.confidence ?? 0}%`}
          icon={<Brain className="h-3.5 w-3.5" />}
          tone="primary"
          bar={bot.confidence ?? 0}
        />
        <Tile
          label="Direction"
          value={bot.direction || "WAIT"}
          tone={bot.direction === "RISE" ? "bull" : bot.direction === "FALL" ? "bear" : "neutral"}
          icon={
            bot.direction === "RISE" ? <TrendingUp className="h-3.5 w-3.5" /> :
            bot.direction === "FALL" ? <TrendingDown className="h-3.5 w-3.5" /> :
            <Pause className="h-3.5 w-3.5" />
          }
        />
      </div>

      {(tp > 0 || sl > 0) && (
        <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
          {tp > 0 && (
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Take profit progress</span>
                <span className="num text-bull">+{tp.toFixed(2)} {cur}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
                <div className="h-full bg-bull transition-all duration-500" style={{ width: `${tpProgress}%` }} />
              </div>
              <div className="mt-1 text-right text-[10px] num text-muted-foreground">{tpProgress.toFixed(0)}%</div>
            </div>
          )}
          {sl > 0 && (
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Stop loss buffer</span>
                <span className="num text-bear">−{sl.toFixed(2)} {cur}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
                <div className="h-full bg-bear transition-all duration-500" style={{ width: `${slProgress}%` }} />
              </div>
              <div className="mt-1 text-right text-[10px] num text-muted-foreground">{slProgress.toFixed(0)}%</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Tile({ label, value, sub, icon, tone = "neutral", bar }: {
  label: string; value: string; sub?: string; icon?: React.ReactNode;
  tone?: "bull" | "bear" | "primary" | "neutral"; bar?: number;
}) {
  const toneText =
    tone === "bull" ? "text-bull" :
    tone === "bear" ? "text-bear" :
    tone === "primary" ? "text-primary" : "text-foreground";
  const barBg = tone === "primary" ? "bg-gold-gradient" : tone === "bull" ? "bg-bull" : tone === "bear" ? "bg-bear" : "bg-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className={cn("num mt-1 text-xl font-semibold", toneText)}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      {bar != null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-background/60">
          <div className={cn("h-full transition-all duration-500", barBg)} style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
    </div>
  );
}