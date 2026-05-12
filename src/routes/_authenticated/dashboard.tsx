import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ConnectDeriv } from "@/components/ConnectDeriv";
import { TickChart } from "@/components/TickChart";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { active, balance, profile, accounts } = useDeriv();
  const [stats, setStats] = useState({ total: 0, won: 0, profit: 0, todayProfit: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("trades")
        .select("profit,status,closed_at")
        .eq("user_id", user.id)
        .not("profit", "is", null)
        .order("closed_at", { ascending: false })
        .limit(1000);
      const list = data || [];
      const total = list.length;
      const won = list.filter((t: any) => t.status === "won").length;
      const profit = list.reduce((s: number, t: any) => s + Number(t.profit || 0), 0);
      const today = new Date(); today.setHours(0,0,0,0);
      const todayProfit = list.filter((t: any) => t.closed_at && new Date(t.closed_at) >= today)
        .reduce((s: number, t: any) => s + Number(t.profit || 0), 0);
      setStats({ total, won, profit, todayProfit });
    })();
  }, [user, balance?.balance]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}</h1>
        <p className="text-sm text-muted-foreground">Live overview of your Deriv trading.</p>
      </div>

      {accounts.length === 0 && <ConnectDeriv />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Balance" value={balance ? `${balance.balance.toFixed(2)} ${balance.currency}` : "—"} />
        <Stat label="Total trades" value={stats.total.toString()} />
        <Stat label="Win rate" value={stats.total ? `${Math.round((stats.won / stats.total) * 100)}%` : "—"} />
        <Stat label="All-time P&L" value={`${stats.profit >= 0 ? "+" : ""}${stats.profit.toFixed(2)}`}
              tone={stats.profit >= 0 ? "bull" : "bear"} />
      </div>

      {active && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Live · {profile?.default_symbol || "R_100"}</h2>
          <TickChart symbol={profile?.default_symbol || "R_100"} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`num mt-2 text-2xl font-semibold ${tone === "bull" ? "bull" : tone === "bear" ? "bear" : ""}`}>{value}</div>
    </Card>
  );
}
