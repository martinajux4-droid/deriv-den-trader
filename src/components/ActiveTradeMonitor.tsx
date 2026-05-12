import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useTicks } from "@/hooks/use-ticks";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { Activity, ArrowDownRight, ArrowUpRight, Brain, Crosshair, Flame, Target, Timer, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Trade = {
  id: string;
  contract_id: string | null;
  symbol: string;
  contract_type: string;
  stake: number;
  status: string;
  profit: number | null;
  entry_spot: number | null;
  exit_spot: number | null;
  duration: number | null;
  duration_unit: string | null;
  opened_at: string;
  closed_at: string | null;
  payout: number | null;
};

const RISE_TYPES = new Set(["CALL", "CALLE", "DIGITEVEN", "DIGITOVER", "DIGITDIFF", "DIGITMATCH"]);

function isCallish(ct: string) {
  return ct.startsWith("CALL") || ["DIGITEVEN", "DIGITOVER", "DIGITMATCH", "DIGITDIFF"].includes(ct);
}

function directionLabel(ct: string): "RISE" | "FALL" | "DIGIT" {
  if (ct.startsWith("CALL")) return "RISE";
  if (ct.startsWith("PUT")) return "FALL";
  return "DIGIT";
}

function statusBadge(status: string, profit: number | null) {
  if (status === "open") return { label: "OPEN", tone: "accent" as const };
  if (status === "won" || (profit ?? 0) > 0) return { label: "PROFIT", tone: "bull" as const };
  if (status === "lost" || (profit ?? 0) < 0) return { label: "LOSS", tone: "bear" as const };
  return { label: "EXITED", tone: "muted" as const };
}

function durationToSeconds(d: number | null, u: string | null): number | null {
  if (!d) return null;
  switch (u) {
    case "s": return d;
    case "m": return d * 60;
    case "h": return d * 3600;
    case "t": return d * 2; // approx tick = ~2s
    case "d": return d * 86400;
    default: return d;
  }
}

export function ActiveTradeMonitor() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("trades")
        .select("id,contract_id,symbol,contract_type,stake,status,profit,entry_spot,exit_spot,duration,duration_unit,opened_at,closed_at,payout")
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false })
        .limit(12);
      if (alive && data) setTrades(data as Trade[]);
    };
    load();
    const channel = supabase
      .channel("trade-monitor-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    const i = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(i);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const open = useMemo(() => trades.filter((t) => t.status === "open"), [trades]);
  const featured = open[0] ?? trades[0];
  const closed = useMemo(() => trades.filter((t) => t.status !== "open").slice(0, 6), [trades]);

  return (
    <div className="card-premium space-y-4 overflow-hidden p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
            <Crosshair className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold tracking-tight">Active Trade Monitor</div>
            <div className="text-[11px] text-muted-foreground">
              Entry · current · exit · live profit
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", open.length ? "bg-bull" : "bg-muted-foreground")} />
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", open.length ? "bg-bull" : "bg-muted-foreground")} />
          </span>
          {open.length} live · {trades.length} total
        </div>
      </div>

      {/* Featured trade */}
      {featured ? (
        <FeaturedTrade trade={featured} live={featured.status === "open"} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 bg-background/30 p-8 text-center">
          <Activity className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
          <div className="text-sm font-medium">No trades yet</div>
          <div className="text-[11px] text-muted-foreground">Start the AI bot to see live entry &amp; exit tracking.</div>
        </div>
      )}

      {/* Trade table */}
      {trades.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-background/30">
          <div className="border-b border-border/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Recent contracts
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground/80">
                <tr className="text-left">
                  <th className="px-3 py-2">Market</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Dir</th>
                  <th className="px-3 py-2 text-right">Entry</th>
                  <th className="px-3 py-2 text-right">Exit</th>
                  <th className="px-3 py-2 text-right">Stake</th>
                  <th className="px-3 py-2 text-right">P/L</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {trades.map((t) => {
                  const dir = directionLabel(t.contract_type);
                  const badge = statusBadge(t.status, t.profit);
                  const profit = t.profit;
                  return (
                    <tr key={t.id} className={cn("hover:bg-card/40", t.status === "open" && "bg-accent/5")}>
                      <td className="px-3 py-2 font-medium">{t.symbol}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.contract_type}</td>
                      <td className="px-3 py-2">
                        <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold",
                          dir === "RISE" && "text-bull",
                          dir === "FALL" && "text-bear",
                          dir === "DIGIT" && "text-accent")}>
                          {dir === "RISE" && <ArrowUpRight className="h-3 w-3" />}
                          {dir === "FALL" && <ArrowDownRight className="h-3 w-3" />}
                          {dir === "DIGIT" && <Zap className="h-3 w-3" />}
                          {dir}
                        </span>
                      </td>
                      <td className="num px-3 py-2 text-right">{t.entry_spot != null ? Number(t.entry_spot).toFixed(4) : "—"}</td>
                      <td className="num px-3 py-2 text-right">{t.exit_spot != null ? Number(t.exit_spot).toFixed(4) : "—"}</td>
                      <td className="num px-3 py-2 text-right">{Number(t.stake).toFixed(2)}</td>
                      <td className={cn("num px-3 py-2 text-right font-semibold",
                        profit == null ? "text-muted-foreground" : profit >= 0 ? "text-bull" : "text-bear")}>
                        {profit == null ? "—" : `${profit >= 0 ? "+" : ""}${Number(profit).toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          badge.tone === "accent" && "border-accent/40 bg-accent/10 text-accent shadow-[0_0_12px_-2px_oklch(0.62_0.18_250/0.4)]",
                          badge.tone === "bull"   && "border-bull/40 bg-bull/10 text-bull shadow-[0_0_12px_-2px_oklch(0.74_0.18_150/0.4)]",
                          badge.tone === "bear"   && "border-bear/40 bg-bear/10 text-bear shadow-[0_0_12px_-2px_oklch(0.65_0.22_25/0.4)]",
                          badge.tone === "muted"  && "border-border/60 bg-muted/40 text-muted-foreground",
                        )}>{badge.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Recent closed strip */}
          {closed.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border/60 px-3 py-2">
              <span className="mr-1 flex-none text-[10px] uppercase tracking-widest text-muted-foreground">History</span>
              {closed.map((t) => {
                const p = Number(t.profit ?? 0);
                return (
                  <span key={t.id} className={cn(
                    "num inline-flex flex-none items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                    p >= 0 ? "border-bull/40 bg-bull/10 text-bull" : "border-bear/40 bg-bear/10 text-bear",
                  )}>
                    {p >= 0 ? "+" : ""}{p.toFixed(2)}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeaturedTrade({ trade, live }: { trade: Trade; live: boolean }) {
  const ticks = useTicks(live ? trade.symbol : "", 30);
  const currentTickPrice = ticks.length ? ticks[ticks.length - 1].quote : null;
  const currentPrice = live ? currentTickPrice : (trade.exit_spot ?? trade.entry_spot ?? null);

  const dir = directionLabel(trade.contract_type);
  const isCall = isCallish(trade.contract_type);

  // Live "delta" toward win: positive number when moving in our favor
  const entry = trade.entry_spot;
  const delta = entry != null && currentPrice != null ? (currentPrice - entry) * (isCall ? 1 : -1) : 0;

  // Estimated live PnL (open) — based on direction of price move + stake
  const estimatedLivePnl = (() => {
    if (!live) return Number(trade.profit ?? 0);
    if (entry == null || currentPrice == null) return 0;
    // For digit contracts we can't infer; show 0 until settle
    if (dir === "DIGIT") return 0;
    const stake = Number(trade.stake) || 1;
    const payout = Number(trade.payout) || stake * 1.85;
    const profitIfWin = payout - stake;
    // Map normalized progress to win/loss probability swing
    const norm = Math.max(-1, Math.min(1, delta / Math.max(0.0001, Math.abs(entry) * 0.0008)));
    return norm >= 0 ? norm * profitIfWin : norm * stake;
  })();

  const animPnl = useAnimatedNumber(estimatedLivePnl, 400);
  const positive = estimatedLivePnl >= 0;

  // Countdown
  const totalSec = durationToSeconds(trade.duration, trade.duration_unit);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!live) return;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [live]);
  const elapsedSec = Math.max(0, (now - new Date(trade.opened_at).getTime()) / 1000);
  const progress = totalSec ? Math.min(100, (elapsedSec / totalSec) * 100) : (live ? 0 : 100);
  const remaining = totalSec ? Math.max(0, totalSec - elapsedSec) : 0;

  // Status text
  const status = live
    ? (progress < 5 ? "EXECUTING" : progress < 95 ? "OPEN" : "SETTLING")
    : (Number(trade.profit ?? 0) >= 0 ? "PROFIT" : "LOSS");

  const tone = !live
    ? (Number(trade.profit ?? 0) >= 0 ? "bull" : "bear")
    : (estimatedLivePnl >= 0 ? "bull" : "bear");

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border bg-gradient-to-br from-background/60 to-background/20 p-4 backdrop-blur",
      tone === "bull"
        ? "border-bull/40 shadow-[0_0_40px_-12px_oklch(0.74_0.18_150/0.55)]"
        : "border-bear/40 shadow-[0_0_40px_-12px_oklch(0.65_0.22_25/0.55)]",
    )}>
      {/* ambient glow */}
      <div className={cn(
        "pointer-events-none absolute -inset-px opacity-30 blur-2xl",
        tone === "bull" ? "bg-[radial-gradient(40%_60%_at_30%_20%,oklch(0.74_0.18_150/0.3),transparent)]"
                        : "bg-[radial-gradient(40%_60%_at_30%_20%,oklch(0.65_0.22_25/0.3),transparent)]",
      )} />

      {/* Header row */}
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Active Trade</div>
            <div className="flex items-center gap-2 text-base font-semibold">
              {trade.symbol}
              <span className="text-[11px] font-normal text-muted-foreground">· {trade.contract_type}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
            status === "OPEN"      && "border-accent/40 bg-accent/10 text-accent shadow-[0_0_18px_-4px_oklch(0.62_0.18_250/0.6)]",
            status === "EXECUTING" && "border-primary/40 bg-primary/10 text-primary shadow-[0_0_18px_-4px_oklch(0.82_0.15_85/0.6)] animate-pulse",
            status === "SETTLING"  && "border-warning/40 bg-warning/10 text-warning",
            status === "PROFIT"    && "border-bull/40 bg-bull/10 text-bull shadow-[0_0_18px_-4px_oklch(0.74_0.18_150/0.6)]",
            status === "LOSS"      && "border-bear/40 bg-bear/10 text-bear shadow-[0_0_18px_-4px_oklch(0.65_0.22_25/0.6)]",
          )}>
            {live && <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
            {status}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
            dir === "RISE"  && "border-bull/40 bg-bull/10 text-bull",
            dir === "FALL"  && "border-bear/40 bg-bear/10 text-bear",
            dir === "DIGIT" && "border-accent/40 bg-accent/10 text-accent",
          )}>
            {dir === "RISE"  && <TrendingUp className="h-3 w-3" />}
            {dir === "FALL"  && <TrendingDown className="h-3 w-3" />}
            {dir === "DIGIT" && <Zap className="h-3 w-3" />}
            {dir}
          </span>
        </div>
      </div>

      {/* Live PnL */}
      <div className="relative mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Live profit</div>
          <div className={cn("num text-3xl font-bold tabular-nums leading-none",
            positive ? "text-bull" : "text-bear")}>
            {positive ? "+" : ""}{animPnl.toFixed(2)}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Stake <span className="num text-foreground">{Number(trade.stake).toFixed(2)}</span>
            {trade.payout ? <> · Payout <span className="num text-foreground">{Number(trade.payout).toFixed(2)}</span></> : null}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Timer className="h-3 w-3" />
          {live && totalSec ? <span className="num text-foreground">{remaining.toFixed(0)}s left</span> : <span>—</span>}
        </div>
      </div>

      {/* Entry → Current → Exit rail */}
      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <PricePill
          label="Entry"
          value={entry}
          tone="accent"
          icon={<Crosshair className="h-3 w-3" />}
          subtitle={live ? "Confirmed" : new Date(trade.opened_at).toLocaleTimeString()}
          glow
        />
        <PricePill
          label="Current"
          value={currentPrice}
          tone={positive ? "bull" : "bear"}
          icon={positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          subtitle={entry != null && currentPrice != null
            ? `${delta >= 0 ? "+" : ""}${(delta).toFixed(4)}`
            : "—"}
          pulse={live}
        />
        <PricePill
          label={live ? "Target" : "Exit"}
          value={live ? null : trade.exit_spot}
          tone={live ? "primary" : (Number(trade.profit ?? 0) >= 0 ? "bull" : "bear")}
          icon={live ? <Target className="h-3 w-3" /> : <Flame className="h-3 w-3" />}
          subtitle={live ? `${dir === "RISE" ? "above" : dir === "FALL" ? "below" : "match"} entry` : (trade.closed_at ? new Date(trade.closed_at).toLocaleTimeString() : "—")}
          dashed={live}
        />
      </div>

      {/* Progress bar */}
      <div className="relative mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Trade progress</span>
          <span className="num text-foreground">{progress.toFixed(0)}%</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-background/60">
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out",
              tone === "bull" ? "bg-bull-gradient" : "bg-bear-gradient")}
            style={{ width: `${progress}%` }}
          />
          {/* Entry marker */}
          <span className="absolute inset-y-0 left-0 w-px bg-accent" />
          {/* Exit marker */}
          <span className="absolute inset-y-0 right-0 w-px bg-primary" />
          {/* Live cursor */}
          {live && (
            <span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-primary shadow-[0_0_12px_oklch(0.82_0.15_85/0.8)]"
              style={{ left: `${progress}%` }}
            />
          )}
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-muted-foreground">
          <span>Entry</span>
          <span className="text-primary">{live ? "Live" : "Settled"}</span>
          <span>{live ? "Exit target" : "Exit"}</span>
        </div>
      </div>
    </div>
  );
}

function PricePill({
  label, value, tone, icon, subtitle, glow, pulse, dashed,
}: {
  label: string;
  value: number | null;
  tone: "accent" | "bull" | "bear" | "primary";
  icon: React.ReactNode;
  subtitle?: string;
  glow?: boolean;
  pulse?: boolean;
  dashed?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border bg-background/40 px-3 py-2.5 backdrop-blur",
      dashed ? "border-dashed" : "",
      tone === "accent"  && "border-accent/40",
      tone === "bull"    && "border-bull/40",
      tone === "bear"    && "border-bear/40",
      tone === "primary" && "border-primary/40",
      glow && "shadow-[0_0_18px_-6px_oklch(0.62_0.18_250/0.55)]",
    )}>
      <div className={cn("flex items-center gap-1 text-[9px] uppercase tracking-widest",
        tone === "accent"  && "text-accent",
        tone === "bull"    && "text-bull",
        tone === "bear"    && "text-bear",
        tone === "primary" && "text-primary")}>
        {icon}{label}
      </div>
      <div className={cn("num mt-0.5 text-base font-semibold tabular-nums leading-tight", pulse && "animate-pulse")}>
        {value != null ? Number(value).toFixed(4) : "—"}
      </div>
      {subtitle && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}