import { useEffect, useRef, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Target, DollarSign, Pause, Play } from "lucide-react";
import { useDeriv } from "@/hooks/use-deriv";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type LiveTradeInfo = {
  contract_id: number;
  contract_type: string;
  stake: number;
  symbol: string;
  currency: string;
} | null;

type Snap = {
  entry: number | null;
  current: number | null;
  exit: number | null;
  profit: number;
  bid: number | null;
  isExpired: boolean;
  isSold: boolean;
  ticksRemaining?: number | null;
  barrier?: string | null;
};

export function LiveTradeTicker({
  trade, onClear, paused, onPause, onResume,
}: {
  trade: LiveTradeInfo;
  onClear: () => void;
  paused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
}) {
  const { client } = useDeriv();
  const [selling, setSelling] = useState(false);
  const autoSoldRef = useRef(false);
  const [snap, setSnap] = useState<Snap>({
    entry: null, current: null, exit: null, profit: 0, bid: null,
    isExpired: false, isSold: false, ticksRemaining: null, barrier: null,
  });

  useEffect(() => {
    if (!trade || !client) return;
    setSnap({ entry: null, current: null, exit: null, profit: 0, bid: null, isExpired: false, isSold: false, ticksRemaining: null, barrier: null });
    autoSoldRef.current = false;

    let stopped = false;
    let subId: string | undefined;

    const off = client.on("proposal_open_contract", (msg: any) => {
      const c = msg.proposal_open_contract;
      if (!c || c.contract_id !== trade.contract_id) return;
      subId = msg.subscription?.id || subId;
      if (stopped) return;
      const ticksPassed = Number(c.tick_passed ?? 0);
      setSnap({
        entry: c.entry_spot != null ? Number(c.entry_spot) : null,
        current: c.current_spot != null ? Number(c.current_spot) : null,
        exit: c.exit_tick != null ? Number(c.exit_tick) : null,
        profit: Number(c.profit ?? 0),
        bid: c.bid_price != null ? Number(c.bid_price) : null,
        isExpired: !!c.is_expired,
        isSold: !!c.is_sold,
        ticksRemaining: c.tick_count != null && c.tick_passed != null
          ? Math.max(0, Number(c.tick_count) - Number(c.tick_passed))
          : null,
        barrier: c.barrier ?? null,
      });
      // Auto-sell after the first tick has passed
      if (
        !autoSoldRef.current &&
        !c.is_sold &&
        c.is_valid_to_sell &&
        ticksPassed >= 1
      ) {
        autoSoldRef.current = true;
        const price = c.bid_price != null ? Number(c.bid_price) : 0;
        client
          .send({ sell: trade.contract_id, price })
          .then(() => {
            toast.success(
              `Auto-sold after 1 tick · ${Number(c.profit ?? 0) >= 0 ? "+" : ""}${Number(c.profit ?? 0).toFixed(2)} ${trade.currency}`
            );
          })
          .catch((e: any) => {
            autoSoldRef.current = false;
            console.warn("[auto-sell]", e?.error?.message || e);
          });
      }
      if (c.is_sold) {
        setTimeout(() => { if (!stopped) onClear(); }, 1200);
      }
    });

    client.send({ proposal_open_contract: 1, contract_id: trade.contract_id, subscribe: 1 }).catch(() => {});

    return () => {
      stopped = true;
      off();
      if (subId) client.send({ forget: subId }).catch(() => {});
    };
  }, [trade?.contract_id, client]);

  if (!trade) return null;

  const won = snap.profit > 0;
  const dir = trade.contract_type.toUpperCase();
  const isCall = dir.includes("CALL") || dir.includes("RISE");
  const isPut = dir.includes("PUT") || dir.includes("FALL");
  const delta = snap.entry != null && snap.current != null ? snap.current - snap.entry : 0;
  const movingFavor =
    isCall ? delta > 0 :
    isPut  ? delta < 0 :
    snap.profit > 0;

  const sellNow = async () => {
    if (!client || snap.isSold || selling) return;
    setSelling(true);
    try {
      const price = snap.bid != null ? Math.max(0, snap.bid) : 0;
      await client.send({ sell: trade.contract_id, price });
      toast.success(`Take profit · selling at ${snap.profit >= 0 ? "+" : ""}${snap.profit.toFixed(2)} ${trade.currency}`);
    } catch (e: any) {
      toast.error(e?.error?.message || "Could not sell contract");
    } finally {
      setSelling(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/5 via-card/80 to-accent/5 p-4 shadow-[0_0_30px_-12px_oklch(0.82_0.15_85/0.55)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border",
            snap.isSold
              ? (won ? "border-bull/50 bg-bull/10 text-bull" : "border-bear/50 bg-bear/10 text-bear")
              : "border-primary/40 bg-primary/10 text-primary animate-pulse"
          )}>
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Live trade</div>
            <div className="text-sm font-semibold">
              {dir} · {trade.symbol} · #{trade.contract_id}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            "num text-xl font-extrabold tabular-nums",
            snap.profit > 0 ? "text-bull" : snap.profit < 0 ? "text-bear" : "text-foreground"
          )}>
            {snap.profit >= 0 ? "+" : ""}{snap.profit.toFixed(2)} {trade.currency}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {snap.isSold ? "Settled" : snap.ticksRemaining != null ? `${snap.ticksRemaining} ticks left` : "Live…"}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Cell
          label="Entry spot"
          value={snap.entry != null ? snap.entry.toFixed(4) : "—"}
          icon={<Target className="h-3 w-3" />}
        />
        <Cell
          label="Live spot"
          value={snap.current != null ? snap.current.toFixed(4) : "—"}
          icon={movingFavor
            ? <ArrowUpRight className="h-3 w-3 text-bull" />
            : <ArrowDownRight className="h-3 w-3 text-bear" />}
          tone={movingFavor ? "bull" : "bear"}
        />
        <Cell
          label={snap.isSold ? "Exit spot" : "Projected exit"}
          value={snap.exit != null ? snap.exit.toFixed(4) : snap.current != null ? snap.current.toFixed(4) : "—"}
          icon={<Target className="h-3 w-3" />}
          tone={snap.isSold ? (won ? "bull" : "bear") : undefined}
        />
      </div>

      {snap.barrier && (
        <div className="mt-2 text-center text-[10px] text-muted-foreground">
          Barrier: <span className="num font-semibold text-foreground">{snap.barrier}</span>
        </div>
      )}

      {/* Quick controls */}
      {!snap.isSold && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={sellNow}
            disabled={selling}
            className={cn(
              "h-9 text-xs font-semibold",
              snap.profit >= 0
                ? "bg-bull text-bull-foreground hover:bg-bull/90"
                : "bg-warning text-warning-foreground hover:bg-warning/90"
            )}
          >
            <DollarSign className="mr-1 h-3.5 w-3.5" />
            {selling ? "Selling…" : `Take profit now (${snap.profit >= 0 ? "+" : ""}${snap.profit.toFixed(2)})`}
          </Button>
          {paused ? (
            <Button size="sm" variant="secondary" onClick={onResume} className="h-9 text-xs">
              <Play className="mr-1 h-3.5 w-3.5" /> Resume bot
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onPause} className="h-9 text-xs">
              <Pause className="mr-1 h-3.5 w-3.5" /> Pause bot
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, icon, tone }: { label: string; value: string; icon?: React.ReactNode; tone?: "bull" | "bear" }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-2 py-2">
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className={cn(
        "num mt-0.5 text-sm font-bold tabular-nums",
        tone === "bull" && "text-bull",
        tone === "bear" && "text-bear",
      )}>
        {value}
      </div>
    </div>
  );
}