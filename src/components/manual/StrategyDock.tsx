import { Link, useLocation } from "@tanstack/react-router";
import { Home, Sigma, Layers, Hash, TrendingUp, Shuffle, Briefcase, MoreHorizontal } from "lucide-react";

type Tab = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const TABS: Tab[] = [
  { to: "/manual",                 label: "Home", icon: Home,            accent: "var(--meter-ai)" },
  { to: "/manual/even-odd",        label: "E/O",  icon: Sigma,           accent: "var(--meter-bull)" },
  { to: "/manual/over-under",      label: "O/U",  icon: Layers,          accent: "var(--meter-momentum)" },
  { to: "/manual/matches-differs", label: "M/D",  icon: Hash,            accent: "var(--meter-ai)" },
  { to: "/manual/rise-fall",       label: "R/F",  icon: TrendingUp,      accent: "var(--meter-bear)" },
  { to: "/manual/under-digit",     label: "U/D",  icon: Shuffle,         accent: "oklch(0.78 0.16 320)" },
  { to: "/manual/cfd",             label: "CFD",  icon: Briefcase,       accent: "oklch(0.82 0.15 85)" },
  { to: "/settings",               label: "More", icon: MoreHorizontal,  accent: "oklch(0.7 0.02 260)" },
];

export function StrategyDock() {
  const { pathname } = useLocation();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-3 z-40 px-3 md:bottom-5">
      <div className="pointer-events-auto mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.13_0.015_260_/_0.78)] p-1.5 shadow-[0_20px_60px_-20px_oklch(0_0_0_/_0.8),inset_0_1px_0_oklch(1_0_0_/_0.06)] backdrop-blur-2xl">
          {/* ambient glow */}
          <div className="pointer-events-none absolute inset-0 opacity-60"
               style={{ background: "radial-gradient(60% 100% at 50% 110%, oklch(0.82 0.15 85 / 0.18), transparent 60%), radial-gradient(60% 100% at 50% -10%, oklch(0.62 0.18 250 / 0.18), transparent 60%)" }} />
          <ul className="relative flex items-center justify-between gap-0.5">
            {TABS.map((t) => {
              const isActive = t.to === "/manual" ? pathname === "/manual" : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <li key={t.to} className="flex-1 min-w-0">
                  <Link to={t.to}
                        className="group relative grid place-items-center gap-0.5 rounded-xl px-1 py-2 text-center transition-all"
                        style={isActive ? { background: `linear-gradient(180deg, ${t.accent}26, ${t.accent}10)`, boxShadow: `inset 0 0 0 1px ${t.accent}55, 0 0 24px -6px ${t.accent}` } : undefined}>
                    <span className="relative">
                      <span style={isActive ? { color: t.accent, filter: `drop-shadow(0 0 6px ${t.accent})` } : undefined}
                            className={isActive ? "" : "text-muted-foreground group-hover:text-foreground transition-colors"}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      {isActive && (
                        <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full animate-pulse"
                              style={{ background: t.accent, boxShadow: `0 0 8px ${t.accent}` }} />
                      )}
                    </span>
                    <span className={`truncate text-[10px] font-semibold uppercase tracking-[0.12em] ${isActive ? "" : "text-muted-foreground"}`}
                          style={isActive ? { color: t.accent } : undefined}>
                      {t.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}