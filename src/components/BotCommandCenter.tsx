import { useEffect, useState } from "react";
import { Brain, TrendingUp, TrendingDown, Activity, Gauge, Pause, Play, Square, Zap, Sparkles, Target, Shield } from "lucide-react";
import type { Analysis } from "@/lib/ai-analysis";
import type { BotState } from "@/lib/bot-engine";
import { Button } from "@/components/ui/button";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { cn } from "@/lib/utils";

type Props = {
  running: boolean;
  paused: boolean;
  state: BotState;
  stateDetail?: string;
  symbol: string;
  strategyLabel: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  activeTrades: number;
  currency: string;
  analysis: Analysis | null;
  canStart: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onEmergency: () => void;
};

const STATE_LABEL: Record<BotState, string> = {
  idle: "Idle",
  scanning: "Scanning markets",
  waiting_entry: "Waiting for entry",
  executing: "Executing trade",
  managing: "Managing position",
  paused: "Paused",
  risk_lock: "Risk lock · cooling down",
  stopped: "Stopped",
};

export function BotCommandCenter(p: Props) {
  const animatedPnl = useAnimatedNumber(p.pnl);
  const animatedConf = useAnimatedNumber(p.analysis?.confidence ?? 0);
  const winRate = p.trades > 0 ? Math.round((p.wins / p.trades) * 100) : 0;
  const tone = p.pnl > 0 ? "bull" : p.pnl < 0 ? "bear" : "neutral";

  // High-confidence signal pulse
  const highSignal = !!(p.running && p.analysis && p.analysis.confidence >= 75 && p.analysis.recommendation !== "WAIT");
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!highSignal) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1800);
    return () => clearTimeout(t);
  }, [highSignal, p.analysis?.recommendation, p.analysis?.confidence]);

  return (
    <div className={cn(
      "card-premium card-premium-hero relative overflow-hidden p-6 sm:p-8",
      flash && "signal-flash"
    )}>
      {/* ambient grid */}
      <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-[0.06] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black,transparent_80%)]" />
      {p.running && <div className="scan-sweep opacity-30" />}

      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        {/* LEFT: status + pnl */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest",
              !p.running && "border-border/60 bg-muted/40 text-muted-foreground",
              p.running && !p.paused && "border-bull/40 bg-bull/10 text-bull",
              p.paused && "border-warning/40 bg-warning/10 text-warning",
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full bg-current", p.running && !p.paused && "animate-pulse")} />
              {p.running ? (p.paused ? "Paused" : "Live") : "Standby"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {STATE_LABEL[p.state]}{p.stateDetail ? ` · ${p.stateDetail}` : ""}
            </span>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Live profit</div>
            <div className={cn(
              "num mt-1 text-5xl font-semibold tracking-tight sm:text-6xl",
              tone === "bull" && "text-bull",
              tone === "bear" && "text-bear",
              tone === "neutral" && "text-foreground",
            )}>
              {animatedPnl >= 0 ? "+" : ""}{animatedPnl.toFixed(2)} <span className="text-base text-muted-foreground">{p.currency}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{p.strategyLabel} · {p.symbol}</span>
              <span>·</span>
              <span>{p.trades} trades</span>
              <span>·</span>
              <span className="text-bull">{p.wins}W</span>
              <span className="text-bear">{p.losses}L</span>
              {p.trades > 0 && <><span>·</span><span>{winRate}% win</span></>}
              {p.activeTrades > 0 && <><span>·</span><span className="text-accent">{p.activeTrades} open</span></>}
            </div>
          </div>
        </div>

        {/* RIGHT: launch / control */}
        <div className="flex flex-col items-stretch gap-2 lg:min-w-[280px]">
          {!p.running ? (
            <>
              <Button
                onClick={p.onStart}
                disabled={!p.canStart}
                size="lg"
                className="h-16 w-full bg-gold-gradient text-primary-foreground text-base font-semibold shadow-[0_10px_40px_-10px_oklch(0.82_0.15_85/0.6)] hover:opacity-95 animate-pulse-glow"
              >
                <Play className="mr-2 h-5 w-5" /> Start AI Bot
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                {p.canStart ? "One click. AI handles the rest." : "Connect a Deriv account to begin."}
              </p>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={p.onPause} variant="secondary" size="lg" className="h-14">
                <Pause className="mr-1 h-4 w-4" />{p.paused ? "Resume" : "Pause"}
              </Button>
              <Button onClick={p.onStop} variant="outline" size="lg" className="h-14">
                <Square className="mr-1 h-4 w-4" /> Stop
              </Button>
              <Button onClick={p.onEmergency} variant="destructive" size="lg" className="h-14">
                <Zap className="mr-1 h-4 w-4" /> Kill
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* AI READ */}
      <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Brain className="h-3.5 w-3.5" />} label="AI Confidence"
          value={p.analysis ? `${Math.round(animatedConf)}%` : "—"} bar={p.analysis?.confidence} tone="primary" />
        <Metric icon={<Gauge className="h-3.5 w-3.5" />} label="Direction"
          value={p.analysis ? p.analysis.recommendation : "—"}
          tone={p.analysis?.recommendation === "RISE" ? "bull" : p.analysis?.recommendation === "FALL" ? "bear" : "muted"}
          rightIcon={p.analysis?.recommendation === "RISE" ? <TrendingUp className="h-4 w-4 text-bull"/> :
                     p.analysis?.recommendation === "FALL" ? <TrendingDown className="h-4 w-4 text-bear"/> : null} />
        <Metric icon={<Activity className="h-3.5 w-3.5" />} label="Entry Quality"
          value={p.analysis ? `${p.analysis.entryScore}%` : "—"} bar={p.analysis?.entryScore} tone="accent" />
        <Metric icon={<Shield className="h-3.5 w-3.5" />} label="Risk Score"
          value={p.analysis ? `${p.analysis.riskScore}%` : "—"} bar={p.analysis?.riskScore} tone="warn" />
      </div>

      {/* High-signal banner */}
      {highSignal && p.analysis && (
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-primary/40 bg-primary/8 p-4 animate-float-up">
          <div className="pointer-events-none absolute inset-0 shimmer-gold opacity-30" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-gradient text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">High-probability setup detected</div>
              <div className="text-[12px] text-muted-foreground">
                {p.analysis.recommendationText}
              </div>
            </div>
            <div className="text-right">
              <div className="num text-2xl font-semibold text-primary">{p.analysis.confidence}%</div>
              <div className="text-[10px] uppercase text-muted-foreground">confidence</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, bar, tone = "muted", rightIcon }: {
  icon: React.ReactNode; label: string; value: string;
  bar?: number; tone?: "primary" | "accent" | "bull" | "bear" | "warn" | "muted";
  rightIcon?: React.ReactNode;
}) {
  const toneText =
    tone === "primary" ? "text-primary" :
    tone === "accent"  ? "text-accent"  :
    tone === "bull"    ? "text-bull"    :
    tone === "bear"    ? "text-bear"    :
    tone === "warn"    ? "text-warning" : "text-foreground";
  const barBg =
    tone === "primary" ? "bg-primary" :
    tone === "accent"  ? "bg-accent"  :
    tone === "bull"    ? "bg-bull"    :
    tone === "bear"    ? "bg-bear"    :
    tone === "warn"    ? "bg-warning" : "bg-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-background/30 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        {rightIcon}
      </div>
      <div className={cn("num mt-1 text-2xl font-semibold", toneText)}>{value}</div>
      {bar != null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-background/60">
          <div className={cn("h-full transition-all duration-500", barBg)} style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
    </div>
  );
}