import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownRight, ArrowUpRight, History, Trash2, Zap, ShieldCheck, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Trade = {
  id: string;
  symbol: string;
  contract_type: string;
  stake: number;
  status: string;
  profit: number | null;
  entry_spot: number | null;
  exit_spot: number | null;
  opened_at: string;
  closed_at: string | null;
};

function dirOf(ct: string): "RISE" | "FALL" | "DIGIT" {
  if (ct.startsWith("CALL")) return "RISE";
  if (ct.startsWith("PUT")) return "FALL";
  return "DIGIT";
}

function strategyOf(ct: string): string {
  if (ct.startsWith("CALL") || ct.startsWith("PUT")) return "Rise/Fall";
  if (ct === "DIGITEVEN" || ct === "DIGITODD") return "Even/Odd";
  if (ct === "DIGITOVER" || ct === "DIGITUNDER") return "Over/Under";
  if (ct === "DIGITMATCH" || ct === "DIGITDIFF") return "Matches/Differs";
  return "AI";
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ActiveTradeMonitor() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [clearing, setClearing] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("trades")
      .select("id,symbol,contract_type,stake,status,profit,entry_spot,exit_spot,opened_at,closed_at")
      .eq("user_id", user.id)
      .order("opened_at", { ascending: false })
      .limit(20);
    setTrades((data as Trade[]) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("recent-contracts")
      .on("postgres_changes", { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    const i = setInterval(load, 5000);
    return () => { clearInterval(i); supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const open = useMemo(() => trades.filter(t => t.status === "open").length, [trades]);

  const clearHistory = async () => {
    if (!user) return;
    setClearing(true);
    const { error } = await supabase.from("trades").delete().eq("user_id", user.id).neq("status", "open");
    setClearing(false);
    if (error) { toast.error("Couldn't clear history"); return; }
    toast.success("Recent contracts cleared");
    load();
  };

  return (
    <div className="card-premium space-y-3 overflow-hidden p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
            <History className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold tracking-tight">Recent Contracts</div>
            <div className="text-[11px] text-muted-foreground">
              {trades.length} total · {open} live
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 rounded-full border border-bull/30 bg-bull/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-bull sm:inline-flex">
            <ShieldCheck className="h-3 w-3" /> Risk Protected
          </span>
          <span className="hidden items-center gap-1 rounded-full border border-primary/30 bg-primary/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary sm:inline-flex">
            <Activity className="h-3 w-3" /> Safe Entry
          </span>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={trades.length === 0 || clearing}
                className="h-8 gap-1.5 border-border/60 bg-background/40 px-2.5 text-[11px] backdrop-blur hover:border-bear/50 hover:bg-bear/10 hover:text-bear"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all recent contract history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes settled trades from your history. Open trades will not be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearHistory}
                  className="bg-bear text-bear-foreground hover:bg-bear/90"
                >
                  Clear History
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Table */}
      {trades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-background/30 p-8 text-center">
          <div className="text-sm font-medium">No contracts yet</div>
          <div className="text-[11px] text-muted-foreground">Trades executed by the AI will appear here.</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/30">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground/80">
                <tr className="text-left">
                  <th className="px-3 py-2">Market</th>
                  <th className="px-3 py-2">Strategy</th>
                  <th className="px-3 py-2 text-right">Entry</th>
                  <th className="px-3 py-2 text-right">Exit</th>
                  <th className="px-3 py-2 text-right">P/L</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {trades.map((t) => {
                  const dir = dirOf(t.contract_type);
                  const profit = t.profit;
                  const won = (profit ?? 0) > 0;
                  const lost = (profit ?? 0) < 0;
                  const isOpen = t.status === "open";
                  return (
                    <tr key={t.id} className={cn("transition-colors hover:bg-card/40", isOpen && "bg-accent/5")}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className={cn(
                            "inline-flex h-4 w-4 items-center justify-center rounded-full",
                            dir === "RISE"  && "bg-bull/15 text-bull",
                            dir === "FALL"  && "bg-bear/15 text-bear",
                            dir === "DIGIT" && "bg-accent/15 text-accent",
                          )}>
                            {dir === "RISE"  && <ArrowUpRight className="h-3 w-3" />}
                            {dir === "FALL"  && <ArrowDownRight className="h-3 w-3" />}
                            {dir === "DIGIT" && <Zap className="h-3 w-3" />}
                          </span>
                          {t.symbol}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{strategyOf(t.contract_type)}</td>
                      <td className="num px-3 py-2 text-right tabular-nums">{t.entry_spot != null ? Number(t.entry_spot).toFixed(4) : "—"}</td>
                      <td className="num px-3 py-2 text-right tabular-nums">{t.exit_spot != null ? Number(t.exit_spot).toFixed(4) : "—"}</td>
                      <td className={cn("num px-3 py-2 text-right font-semibold tabular-nums",
                        profit == null ? "text-muted-foreground" : won ? "text-bull" : "text-bear")}>
                        {profit == null ? "—" : `${profit >= 0 ? "+" : ""}${Number(profit).toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                          isOpen && "border-accent/40 bg-accent/10 text-accent",
                          !isOpen && won && "border-bull/40 bg-bull/10 text-bull",
                          !isOpen && lost && "border-bear/40 bg-bear/10 text-bear",
                          !isOpen && !won && !lost && "border-border/60 bg-muted/40 text-muted-foreground",
                        )}>
                          {isOpen ? "Open" : won ? "Win" : lost ? "Loss" : "Even"}
                        </span>
                      </td>
                      <td className="num px-3 py-2 text-right text-muted-foreground tabular-nums">{fmtTime(t.closed_at || t.opened_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
