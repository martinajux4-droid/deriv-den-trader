import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Trophy, Flame, Target, Activity, Download, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({ component: History });

type Trade = {
  id: string;
  symbol: string;
  contract_type: string;
  stake: number | string;
  profit: number | null;
  status: string;
  loginid: string | null;
  is_virtual: boolean;
  opened_at: string;
  closed_at: string | null;
  duration: number | null;
  duration_unit: string | null;
};

function fmt(n: number, d = 2) { return (n >= 0 ? "+" : "") + n.toFixed(d); }

function PnlCurve({ trades }: { trades: Trade[] }) {
  const pts = useMemo(() => {
    let cum = 0;
    return [...trades].reverse().map((t, i) => {
      cum += Number(t.profit || 0);
      return { i, v: cum };
    });
  }, [trades]);
  if (pts.length < 2) return <div className="grid h-full place-items-center text-xs text-muted-foreground">Not enough data</div>;
  const min = Math.min(...pts.map((p) => p.v), 0);
  const max = Math.max(...pts.map((p) => p.v), 0.0001);
  const w = 800, h = 220, pad = 8;
  const sx = (i: number) => pad + (i / (pts.length - 1)) * (w - pad * 2);
  const sy = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.i).toFixed(1)},${sy(p.v).toFixed(1)}`).join(" ");
  const area = `${path} L${sx(pts[pts.length - 1].i).toFixed(1)},${h - pad} L${sx(0).toFixed(1)},${h - pad} Z`;
  const last = pts[pts.length - 1].v;
  const positive = last >= 0;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="pnl-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={positive ? "oklch(0.74 0.18 150)" : "oklch(0.65 0.22 25)"} stopOpacity="0.45" />
          <stop offset="100%" stopColor={positive ? "oklch(0.74 0.18 150)" : "oklch(0.65 0.22 25)"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} x2={w - pad} y1={sy(0)} y2={sy(0)} stroke="oklch(0.4 0.02 270)" strokeDasharray="3 3" strokeWidth="0.6" />
      <path d={area} fill="url(#pnl-grad)" />
      <path d={path} fill="none" stroke={positive ? "oklch(0.74 0.18 150)" : "oklch(0.65 0.22 25)"} strokeWidth="1.6" />
    </svg>
  );
}

function DailyBars({ trades }: { trades: Trade[] }) {
  const days = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trades) {
      const k = new Date(t.opened_at).toISOString().slice(0, 10);
      map.set(k, (map.get(k) || 0) + Number(t.profit || 0));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  }, [trades]);
  if (!days.length) return <div className="grid h-full place-items-center text-xs text-muted-foreground">No data</div>;
  const max = Math.max(...days.map(([, v]) => Math.abs(v)), 0.001);
  return (
    <div className="flex h-full items-end gap-1.5 px-1 pb-2">
      {days.map(([d, v]) => {
        const h = Math.max(2, (Math.abs(v) / max) * 100);
        const pos = v >= 0;
        return (
          <div key={d} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className={`w-full rounded-sm transition-all ${pos ? "bg-bull/70 hover:bg-bull" : "bg-bear/70 hover:bg-bear"}`}
              style={{ height: `${h}%` }}
              title={`${d}: ${fmt(v)}`}
            />
            <div className="mt-1 hidden text-[8px] text-muted-foreground sm:block">{d.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}

function StratLeaderboard({ trades }: { trades: Trade[] }) {
  const stats = useMemo(() => {
    const m = new Map<string, { wins: number; losses: number; pnl: number }>();
    for (const t of trades) {
      const k = t.contract_type || "—";
      const cur = m.get(k) || { wins: 0, losses: 0, pnl: 0 };
      cur.pnl += Number(t.profit || 0);
      if (t.status === "won") cur.wins++;
      else if (t.status === "lost") cur.losses++;
      m.set(k, cur);
    }
    return Array.from(m.entries())
      .map(([k, v]) => ({ k, ...v, total: v.wins + v.losses, wr: v.wins + v.losses ? (v.wins / (v.wins + v.losses)) * 100 : 0 }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  if (!stats.length) return <div className="py-6 text-center text-xs text-muted-foreground">No strategy data yet</div>;
  return (
    <div className="space-y-2">
      {stats.map((s) => (
        <div key={s.k} className="rounded-lg border border-border/60 bg-card/40 p-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">{s.k}</div>
            <div className={`num text-xs ${s.pnl >= 0 ? "bull" : "bear"}`}>{fmt(s.pnl)}</div>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-to-r from-bull to-primary" style={{ width: `${s.wr.toFixed(0)}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{s.total} trades</span>
            <span className="num">{s.wr.toFixed(1)}% WR</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SymbolHeatmap({ trades }: { trades: Trade[] }) {
  const items = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of trades) m.set(t.symbol, (m.get(t.symbol) || 0) + Number(t.profit || 0));
    return Array.from(m.entries()).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  }, [trades]);
  if (!items.length) return <div className="py-6 text-center text-xs text-muted-foreground">No symbol data yet</div>;
  const max = Math.max(...items.map(([, v]) => Math.abs(v)), 0.001);
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {items.map(([sym, v]) => {
        const intensity = Math.min(1, Math.abs(v) / max);
        const pos = v >= 0;
        return (
          <div
            key={sym}
            className="rounded-md border border-border/60 p-2.5 transition-all"
            style={{
              background: `${pos ? "oklch(0.74 0.18 150 /" : "oklch(0.65 0.22 25 /"} ${0.08 + intensity * 0.35})`,
            }}
          >
            <div className="text-[11px] font-medium">{sym}</div>
            <div className={`num text-sm font-semibold ${pos ? "bull" : "bear"}`}>{fmt(v)}</div>
          </div>
        );
      })}
    </div>
  );
}

function exportCSV(rows: Trade[]) {
  const head = ["opened_at", "symbol", "contract_type", "stake", "profit", "status", "loginid", "is_virtual"];
  const lines = [head.join(",")].concat(
    rows.map((r) =>
      [r.opened_at, r.symbol, r.contract_type, r.stake, r.profit ?? "", r.status, r.loginid ?? "", r.is_virtual]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `trades-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function History() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [acct, setAcct] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("trades").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }).limit(500)
      .then(({ data }) => setTrades((data as Trade[]) || []));
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (!trades) return [];
    return trades.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (acct === "real" && t.is_virtual) return false;
      if (acct === "demo" && !t.is_virtual) return false;
      if (q && !`${t.symbol} ${t.contract_type}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [trades, filter, acct, q]);

  const kpis = useMemo(() => {
    const arr = filtered;
    const wins = arr.filter((t) => t.status === "won").length;
    const losses = arr.filter((t) => t.status === "lost").length;
    const closed = wins + losses;
    const pnl = arr.reduce((s, t) => s + Number(t.profit || 0), 0);
    const grossWin = arr.filter((t) => Number(t.profit || 0) > 0).reduce((s, t) => s + Number(t.profit), 0);
    const grossLoss = Math.abs(arr.filter((t) => Number(t.profit || 0) < 0).reduce((s, t) => s + Number(t.profit), 0));
    const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
    const avgWin = wins ? grossWin / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;

    // streaks (chronological)
    const ord = [...arr].reverse();
    let bestWin = 0, bestLoss = 0, curW = 0, curL = 0;
    for (const t of ord) {
      if (t.status === "won") { curW++; curL = 0; bestWin = Math.max(bestWin, curW); }
      else if (t.status === "lost") { curL++; curW = 0; bestLoss = Math.max(bestLoss, curL); }
    }
    return { wins, losses, closed, pnl, pf, avgWin, avgLoss, bestWin, bestLoss, total: arr.length };
  }, [filtered]);

  const loading = trades === null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-primary/80">Performance Analytics</div>
          <h1 className="text-2xl font-semibold tracking-tight">Trade History &amp; Insights</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} disabled={!filtered.length}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
          : (
            <>
              <KPI label="Net P&L" value={fmt(kpis.pnl)} positive={kpis.pnl >= 0} icon={kpis.pnl >= 0 ? TrendingUp : TrendingDown} />
              <KPI label="Win rate" value={`${kpis.closed ? ((kpis.wins / kpis.closed) * 100).toFixed(1) : "0"}%`} icon={Target} />
              <KPI label="Profit factor" value={kpis.pf === Infinity ? "∞" : kpis.pf.toFixed(2)} icon={Trophy} />
              <KPI label="Best streak" value={`${kpis.bestWin}W`} positive icon={Flame} />
              <KPI label="Worst streak" value={`${kpis.bestLoss}L`} positive={false} icon={Flame} />
              <KPI label="Total trades" value={String(kpis.total)} icon={Activity} />
            </>
          )}
      </div>

      {/* Charts */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cumulative P&amp;L</div>
            <Badge variant="outline" className="text-[10px]">Last {filtered.length}</Badge>
          </div>
          <div className="h-[220px]">{loading ? <Skeleton className="h-full w-full" /> : <PnlCurve trades={filtered} />}</div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Daily P&amp;L (14d)</div>
          <div className="h-[220px]">{loading ? <Skeleton className="h-full w-full" /> : <DailyBars trades={filtered} />}</div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Strategy leaderboard</div>
          {loading ? <Skeleton className="h-40" /> : <StratLeaderboard trades={filtered} />}
        </Card>
        <Card className="p-4 lg:col-span-2">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Symbol heatmap</div>
          {loading ? <Skeleton className="h-40" /> : <SymbolHeatmap trades={filtered} />}
        </Card>
      </div>

      {/* Journal */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-3">
          <div className="text-sm font-semibold">Trade journal</div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search symbol / type" className="h-8 w-44 pl-7 text-xs" />
            </div>
            <Select value={acct} onValueChange={setAcct}>
              <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                <SelectItem value="real">Real</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
              </SelectContent>
            </Select>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
                <TabsTrigger value="won" className="text-xs">Won</TabsTrigger>
                <TabsTrigger value="lost" className="text-xs">Lost</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left">Time</th>
                <th className="px-4 py-2.5 text-left">Symbol</th>
                <th className="px-4 py-2.5 text-left">Type</th>
                <th className="px-4 py-2.5 text-right">Stake</th>
                <th className="px-4 py-2.5 text-right">Profit</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">Account</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td colSpan={7} className="px-4 py-2"><Skeleton className="h-5 w-full" /></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No trades match your filters.</td></tr>
              )}
              {!loading && filtered.map((t) => (
                <tr key={t.id} className="border-t border-border/60 transition-colors hover:bg-card/50">
                  <td className="num px-4 py-2 text-[11px] text-muted-foreground">{new Date(t.opened_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-medium">{t.symbol}</td>
                  <td className="px-4 py-2 text-xs">{t.contract_type}</td>
                  <td className="num px-4 py-2 text-right">{Number(t.stake).toFixed(2)}</td>
                  <td className={`num px-4 py-2 text-right font-semibold ${Number(t.profit) >= 0 ? "bull" : "bear"}`}>
                    {t.profit !== null ? fmt(Number(t.profit)) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={t.status === "won" ? "default" : t.status === "lost" ? "destructive" : "secondary"} className="text-[10px]">
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-[11px] text-muted-foreground">{t.loginid}{t.is_virtual ? " · Demo" : " · Real"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KPI({ label, value, positive, icon: Icon }: { label: string; value: string; positive?: boolean; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={`h-3.5 w-3.5 ${positive === undefined ? "text-primary" : positive ? "text-bull" : "text-bear"}`} />
      </div>
      <div className={`num mt-1.5 text-xl font-semibold ${positive === undefined ? "" : positive ? "bull" : "bear"}`}>{value}</div>
    </Card>
  );
}
