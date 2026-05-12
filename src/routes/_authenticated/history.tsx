import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/history")({ component: History });

function History() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("trades").select("*").eq("user_id", user.id).order("opened_at", { ascending: false }).limit(200)
      .then(({ data }) => setTrades(data || []));
  }, [user?.id]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Trade history</h1>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Stake</th>
                <th className="px-4 py-3 text-right">Profit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Account</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No trades yet.</td></tr>
              )}
              {trades.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-2 num text-xs text-muted-foreground">{new Date(t.opened_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{t.symbol}</td>
                  <td className="px-4 py-2">{t.contract_type}</td>
                  <td className="px-4 py-2 num text-right">{Number(t.stake).toFixed(2)}</td>
                  <td className={`px-4 py-2 num text-right ${Number(t.profit) >= 0 ? "bull" : "bear"}`}>
                    {t.profit !== null ? `${Number(t.profit) >= 0 ? "+" : ""}${Number(t.profit).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={t.status === "won" ? "default" : t.status === "lost" ? "destructive" : "secondary"}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{t.loginid}{t.is_virtual ? " (Demo)" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
