import { Play, Pause, Square, ShieldCheck, Zap, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActionButtons({
  running, paused, safeMode, onStart, onStartManual, onPause, onStop, onSafe, onTradeNow, disabled, tradeBusy,
}: {
  running: boolean; paused?: boolean; safeMode: boolean; disabled?: boolean;
  tradeBusy?: boolean;
  onStart: () => void; onStartManual?: () => void; onPause?: () => void;
  onStop: () => void; onSafe: () => void; onTradeNow?: () => void;
}) {
  return (
    <div className="space-y-2.5">
      {onTradeNow && (
        <Button onClick={onTradeNow} disabled={disabled || running || tradeBusy} size="lg"
                className={cn(
                  "risk-btn h-12 w-full rounded-xl text-sm font-semibold transition-all",
                  "bg-gradient-to-r from-[var(--meter-momentum)] to-[var(--meter-bull)] text-bull-foreground hover:opacity-95 hover:scale-[1.01]",
                  !running && !tradeBusy && "btn-glow-blue is-live"
                )}>
          <Zap className="h-4 w-4" /> <span className="relative z-[2]">{tradeBusy ? "Placing trade…" : "Trade Now"}</span>
        </Button>
      )}
    {onStartManual && (
      <div className="grid grid-cols-2 gap-2.5">
        <Button onClick={onStartManual} disabled={disabled || running} size="lg"
                className={cn(
                  "risk-btn h-12 rounded-full text-sm font-bold uppercase tracking-wider transition-all",
                  "bg-gradient-to-r from-[var(--meter-bull)] to-emerald-500 text-bull-foreground hover:opacity-95 hover:scale-[1.02]",
                  !running && "btn-glow-green is-live"
                )}>
          <Rocket className="h-4 w-4" /> <span className="relative z-[2]">Start Trading</span>
        </Button>
        <Button onClick={paused ? onStart : onPause} disabled={!running} size="lg"
                className={cn(
                  "risk-btn h-12 rounded-full text-sm font-bold uppercase tracking-wider transition-all",
                  paused
                    ? "bg-gradient-to-r from-warning to-amber-500 text-black hover:opacity-95 hover:scale-[1.02]"
                    : "bg-gradient-to-r from-bear to-rose-600 text-white hover:opacity-95 hover:scale-[1.02]",
                  running && "btn-glow-red is-live"
                )}>
          <Pause className="h-4 w-4" /> <span className="relative z-[2]">{paused ? "Resume" : "Pause"}</span>
        </Button>
      </div>
    )}
    <div className="grid grid-cols-3 gap-2.5">
      <Button onClick={onStart} disabled={disabled || running} size="lg"
              className={cn(
                "risk-btn risk-btn-start h-12 rounded-xl text-sm font-semibold transition-all bg-bull-gradient text-bull-foreground hover:opacity-95 hover:scale-[1.02]",
                !running && "btn-glow-green is-live"
              )}>
        <Play className="h-4 w-4" /> <span className="relative z-[2]">Auto AI</span>
      </Button>
      <Button onClick={onStop} disabled={!running} size="lg" variant="destructive"
              className={cn(
                "risk-btn risk-btn-stop h-12 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]",
                running && "btn-glow-red is-live"
              )}>
        <Square className="h-4 w-4" /> <span className="relative z-[2]">Stop</span>
      </Button>
      <Button onClick={onSafe} size="lg" variant="outline"
              className={cn(
                "risk-btn risk-btn-safe h-12 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]",
                safeMode
                  ? "is-on border-[var(--meter-momentum)]/50 bg-[var(--meter-momentum)]/10 text-[var(--meter-momentum)] btn-glow-blue"
                  : "border-white/10"
              )}>
        <ShieldCheck className="h-4 w-4" /> <span className="relative z-[2]">{safeMode ? "Shield On" : "Safe Mode"}</span>
      </Button>
    </div>
    </div>
  );
}