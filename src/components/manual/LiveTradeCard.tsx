import { Activity } from "lucide-react";

export type LiveTrade = {
  contract_id: number | string;
  contract_type: string;
  stake: number;
  entry_spot: number | null;
  current_spot: number | null;
  exit_spot: number | null;
  profit: number | null;
  status: "open" | "won" | "lost" | "even";
};

export function LiveTradeCard({ trade }: { trade: LiveTrade | null }) {
  if (!trade) return null;
  const profit = Number(trade.profit ?? 0);
  const positive = profit > 0;
  const negative = profit < 0;
  return (
    <div className="glass-card relative overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-bull/15 text-bull">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live trade</div>
            <div className="text-sm font-semibold">{trade.contract_type} · ${Number(trade.stake).toFixed(2)}</div>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          trade.status === "open" ? "bg-accent/20 text-accent animate-pulse" :
          trade.status === "won" ? "bg-bull/20 text-bull" :
          trade.status === "lost" ? "bg-bear/20 text-bear" : "bg-muted text-muted-foreground"
        }`}>{trade.status}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <Cell label="ENTRY" value={trade.entry_spot} />
        <Cell label="CURRENT" value={trade.current_spot} highlight />
        <Cell label="EXIT" value={trade.exit_spot} />
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">PROFIT</div>
          <div className={`num text-sm font-bold ${positive ? "text-bull" : negative ? "text-bear" : "text-muted-foreground"}`}>
            {trade.profit == null ? "—" : `${positive ? "+" : ""}${profit.toFixed(2)}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, highlight }: { label: string; value: number | null; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-2 py-2 ${highlight ? "border-bull/40 bg-bull/5" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="num text-sm font-semibold">{value == null ? "—" : Number(value).toFixed(3)}</div>
    </div>
  );
}