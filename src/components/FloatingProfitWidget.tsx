import { useEffect, useState } from "react";
import { Bot, TrendingUp, TrendingDown, Minimize2, Maximize2, X, Activity, Brain, Flame } from "lucide-react";
import { useBotStatus } from "@/hooks/use-bot-status";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { cn } from "@/lib/utils";

export function FloatingProfitWidget() {
  const bot = useBotStatus();
  const [hidden, setHidden] = useState(false);
  const [min, setMin] = useState(false);
  const pnl = bot.pnl ?? 0;
  const animPnl = useAnimatedNumber(pnl, 500);
  const wins = bot.wins ?? 0;
  const trades = bot.trades ?? 0;
  const winRate = trades ? Math.round((wins / trades) * 100) : 0;
  const roi = bot.baseEquity && bot.baseEquity > 0 ? (pnl / bot.baseEquity) * 100 : 0;
  const positive = pnl >= 0;
  const cur = bot.currency || "USD";

  // Auto-show when bot starts
  useEffect(() => { if (bot.running) setHidden(false); }, [bot.running]);

  if (!bot.running || hidden) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-40 flex flex-col items-start gap-2">
      <div
        className={cn(
          "pointer-events-auto profit-pop overflow-hidden rounded-2xl border bg-card/95 backdrop-blur-xl",
          "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]",
          positive ? "border-bull/40 glow-bull" : "border-bear/40 glow-bear",
          min ? "w-[220px]" : "w-[300px]"
        )}
      >
        {/* Header */}
        <div className={cn(
          "relative flex items-center gap-2 px-3 py-2 text-primary-foreground",
          positive ? "bg-bull-gradient" : "bg-bear-gradient",
        )}>
          <span className="absolute inset-0 shimmer-gold opacity-60" />
          <div className="relative grid h-6 w-6 place-items-center rounded-md bg-white/20">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div className="relative leading-tight">
            <div className="text-[10px] uppercase tracking-wider opacity-90">
              {bot.paused ? "Bot paused" : "AI Bot live"} · {bot.accountType || "Demo"}
            </div>
            <div className="text-[11px] font-semibold">{bot.symbol}</div>
          </div>
          <div className="relative ml-auto flex items-center gap-1">
            <button onClick={() => setMin((v) => !v)} className="rounded p-1 hover:bg-white/20">
              {min ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </button>
            <button onClick={() => setHidden(true)} className="rounded p-1 hover:bg-white/20">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-2 px-3 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Live P&L</div>
            <div className={cn("num text-2xl font-bold tabular-nums", positive ? "text-bull" : "text-bear")}>
              {positive ? "+" : ""}{animPnl.toFixed(2)} <span className="text-xs opacity-70">{cur}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {positive ? <TrendingUp className="h-3 w-3 text-bull" /> : <TrendingDown className="h-3 w-3 text-bear" />}
              <span className="num">ROI {roi >= 0 ? "+" : ""}{roi.toFixed(2)}%</span>
              {bot.bestStreak ? (
                <>
                  <span>·</span>
                  <Flame className="h-3 w-3 text-warning" />
                  <span className="num">streak {bot.bestStreak}</span>
                </>
              ) : null}
            </div>
          </div>

          {!min && (
            <>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <Stat label="Trades" value={`${trades}`} />
                <Stat label="Win" value={`${winRate}%`} tone={winRate >= 60 ? "bull" : "default"} />
                <Stat label="Active" value={`${bot.activeTrades ?? 0}`} />
              </div>

              {/* AI bar */}
              <div className="rounded-lg border border-border/60 bg-background/40 p-2">
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase text-muted-foreground">
                  <span className="flex items-center gap-1"><Brain className="h-3 w-3 text-primary" /> AI Confidence</span>
                  <span className="num text-foreground">{bot.confidence ?? 0}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
                  <div className="h-full bg-gold-gradient transition-all" style={{ width: `${bot.confidence ?? 0}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Direction</span>
                  <span className={cn("flex items-center gap-1 font-semibold",
                    bot.direction === "RISE" && "text-bull",
                    bot.direction === "FALL" && "text-bear",
                    (!bot.direction || bot.direction === "WAIT") && "text-muted-foreground")}>
                    {bot.direction === "RISE" && <TrendingUp className="h-3 w-3" />}
                    {bot.direction === "FALL" && <TrendingDown className="h-3 w-3" />}
                    {(!bot.direction || bot.direction === "WAIT") && <Activity className="h-3 w-3" />}
                    {bot.direction || "WAIT"}
                  </span>
                </div>
              </div>

              {/* TP/SL targets */}
              {(bot.takeProfit || bot.stopLoss) ? (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>TP <span className="num text-bull">+{(bot.takeProfit ?? 0).toFixed(2)}</span></span>
                  <div className="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-background/60">
                    {(() => {
                      const tp = bot.takeProfit ?? 0;
                      const sl = bot.stopLoss ?? 0;
                      // map pnl from -sl..+tp into 0..100
                      const p = Math.max(0, Math.min(100, ((pnl + sl) / Math.max(0.01, tp + sl)) * 100));
                      return <div className={cn("h-full", positive ? "bg-bull" : "bg-bear")} style={{ width: `${p}%` }} />;
                    })()}
                  </div>
                  <span>SL <span className="num text-bear">-{(bot.stopLoss ?? 0).toFixed(2)}</span></span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" | "default" }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-center">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className={cn("num text-sm font-semibold",
        tone === "bull" && "text-bull", tone === "bear" && "text-bear")}>{value}</div>
    </div>
  );
}