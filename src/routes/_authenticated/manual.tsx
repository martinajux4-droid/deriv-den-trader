import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Sigma, Layers, Hash, TrendingUp, Shuffle, Briefcase } from "lucide-react";
import { StrategyDock } from "@/components/manual/StrategyDock";

export const Route = createFileRoute("/_authenticated/manual")({
  component: ManualLayout,
});

const STRATS = [
  { to: "/manual/even-odd",        title: "Even / Odd",        desc: "Last-digit parity strategy",  icon: Sigma,      accent: "var(--meter-bull)" },
  { to: "/manual/over-under",      title: "Over / Under",      desc: "Digit threshold prediction",  icon: Layers,     accent: "var(--meter-momentum)" },
  { to: "/manual/matches-differs", title: "Matches / Differs", desc: "Digit pattern recognition",   icon: Hash,       accent: "var(--meter-ai)" },
  { to: "/manual/rise-fall",       title: "Rise / Fall",       desc: "Directional momentum trades", icon: TrendingUp, accent: "var(--meter-bear)" },
  { to: "/manual/under-digit",     title: "Under / Digit",     desc: "Smart digit prediction matrix", icon: Shuffle,  accent: "oklch(0.78 0.16 320)" },
  { to: "/manual/cfd",             title: "CFD Terminal",      desc: "Multi-asset CFD engine (soon)", icon: Briefcase, accent: "oklch(0.82 0.15 85)" },
];

function ManualLayout() {
  const { pathname } = useLocation();
  if (pathname !== "/manual") {
    return (
      <>
        <div key={pathname} className="animate-fade-in">
          <Outlet />
        </div>
        <StrategyDock />
      </>
    );
  }
  return (
    <div className="space-y-5 pb-28">
      <div className="glass-card relative overflow-hidden p-5 md:p-7">
        <div className="absolute inset-0 bg-mesh-anim opacity-40" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Manual Terminal</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            <span className="text-shimmer-gold">Choose your strategy</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Institutional-grade execution. Each strategy is its own focused terminal — clean, fast, intelligent.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STRATS.map((s) => (
          <Link key={s.to} to={s.to} className="glass-card group relative overflow-hidden p-5 transition-all hover:scale-[1.01]">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60"
                 style={{ background: s.accent }} />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.03]"
                     style={{ color: s.accent }}>
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                Open
              </span>
            </div>
          </Link>
        ))}
      </div>
      <StrategyDock />
    </div>
  );
}