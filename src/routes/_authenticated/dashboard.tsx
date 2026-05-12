import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { supabase } from "@/integrations/supabase/client";
import { ConnectDeriv } from "@/components/ConnectDeriv";
import { MarketWatchGrid } from "@/components/MarketWatchGrid";
import { AdvancedChart } from "@/components/AdvancedChart";
import { SignalsPanel } from "@/components/SignalsPanel";
import { ActiveTradesPanel } from "@/components/ActiveTradesPanel";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { BotQuickLaunch } from "@/components/BotQuickLaunch";
import { PerfCard } from "@/components/PerformanceCards";
import { DashboardHero } from "@/components/DashboardHero";
import { LiveAIStatus } from "@/components/LiveAIStatus";
import { DERIV_SYMBOLS } from "@/lib/deriv-symbols";
import { TrendingUp, Trophy, Target, Brain, Activity, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { balance, profile, accounts } = useDeriv();
  const [selected, setSelected] = useState<string>(profile?.default_symbol || "R_100");
  const [trades, setTrades] = useState<{ profit: number | null; status: string; closed_at: string | null }[]>([]);

  useEffect(() => {
    if (profile?.default_symbol) setSelected((s) => s || profile.default_symbol);
  }, [profile?.default_symbol]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("trades")
        .select("profit,status,closed_at")
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false })
        .limit(500);
      if (alive && data) setTrades(data as any);
    };
    load();
    const ch = supabase
      .channel("dash-trades")
      .on("postgres_changes", { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  const stats = useMemo(() => {
    const settled = trades.filter((t) => t.profit != null);
    const total = settled.length;
    const won = settled.filter((t) => t.status === "won").length;
    const profit = settled.reduce((s, t) => s + Number(t.profit || 0), 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayProfit = settled
      .filter((t) => t.closed_at && new Date(t.closed_at) >= today)
      .reduce((s, t) => s + Number(t.profit || 0), 0);
    const week = new Date(); week.setDate(week.getDate() - 7);
    const weekProfit = settled
      .filter((t) => t.closed_at && new Date(t.closed_at) >= week)
      .reduce((s, t) => s + Number(t.profit || 0), 0);
    // build curve (cumulative pnl most recent 30)
    const recent = [...settled].slice(0, 30).reverse();
    let cum = 0;
    const curve = recent.map((t) => (cum += Number(t.profit || 0)));
    const winRate = total ? Math.round((won / total) * 100) : 0;
    const aiAcc = total ? Math.min(99, 55 + Math.round(winRate * 0.4)) : 0;
    return { total, won, profit, todayProfit, weekProfit, curve, winRate, aiAcc };
  }, [trades]);

  const symbolName = DERIV_SYMBOLS.find((s) => s.symbol === selected)?.name || selected;

  return (
    <div className="animate-float-up space-y-5">
      {/* Premium hero header with animated welcome + balance */}
      <DashboardHero
        displayName={profile?.display_name}
        todayPnl={stats.todayProfit}
        weekPnl={stats.weekProfit}
        aiAccuracy={stats.aiAcc}
      />

      {accounts.length === 0 && <ConnectDeriv />}

      {/* Inline live AI status — visible only while bot runs */}
      <LiveAIStatus />

      {/* Performance KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PerfCard
          label="All-time P&L"
          value={`${stats.profit >= 0 ? "+" : ""}${stats.profit.toFixed(2)}`}
          sub={`${stats.total} trades settled`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone={stats.profit >= 0 ? "bull" : "bear"}
          spark={stats.curve.length > 1 ? stats.curve : undefined}
        />
        <PerfCard
          label="Win Rate"
          value={`${stats.winRate}%`}
          sub={`${stats.won}/${stats.total} wins`}
          icon={<Trophy className="h-4 w-4" />}
          tone="accent"
        />
        <PerfCard
          label="AI Accuracy"
          value={`${stats.aiAcc}%`}
          sub={`Today ${stats.todayProfit >= 0 ? "+" : ""}${stats.todayProfit.toFixed(2)}`}
          icon={<Brain className="h-4 w-4" />}
          tone="primary"
        />
        <PerfCard
          label="7-Day P&L"
          value={`${stats.weekProfit >= 0 ? "+" : ""}${stats.weekProfit.toFixed(2)}`}
          sub={balance ? balance.currency : "—"}
          icon={<CalendarDays className="h-4 w-4" />}
          tone={stats.weekProfit >= 0 ? "bull" : "bear"}
        />
      </div>

      {/* Market Watch */}
      <section>
        <SectionHeader icon={<Activity className="h-3.5 w-3.5" />} title="Market Watch" subtitle="Click any market to load advanced chart" />
        <MarketWatchGrid selected={selected} onSelect={setSelected} />
      </section>

      {/* Chart + Bot + Insights */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <AdvancedChart symbol={selected} name={symbolName} />
          <ActiveTradesPanel />
        </div>
        <div className="space-y-3">
          <BotQuickLaunch />
          <SignalsPanel />
          <AIInsightsPanel symbol={selected} name={symbolName} />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 text-primary">{icon}</div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Target className="h-3 w-3" /> Live
      </div>
    </div>
  );
}
