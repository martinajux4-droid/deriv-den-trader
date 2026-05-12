import { useEffect, useState } from "react";
import { Activity, Sparkles, TrendingUp, TrendingDown, Wallet, Brain, Wifi } from "lucide-react";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { useDeriv } from "@/hooks/use-deriv";
import { useBotStatus } from "@/hooks/use-bot-status";
import { cn } from "@/lib/utils";

type Props = {
  displayName?: string | null;
  todayPnl: number;
  weekPnl: number;
  aiAccuracy: number;
};

export function DashboardHero({ displayName, todayPnl, weekPnl, aiAccuracy }: Props) {
  const { balance, active } = useDeriv();
  const bot = useBotStatus();
  const animBalance = useAnimatedNumber(balance?.balance ?? 0, 700);
  const animToday = useAnimatedNumber(todayPnl, 700);
  const animWeek = useAnimatedNumber(weekPnl, 700);
  const animAi = useAnimatedNumber(aiAccuracy, 700);
  const positive = todayPnl >= 0;

  // Pulse on profit changes
  const [pulse, setPulse] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (todayPnl === 0) return;
    setPulse(todayPnl >= 0 ? "up" : "down");
    const t = setTimeout(() => setPulse(null), 900);
    return () => clearTimeout(t);
  }, [todayPnl]);

  const accountKind = active?.is_virtual ? "Demo" : active ? "Real" : "—";

  return (
    <section className="card-premium card-premium-hero relative overflow-hidden p-5 md:p-7">
      {/* Decorative animated layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60">
        <div className="hero-wave absolute inset-y-0 left-0" />
      </div>
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl glow-soft" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        {/* Welcome */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary backdrop-blur">
            <Sparkles className="h-3 w-3" /> AI Terminal · Live
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
            <span className="text-foreground/90">Welcome back, </span>
            <span className="text-shimmer-gold">{displayName || "HifexVentures"}</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
            Institutional AI trading terminal · live synthetic markets · automated execution
          </p>

          {/* Status chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Chip icon={<Wifi className="h-3 w-3 text-bull" />} label="Realtime" tone="bull" />
            <Chip icon={<Activity className="h-3 w-3" />} label={`${accountKind} account`} />
            <Chip
              icon={<Brain className="h-3 w-3" />}
              label={bot.running ? `Bot ${bot.strategy?.replace(/_/g, " ") || "engaged"}` : "Bot idle"}
              tone={bot.running ? "bull" : "default"}
            />
          </div>
        </div>

        {/* Premium balance card */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-5 transition-all",
            "border-white/10 bg-[linear-gradient(180deg,oklch(1_0_0/0.06),oklch(1_0_0/0.02))] backdrop-blur-xl",
            pulse === "up" && "shadow-[0_0_60px_-10px_oklch(0.74_0.18_150/0.5)] border-bull/40",
            pulse === "down" && "shadow-[0_0_60px_-10px_oklch(0.65_0.22_25/0.5)] border-bear/40",
          )}
        >
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-gradient opacity-20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-blue-gradient opacity-20 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-gradient text-primary-foreground shadow-[0_0_24px_oklch(0.82_0.15_85/0.45)] glow-soft">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Account balance</div>
                <div className="text-[11px] text-foreground/70">{accountKind} · {balance?.currency || "USD"}</div>
              </div>
            </div>
            <span className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider",
              bot.running ? "bg-bull/15 text-bull" : "bg-muted/60 text-muted-foreground",
            )}>
              {bot.running ? "Live" : "Standby"}
            </span>
          </div>

          <div className="relative mt-4">
            <div className="num text-shimmer-gold text-4xl font-bold tracking-tight md:text-5xl">
              {balance ? animBalance.toFixed(2) : "—"}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              {balance ? balance.currency : "Connect a Deriv account"}
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <Stat
              label="Today"
              value={`${todayPnl >= 0 ? "+" : ""}${animToday.toFixed(2)}`}
              tone={positive ? "bull" : "bear"}
              icon={positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            />
            <Stat
              label="7-day"
              value={`${weekPnl >= 0 ? "+" : ""}${animWeek.toFixed(2)}`}
              tone={weekPnl >= 0 ? "bull" : "bear"}
              icon={weekPnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            />
            <Stat
              label="AI"
              value={`${Math.round(animAi)}%`}
              tone="primary"
              icon={<Brain className="h-3 w-3" />}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Chip({ icon, label, tone = "default" }: { icon: React.ReactNode; label: string; tone?: "bull" | "default" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur",
        tone === "bull"
          ? "border-bull/30 bg-bull/10 text-bull"
          : "border-border/60 bg-card/50 text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function Stat({
  label, value, tone, icon,
}: { label: string; value: string; tone: "bull" | "bear" | "primary"; icon: React.ReactNode }) {
  const toneCls =
    tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-primary";
  return (
    <div className="rounded-xl border border-white/5 bg-background/40 p-2.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className={toneCls}>{icon}</span>
      </div>
      <div className={cn("num mt-1 text-base font-semibold tabular-nums", toneCls)}>{value}</div>
    </div>
  );
}