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
  const toneBg =
    tone === "bull" ? "from-bull/25" :
    tone === "bear" ? "from-bear/25" :
    tone === "accent" ? "from-accent/25" :
    tone === "primary" ? "from-primary/25" : "from-muted/20";
  const toneIcon =
    tone === "bull" ? "bg-bull/15 text-bull" :
    tone === "bear" ? "bg-bear/15 text-bear" :
    tone === "accent" ? "bg-accent/15 text-accent" :
    tone === "primary" ? "bg-primary/15 text-primary" :
    "bg-card/60 text-muted-foreground";
  const valueTone =
    tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" :
    tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent" : "text-foreground";
  return (
    <div className="card-premium group relative overflow-hidden p-4 md:p-5">
      <div className={cn(
        "pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br to-transparent blur-3xl opacity-90 transition-opacity group-hover:opacity-100",
        toneBg,
      )} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className={cn("num mt-1.5 text-2xl font-bold tracking-tight md:text-3xl", valueTone)}>{value}</div>
          {sub && <div className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        {icon && (
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-white/5", toneIcon)}>
            {icon}
          </div>
        )}
      </div>
      {spark && spark.length > 1 && (
        <div className="relative mt-3 h-10">
          <Sparkline values={spark} />
        </div>
      )}
    </div>
  );
}
