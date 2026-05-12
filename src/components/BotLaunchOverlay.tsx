import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Brain, Activity, Radar, Sparkles } from "lucide-react";

const STEPS = [
  "Validating risk management…",
  "Checking market volatility…",
  "Establishing secure AI link…",
  "Scanning for safe entries…",
  "Analyzing momentum flow…",
  "AI protection systems active…",
  "Trading engine online…",
  "AI engine online · ready to trade",
];

export function BotLaunchOverlay({ open, onDone }: { open: boolean; onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) { setStep(0); return; }
    setStep(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= STEPS.length) {
        clearInterval(id);
        setTimeout(onDone, 500);
      } else {
        setStep(i);
      }
    }, 520);
    return () => clearInterval(id);
  }, [open, onDone]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/85 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-grid-fine opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black,transparent_75%)]" />
      <div className="scan-sweep" />

      {/* central radar */}
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <div className="relative mb-8 grid place-items-center">
          <div className="absolute h-72 w-72 rounded-full border border-primary/15 ai-ring-pulse" />
          <div className="absolute h-56 w-56 rounded-full border border-accent/20 ai-ring-pulse" style={{ animationDelay: ".4s" }} />
          <div className="absolute h-40 w-40 rounded-full border border-primary/30 ai-ring-pulse" style={{ animationDelay: ".8s" }} />
          <div className="absolute h-72 w-72">
            <div
              className="radar-spin h-full w-full rounded-full"
              style={{ background: "conic-gradient(from 0deg, transparent 0 270deg, oklch(0.62 0.18 250 / 0.45) 300deg, transparent 360deg)" }}
            />
          </div>
          <svg className="absolute h-72 w-72 opacity-70" viewBox="0 0 200 200" fill="none">
            <g stroke="oklch(0.82 0.15 85 / 0.6)" strokeWidth="0.6" strokeDasharray="4 6" style={{ animation: "neural-dash 4s linear infinite" }}>
              <line x1="100" y1="20" x2="100" y2="180" />
              <line x1="20" y1="100" x2="180" y2="100" />
              <line x1="35" y1="35" x2="165" y2="165" />
              <line x1="165" y1="35" x2="35" y2="165" />
            </g>
          </svg>
          <div className="relative grid h-24 w-24 place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-[0_0_60px_oklch(0.82_0.15_85/0.6)] glow-soft">
            <Brain className="h-10 w-10" />
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">AI Trading Engine</div>
        <h2 className="mt-1 text-2xl font-semibold text-shimmer-gold">Booting intelligence layer</h2>

        <div className="mt-6 w-full rounded-2xl border border-border/60 bg-card/50 p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Radar className="h-3 w-3 text-accent animate-pulse" />
            <span>Initialization</span>
            <span className="ml-auto num text-foreground">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/60">
            <div className="h-full bg-gold-gradient transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <ul className="mt-4 space-y-1.5 text-left">
            {STEPS.slice(0, step + 1).map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px] animate-float-up">
                <Sparkles className={`h-3 w-3 ${i === step ? "text-primary" : "text-muted-foreground"}`} />
                <span className={i === step ? "text-foreground type-caret" : "text-muted-foreground"}>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Activity className="h-3 w-3 text-bull animate-pulse" />
          Live AI · Quantitative engine
        </div>
      </div>
    </div>,
    document.body,
  );
}