import { Play, Square, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActionButtons({
  running, safeMode, onStart, onStop, onSafe, disabled,
}: {
  running: boolean; safeMode: boolean; disabled?: boolean;
  onStart: () => void; onStop: () => void; onSafe: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <Button onClick={onStart} disabled={disabled || running} size="lg"
              className={cn(
                "risk-btn risk-btn-start h-12 rounded-xl text-sm font-semibold transition-all bg-bull-gradient text-bull-foreground hover:opacity-95 hover:scale-[1.02]",
                !running && "btn-glow-green is-live"
              )}>
        <Play className="h-4 w-4" /> <span className="relative z-[2]">Start AI</span>
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
  );
}