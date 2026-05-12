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
              className={cn("h-12 rounded-xl text-sm font-semibold transition-all bg-bull-gradient text-bull-foreground hover:opacity-95 hover:scale-[1.02]", !running && "btn-glow-green")}>
        <Play className="h-4 w-4" /> Start
      </Button>
      <Button onClick={onStop} disabled={!running} size="lg" variant="destructive"
              className={cn("h-12 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]", running && "btn-glow-red animate-pulse")}>
        <Square className="h-4 w-4" /> Stop
      </Button>
      <Button onClick={onSafe} size="lg" variant="outline"
              className={cn("h-12 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]",
                safeMode ? "border-[var(--meter-momentum)]/50 bg-[var(--meter-momentum)]/10 text-[var(--meter-momentum)] btn-glow-blue" : "border-white/10")}>
        <ShieldCheck className="h-4 w-4" /> {safeMode ? "Safe On" : "Safe Mode"}
      </Button>
    </div>
  );
}