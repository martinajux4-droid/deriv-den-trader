import { useEffect, useState } from "react";
import { Sparkles, Lock, Radar } from "lucide-react";
import type { Analysis } from "@/lib/ai-analysis";
import type { BotState } from "@/lib/bot-engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LiveMarketPulse } from "./LiveMarketPulse";

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
  protection?: {
    dailyRemaining: number;
    drawdown: number;
    exposure: number;
    currency: string;
  };
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
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Strategy</div>
            <div className="mt-1 text-lg font-semibold tracking-tight">
              {p.strategyLabel} <span className="text-xs text-muted-foreground">· {p.symbol}</span>
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
                className={cn(
                  "h-16 w-full text-base font-semibold transition-all",
                  p.canStart
                    ? "bg-gradient-to-r from-bull to-bull/80 text-bull-foreground shadow-[0_10px_40px_-10px_oklch(0.74_0.18_150/0.7)] hover:opacity-95 animate-pulse-glow"
                    : "bg-muted/40 text-muted-foreground cursor-not-allowed"
                )}
              >
                {p.canStart ? (
                  <><Radar className="mr-2 h-5 w-5" /> Scan Market</>
                ) : (
                  <><Lock className="mr-2 h-5 w-5" /> Locked · connect account</>
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                {!p.canStart
                  ? "Connect a Deriv account to begin."
                  : "AI scans all volatility markets and executes when confidence ≥ 61%"}
              </p>
            </>
          ) : null}
        </div>
      </div>

      {/* LIVE MARKET PULSE */}
      {p.running && <LiveMarketPulse symbol={p.symbol} />}

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

