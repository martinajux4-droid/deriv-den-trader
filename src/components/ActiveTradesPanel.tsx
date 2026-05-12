import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type Trade = {
  id: string;
  contract_id: string | null;
  symbol: string;
  contract_type: string;
  stake: number;
  status: string;
  profit: number | null;
  opened_at: string;
  closed_at: string | null;
};

export function ActiveTradesPanel() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("trades")
        .select("id,contract_id,symbol,contract_type,stake,status,profit,opened_at,closed_at")
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false })
        .limit(8);
      if (alive && data) setTrades(data as Trade[]);
    };
    load();
    const channel = supabase
      .channel("trades-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    const i = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(i);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-bull/15 text-bull">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Active Trades</div>
            <div className="text-[11px] text-muted-foreground">Last 8 contracts · auto-syncs</div>
          </div>
        </div>
      </div>
      {trades.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
          No trades yet. Start the bot or open a manual trade.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5 pr-2">Market</th>
                <th className="py-1.5 pr-2">Type</th>
                <th className="py-1.5 pr-2 text-right">Stake</th>
                <th className="py-1.5 pr-2 text-right">P&L</th>
                <th className="py-1.5 pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {trades.map((t) => (
                <tr key={t.id} className="hover:bg-card/40">
                  <td className="py-2 pr-2 font-medium">{t.symbol}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{t.contract_type}</td>
                  <td className="num py-2 pr-2 text-right">{Number(t.stake).toFixed(2)}</td>
                  <td
                    className={cn(
                      "num py-2 pr-2 text-right",
                      t.profit == null ? "text-muted-foreground" : t.profit >= 0 ? "bull" : "bear"
                    )}
                  >
                    {t.profit == null ? "—" : `${t.profit >= 0 ? "+" : ""}${Number(t.profit).toFixed(2)}`}
                  </td>
                  <td className="py-2 pr-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                        t.status === "open" && "bg-accent/15 text-accent",
                        t.status === "won" && "bg-bull/15 text-bull",
                        t.status === "lost" && "bg-bear/15 text-bear",
                        t.status === "even" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
