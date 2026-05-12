import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

export function PerfCard({
  label,
  value,
  sub,
  icon,
  tone,
  spark,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: "bull" | "bear" | "primary" | "accent" | "default";
  spark?: number[];
}) {
  const toneClass =
    tone === "bull" ? "from-bull/20" :
    tone === "bear" ? "from-bear/20" :
    tone === "accent" ? "from-accent/20" :
    tone === "primary" ? "from-primary/20" : "from-muted/20";
  const valueTone =
    tone === "bull" ? "bull" : tone === "bear" ? "bear" :
    tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent" : "";
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-4">
      <div className={cn("pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br to-transparent blur-3xl", toneClass)} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={cn("num mt-1 text-2xl font-semibold", valueTone)}>{value}</div>
          {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        {icon && <div className="grid h-8 w-8 place-items-center rounded-lg bg-card/60 text-muted-foreground">{icon}</div>}
      </div>
      {spark && spark.length > 1 && (
        <div className="relative mt-3 h-10">
          <Sparkline values={spark} />
        </div>
      )}
    </div>
  );
}
