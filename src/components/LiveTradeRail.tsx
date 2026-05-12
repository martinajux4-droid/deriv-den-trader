import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useTicks } from "@/hooks/use-ticks";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { Brain, Crosshair, ShieldCheck, Target, Timer, TrendingDown, TrendingUp, Zap, Activity, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

type Trade = {
  id: string;
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

function isCallish(ct: string) {
  return ct.startsWith("CALL") || ["DIGITEVEN", "DIGITOVER", "DIGITMATCH", "DIGITDIFF"].includes(ct);
}
function dirOf(ct: string): "RISE" | "FALL" | "DIGIT" {
  if (ct.startsWith("CALL")) return "RISE";
  if (ct.startsWith("PUT")) return "FALL";
  return "DIGIT";
}
function durToSec(d: number | null, u: string | null): number | null {
  if (!d) return null;
  switch (u) { case "s": return d; case "m": return d * 60; case "h": return d * 3600; case "t": return d * 2; case "d": return d * 86400; default: return d; }
}

export function LiveTradeRail({ running, confidence }: { running: boolean; confidence?: number }) {
  const { user } = useAuth();
  const [trade, setTrade] = useState<Trade | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("trades")
        .select("id,symbol,contract_type,stake,status,profit,entry_spot,exit_spot,duration,duration_unit,opened_at,closed_at,payout")
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false })
        .limit(1);
      if (alive) setTrade((data?.[0] as Trade) ?? null);
    };
    load();
    const ch = supabase
      .channel("live-rail")
      .on("postgres_changes", { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    const i = setInterval(load, 4000);
    return () => { alive = false; clearInterval(i); supabase.removeChannel(ch); };
  }, [user?.id]);

  const live = !!trade && trade.status === "open";
  const ticks = useTicks(live && trade ? trade.symbol : "", 30);
  const currentTickPrice = ticks.length ? ticks[ticks.length - 1].quote : null;
  const currentPrice = live ? currentTickPrice : (trade?.exit_spot ?? trade?.entry_spot ?? null);

  const dir = trade ? dirOf(trade.contract_type) : "DIGIT";
  const isCall = trade ? isCallish(trade.contract_type) : true;
  const entry = trade?.entry_spot ?? null;
  const delta = entry != null && currentPrice != null ? (currentPrice - entry) * (isCall ? 1 : -1) : 0;

  const estPnl = useMemo(() => {
    if (!trade) return 0;
    if (!live) return Number(trade.profit ?? 0);
    if (entry == null || currentPrice == null) return 0;
    if (dir === "DIGIT") return 0;
    const stake = Number(trade.stake) || 1;
    const payout = Number(trade.payout) || stake * 1.85;
    const profitIfWin = payout - stake;
    const norm = Math.max(-1, Math.min(1, delta / Math.max(0.0001, Math.abs(entry) * 0.0008)));
    return norm >= 0 ? norm * profitIfWin : norm * stake;
  }, [trade, live, entry, currentPrice, delta, dir]);

  const animPnl = useAnimatedNumber(estPnl, 400);
  const positive = estPnl >= 0;

  const totalSec = trade ? durToSec(trade.duration, trade.duration_unit) : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!live) return;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [live]);
  const elapsed = trade ? Math.max(0, (now - new Date(trade.opened_at).getTime()) / 1000) : 0;
  const progress = totalSec ? Math.min(100, (elapsed / totalSec) * 100) : (live ? 0 : 100);
  const remaining = totalSec ? Math.max(0, totalSec - elapsed) : 0;

  if (!running && !trade) return null;

  // No trade yet but bot running: show standby rail
  if (!trade) {
    return (
      <div className="relative mt-5 overflow-hidden rounded-2xl border border-border/60 bg-background/30 p-4 backdrop-blur">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Radar className="h-3.5 w-3.5 animate-pulse text-accent" />
          AI scanning · waiting for verified entry
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          No active contract yet. Live rail will appear the moment AI executes a trade.
        </div>
      </div>
    );
  }

  const status = live
    ? (progress < 5 ? "EXECUTING" : progress < 95 ? "OPEN" : "SETTLING")
    : (Number(trade.profit ?? 0) >= 0 ? "PROFIT" : "LOSS");

  const tone = !live
    ? (Number(trade.profit ?? 0) >= 0 ? "bull" : "bear")
    : (estPnl >= 0 ? "bull" : "bear");

  const lossLabel = !positive && live ? "Trade still active · AI managing risk" : null;
  const winLabel = positive && live ? "Profit target approaching" : null;

  return (
    <div className={cn(
      "relative mt-5 overflow-hidden rounded-2xl border bg-background/40 p-4 backdrop-blur",
      tone === "bull" ? "border-bull/30 shadow-[0_0_30px_-12px_oklch(0.74_0.18_150/0.5)]"
                      : "border-bear/30 shadow-[0_0_30px_-12px_oklch(0.65_0.22_25/0.45)]",
    )}>
      {/* ambient scanning */}
      {live && <div className="scan-sweep opacity-20" />}

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Brain className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Live trade rail</div>
            <div className="text-sm font-semibold">{trade.symbol} <span className="text-[11px] font-normal text-muted-foreground">· {trade.contract_type}</span></div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
            status === "OPEN"      && "border-accent/40 bg-accent/10 text-accent",
            status === "EXECUTING" && "border-primary/40 bg-primary/10 text-primary animate-pulse",
            status === "SETTLING"  && "border-warning/40 bg-warning/10 text-warning",
            status === "PROFIT"    && "border-bull/40 bg-bull/10 text-bull",
            status === "LOSS"      && "border-bear/40 bg-bear/10 text-bear",
          )}>
            {live && <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}{status}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
            dir === "RISE"  && "border-bull/40 bg-bull/10 text-bull",
            dir === "FALL"  && "border-bear/40 bg-bear/10 text-bear",
            dir === "DIGIT" && "border-accent/40 bg-accent/10 text-accent",
          )}>
            {dir === "RISE" && <TrendingUp className="h-3 w-3" />}
            {dir === "FALL" && <TrendingDown className="h-3 w-3" />}
            {dir === "DIGIT" && <Zap className="h-3 w-3" />}
            {dir}
          </span>
          {confidence != null && live && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
              <Brain className="h-3 w-3" />AI {Math.round(confidence)}%
            </span>
          )}
        </div>
      </div>

      {/* Live PnL */}
      <div className="relative mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Live profit</div>
          <div className={cn("num text-3xl font-semibold tabular-nums leading-none",
            positive ? "text-bull" : "text-bear")}>
            {positive ? "+" : ""}{animPnl.toFixed(2)} <span className="text-xs text-muted-foreground">{ "USD" }</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {winLabel || lossLabel || (live ? "AI monitoring active" : (Number(trade.profit ?? 0) >= 0 ? "Trade settled · profit" : "Trade settled · loss"))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Timer className="h-3 w-3" />
          {live && totalSec ? <span className="num text-foreground">{remaining.toFixed(0)}s left</span> : <span>—</span>}
        </div>
      </div>

      {/* Entry → Current → Exit */}
      <div className="relative mt-3 grid grid-cols-3 gap-2">
        <Pill label="Entry" value={entry} tone="accent" icon={<Crosshair className="h-3 w-3" />} subtitle={live ? "Verified" : new Date(trade.opened_at).toLocaleTimeString()} />
        <Pill label="Current" value={currentPrice} tone={positive ? "bull" : "bear"} icon={positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              subtitle={entry != null && currentPrice != null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(4)}` : "—"} pulse={live} />
        <Pill label={live ? "Target" : "Exit"} value={live ? null : trade.exit_spot}
              tone={live ? "primary" : (Number(trade.profit ?? 0) >= 0 ? "bull" : "bear")}
              icon={live ? <Target className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
              subtitle={live ? `${dir === "RISE" ? "above" : dir === "FALL" ? "below" : "match"} entry` : (trade.closed_at ? new Date(trade.closed_at).toLocaleTimeString() : "—")}
              dashed={live} />
      </div>

      {/* Progress */}
      <div className="relative mt-3">
        <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-muted-foreground">
          <span>Entry</span>
          <span className="num text-foreground">{progress.toFixed(0)}%</span>
          <span>{live ? "Target" : "Exit"}</span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-background/60">
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out",
              tone === "bull" ? "bg-bull-gradient" : "bg-bear-gradient")}
            style={{ width: `${progress}%` }}
          />
          <span className="absolute inset-y-0 left-0 w-px bg-accent" />
          <span className="absolute inset-y-0 right-0 w-px bg-primary" />
          {live && (
            <span
              className={cn(
                "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background",
                tone === "bull" ? "bg-bull shadow-[0_0_10px_oklch(0.74_0.18_150/0.8)]" : "bg-bear shadow-[0_0_10px_oklch(0.65_0.22_25/0.7)]",
              )}
              style={{ left: `${progress}%` }}
            />
          )}
        </div>
      </div>

      {/* Trust chips */}
      <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
        <Trust icon={<ShieldCheck className="h-3 w-3" />} label="AI Verified Entry" />
        <Trust icon={<Activity className="h-3 w-3" />} label="Live Market Validation" />
        <Trust icon={<Brain className="h-3 w-3" />} label="AI Monitoring Active" />
      </div>
    </div>
  );
}

function Pill({ label, value, tone, icon, subtitle, pulse, dashed }: {
  label: string; value: number | null;
  tone: "accent" | "bull" | "bear" | "primary";
  icon: React.ReactNode; subtitle?: string; pulse?: boolean; dashed?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border bg-background/30 px-2.5 py-2 backdrop-blur",
      dashed && "border-dashed",
      tone === "accent"  && "border-accent/40",
      tone === "bull"    && "border-bull/40",
      tone === "bear"    && "border-bear/40",
      tone === "primary" && "border-primary/40",
    )}>
      <div className={cn("flex items-center gap-1 text-[9px] uppercase tracking-widest",
        tone === "accent"  && "text-accent",
        tone === "bull"    && "text-bull",
        tone === "bear"    && "text-bear",
        tone === "primary" && "text-primary")}>
        {icon}{label}
      </div>
      <div className={cn("num mt-0.5 text-sm font-semibold tabular-nums leading-tight", pulse && "animate-pulse")}>
        {value != null ? Number(value).toFixed(4) : "—"}
      </div>
      {subtitle && <div className="mt-0.5 truncate text-[9px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
      <span className="text-bull">{icon}</span>{label}
    </span>
  );
}
