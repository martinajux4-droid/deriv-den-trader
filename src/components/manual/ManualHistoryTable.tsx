import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Filter } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Trade = {
  id: string; symbol: string; contract_type: string; stake: number;
  profit: number | null; entry_spot: number | null; exit_spot: number | null;
  status: string; opened_at: string;
};

export function ManualHistoryTable({ contractTypes }: { contractTypes: string[] }) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filter, setFilter] = useState<"all" | "won" | "lost">("all");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("trades").select("id,symbol,contract_type,stake,profit,entry_spot,exit_spot,status,opened_at")
      .eq("user_id", user.id).in("contract_type", contractTypes)
      .order("opened_at", { ascending: false }).limit(40);
    setTrades((data ?? []) as Trade[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id, contractTypes.join(",")]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("manual-trades")
      .on("postgres_changes", { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const rows = trades.filter((t) => filter === "all" ? true : t.status === filter);

  const exportCsv = () => {
    const head = "time,symbol,type,stake,entry,exit,profit,status\n";
    const body = rows.map((t) =>
      [t.opened_at, t.symbol, t.contract_type, t.stake, t.entry_spot ?? "", t.exit_spot ?? "", t.profit ?? "", t.status].join(",")).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "manual-trades.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from("trades").delete().eq("user_id", user.id).in("contract_type", contractTypes);
    toast.success("History cleared"); load();
  };

  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Trade history</span>
          <span className="text-xs text-muted-foreground">· {rows.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-0.5">
            <Filter className="ml-1.5 h-3 w-3 text-muted-foreground" />
            {(["all", "won", "lost"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                      className={`rounded px-2 py-0.5 text-[11px] capitalize transition-colors ${filter === f ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={exportCsv}><Download className="h-3 w-3" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-bear hover:text-bear"><Trash2 className="h-3 w-3" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear trade history?</AlertDialogTitle>
                <AlertDialogDescription>This permanently deletes manual trades for this strategy.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAll}>Clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-white/5">
              <th className="py-2 text-left font-medium">Status</th>
              <th className="py-2 text-left font-medium">Type</th>
              <th className="py-2 text-right font-medium">Stake</th>
              <th className="py-2 text-right font-medium">Entry</th>
              <th className="py-2 text-right font-medium">Exit</th>
              <th className="py-2 text-right font-medium">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No trades yet — start the engine to begin.</td></tr>
            )}
            {rows.map((t) => {
              const p = Number(t.profit ?? 0);
              return (
                <tr key={t.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      t.status === "won" ? "bg-bull/15 text-bull" : t.status === "lost" ? "bg-bear/15 text-bear" : "bg-muted text-muted-foreground"
                    }`}>{t.status}</span>
                  </td>
                  <td className="py-2 text-muted-foreground">{t.contract_type}</td>
                  <td className="py-2 text-right num">{Number(t.stake).toFixed(2)}</td>
                  <td className="py-2 text-right num text-muted-foreground">{t.entry_spot != null ? Number(t.entry_spot).toFixed(3) : "—"}</td>
                  <td className="py-2 text-right num text-muted-foreground">{t.exit_spot != null ? Number(t.exit_spot).toFixed(3) : "—"}</td>
                  <td className={`py-2 text-right num font-semibold ${p >= 0 ? "text-bull" : "text-bear"}`}>{p >= 0 ? "+" : ""}{p.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}