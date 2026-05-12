import { useState } from "react";
import { Sparkles, X, Bot, TrendingUp, Shield, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TIPS = [
  { icon: TrendingUp, label: "Scan markets", to: "/trade", desc: "Open the AI trade terminal" },
  { icon: Bot, label: "Launch bot", to: "/bot", desc: "Start automated trading" },
  { icon: Shield, label: "Risk manager", to: "/bot", desc: "Tune TP / SL & drawdown" },
  { icon: Zap, label: "Live signals", to: "/dashboard", desc: "View AI signals dashboard" },
];

export function AIAssistantFab() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="pointer-events-auto w-[280px] overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-[0_20px_60px_-20px_oklch(0.82_0.15_85_/_0.4)] backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-border/60 bg-gradient-to-r from-primary/10 to-accent/10 px-3 py-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gold-gradient text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold">Hifex AI Assistant</div>
              <div className="text-[10px] text-muted-foreground">Quantitative co-pilot</div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto rounded p-1 hover:bg-muted/60"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="space-y-1 p-2">
            {TIPS.map(({ icon: Icon, label, to, desc }) => (
              <Link key={label} to={to} onClick={() => setOpen(false)}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/60">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="leading-tight">
                  <div className="text-xs font-medium">{label}</div>
                  <div className="text-[10px] text-muted-foreground">{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "pointer-events-auto group relative grid h-12 w-12 place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-[0_10px_40px_-10px_oklch(0.82_0.15_85_/_0.7)] transition-transform hover:scale-105",
          open && "rotate-90"
        )}
        aria-label="AI assistant"
      >
        <Sparkles className="h-5 w-5" />
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/30" />
      </button>
    </div>
  );
}
