import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/manual/cfd")({
  component: CfdTerminal,
});

function CfdTerminal() {
  return (
    <div className="animate-fade-in space-y-4 pb-28">
      <div className="glass-card p-5 md:p-7">
        <div className="flex items-center gap-3">
          <Link to="/manual" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="rounded-full bg-[oklch(0.82_0.15_85_/_0.16)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[oklch(0.86_0.14_90)]">CFD Terminal</span>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">CFD / Forex</h1>
            <p className="text-xs text-muted-foreground">Contracts for difference — multi-asset terminal</p>
          </div>
        </div>
      </div>

      <div className="glass-card relative overflow-hidden p-8 md:p-12">
        <div className="absolute inset-0 bg-mesh-anim opacity-30" />
        <div className="relative grid place-items-center gap-4 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-[oklch(0.86_0.14_90)] glow-soft">
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Coming soon</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Institutional CFD engine</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Multi-asset CFD execution with leveraged forex, indices, commodities and crypto.
              Building the same elite AI experience for traditional markets.
            </p>
          </div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[oklch(0.86_0.14_90)]/30 bg-[oklch(0.82_0.15_85_/_0.08)] px-3 py-1.5 text-xs text-[oklch(0.86_0.14_90)]">
            <Sparkles className="h-3.5 w-3.5" /> Premium release in development
          </div>
        </div>
      </div>
    </div>
  );
}