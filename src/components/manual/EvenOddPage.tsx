import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft, Play, Pause, Square, Zap, User, Wifi, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { supabase } from "@/integrations/supabase/client";
import { useTicks } from "@/hooks/use-ticks";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { DERIV_SYMBOLS } from "@/lib/deriv-symbols";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const GREEN = "oklch(0.78 0.2 145)";
const GREEN_SOFT = "oklch(0.78 0.2 145 / 0.18)";
const CYAN = "oklch(0.82 0.16 200)";
const RED = "oklch(0.7 0.18 25)";
const RED_SOFT = "oklch(0.7 0.18 25 / 0.18)";
const SLATE = "oklch(0.55 0.04 240)";

function lastDigit(q: number) {
  return Number(String(q.toFixed(5)).replace(".", "").slice(-1));
}

type Cfg = {
  stake: number; takeProfit: number; maxLoss: number;
  martingale: number; ticks: number; autoTrade: boolean;
};

export function EvenOddPage() {
  const { user } = useAuth();
  const { client, active, accounts, balance, profile, setActive } = useDeriv();
  const [symbol, setSymbol] = useState<string>(profile?.default_symbol || "R_100");
  const ticks = useTicks(symbol, 100);

  // direction: 0 EVEN, 1 ODD
  const [direction, setDirection] = useState<0 | 1>(0);

  const cfgKey = "manual:even-odd:cfg-compact";
  const [cfg, setCfg] = useState<Cfg>(() => {
    if (typeof window !== "undefined") {
      try { const r = localStorage.getItem(cfgKey); if (r) return JSON.parse(r); } catch {}
    }
    return { stake: 1, takeProfit: 10, maxLoss: 5, martingale: 2, ticks: 5, autoTrade: true };
  });
  useEffect(() => { try { localStorage.setItem(cfgKey, JSON.stringify(cfg)); } catch {} }, [cfg]);

  // trading loop
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionPnl, setSessionPnl] = useState(0);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const stakeRef = useRef(cfg.stake);
  const pnlRef = useRef(0);

  const placeOnce = async (auto = false, dirOverride?: 0 | 1): Promise<number | null> => {
    if (!client || !active || !user) { toast.error("Connect a Deriv account in Settings"); return null; }
    const dir = dirOverride ?? direction;
    const contract = dir === 0 ? "DIGITEVEN" : "DIGITODD";
    const amount = auto ? stakeRef.current : cfg.stake;
    setBusy(true);
    try {
      const proposal = await client.getProposal({
        contract_type: contract, symbol, amount,
        duration: cfg.ticks, duration_unit: "t",
        currency: balance?.currency || "USD",
      });
      const buy = await client.buyContract(proposal.id, proposal.ask_price);
      const { data: trade } = await supabase.from("trades").insert({
        user_id: user.id, contract_id: String(buy.contract_id), symbol,
        contract_type: contract, stake: amount, payout: buy.payout,
        duration: cfg.ticks, duration_unit: "t",
        is_virtual: active.is_virtual, loginid: active.loginid, status: "open",
      }).select().single();
      const settled = await client.waitForContract(buy.contract_id);
      const profit = Number(settled.profit ?? 0);
      if (trade) {
        await supabase.from("trades").update({
          profit, payout: settled.payout,
          entry_spot: settled.entry_spot, exit_spot: settled.exit_spot,
          status: profit > 0 ? "won" : profit < 0 ? "lost" : "even",
          closed_at: new Date().toISOString(), raw: settled,
        }).eq("id", trade.id);
      }
      toast[profit >= 0 ? "success" : "error"](`${profit >= 0 ? "+" : ""}${profit.toFixed(2)} ${balance?.currency || ""}`);
      return profit;
    } catch (e: any) {
      toast.error(e.message || e.error?.message || "Trade failed");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const startLoop = async () => {
    if (runningRef.current) return;
    runningRef.current = true; setRunning(true);
    pnlRef.current = 0; setSessionPnl(0);
    stakeRef.current = cfg.stake;
    while (runningRef.current) {
      while (pausedRef.current && runningRef.current) await new Promise((r) => setTimeout(r, 250));
      if (!runningRef.current) break;
      const profit = await placeOnce(true);
      if (profit == null) break;
      pnlRef.current += profit; setSessionPnl(pnlRef.current);
      if (cfg.takeProfit > 0 && pnlRef.current >= cfg.takeProfit) { toast.success(`Take profit hit: +${pnlRef.current.toFixed(2)}`); break; }
      if (cfg.maxLoss > 0 && pnlRef.current <= -Math.abs(cfg.maxLoss)) { toast.error(`Max loss hit: ${pnlRef.current.toFixed(2)}`); break; }
      stakeRef.current = profit < 0 && cfg.martingale > 1
        ? Math.max(0.35, +(stakeRef.current * cfg.martingale).toFixed(2))
        : cfg.stake;
    }
    runningRef.current = false; setRunning(false);
  };
  const stopLoop = () => { runningRef.current = false; pausedRef.current = false; setPaused(false); setRunning(false); };
  const pauseLoop = () => { pausedRef.current = true; setPaused(true); };
  const resumeLoop = () => { pausedRef.current = false; setPaused(false); };
  useEffect(() => () => { runningRef.current = false; }, []);

  // analytics
  const digits = useMemo(() => ticks.map((t) => lastDigit(t.quote)), [ticks]);
  const total = digits.length || 1;
  const evenCount = digits.filter((d) => d % 2 === 0).length;
  const evenPct = (evenCount / total) * 100;
  const oddPct = 100 - evenPct;
  const evenA = useAnimatedNumber(evenPct, 380);
  const oddA = useAnimatedNumber(oddPct, 380);
  const dominant: "EVEN" | "ODD" = evenPct >= oddPct ? "EVEN" : "ODD";
  const edge = Math.abs(evenPct - oddPct);
  // signed pressure: +100 fully EVEN, -100 fully ODD
  const pressure = evenPct - oddPct;
  const pressureA = useAnimatedNumber(pressure, 420);
  // short-term momentum from last N digits
  const momentumWin = 20;
  const recentForMomentum = digits.slice(-momentumWin);
  const recentEvens = recentForMomentum.filter((d) => d % 2 === 0).length;
  const momentum = recentForMomentum.length
    ? ((recentEvens / recentForMomentum.length) * 100 - 50) * 2
    : 0;
  const momentumA = useAnimatedNumber(momentum, 320);
  let streak = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    const isEven = digits[i] % 2 === 0;
    if (isEven === (dominant === "EVEN")) streak++; else break;
  }
  const confidence = Math.min(99, Math.round(50 + edge * 1.6 + Math.min(streak, 8) * 2.5));

  const latest = ticks.length ? ticks[ticks.length - 1].quote : 0;
  const prevPrice = ticks.length > 1 ? ticks[ticks.length - 2].quote : latest;
  const priceUp = latest >= prevPrice;
  const animatedPrice = useAnimatedNumber(latest, 320);
  const last = digits[digits.length - 1] ?? 0;
  const lastEpoch = ticks.length ? ticks[ticks.length - 1].epoch : 0;

  // auto-scroll digit strip
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = stripRef.current; if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" }); }, [lastEpoch]);
  const recent = digits.slice(-60);

  // recent trade history
  const [history, setHistory] = useState<Array<{ id: string; profit: number | null; status: string; stake: number; entry_spot: number | null; exit_spot: number | null; contract_type: string }>>([]);
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("trades")
        .select("id,profit,status,stake,entry_spot,exit_spot,contract_type")
        .eq("user_id", user.id).in("contract_type", ["DIGITEVEN", "DIGITODD"])
        .order("opened_at", { ascending: false }).limit(8);
      setHistory((data ?? []) as any);
    };
    load();
    const ch = supabase.channel("eo-trades")
      .on("postgres_changes", { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const upd = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-3 px-2 pb-28 sm:px-4 lg:px-6">
      {/* TOP HEADER — one row */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/60 p-2 backdrop-blur lg:gap-3 lg:p-3">
        <Link to="/manual" className="grid h-8 w-8 flex-none place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
        {/* Demo/Real */}
        <div className="relative">
          <select
            value={active?.id ?? ""}
            onChange={(e) => {
              const acc = accounts.find((a) => a.id === e.target.value);
              if (acc) setActive(acc);
            }}
            className="appearance-none rounded-lg border border-white/10 bg-white/[0.04] py-1 pl-2 pr-6 text-[10px] font-semibold uppercase tracking-wider text-foreground outline-none"
          >
            {accounts.length === 0 && <option value="">No account</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.is_virtual ? "Demo" : "Real"} · {a.loginid}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        </div>
        {/* Balance */}
        <div className="flex-1 text-right">
          <div className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground">Balance</div>
          <div className="num text-sm font-bold leading-none" style={{ color: GREEN, textShadow: `0 0 10px ${GREEN}88` }}>
            {balance ? `${balance.balance.toFixed(2)} ${balance.currency}` : "—"}
          </div>
        </div>
        {/* online indicator */}
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-1.5 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full" style={{ background: GREEN, opacity: 0.7 }} />
            <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
          </span>
          <Wifi className="h-3 w-3 text-muted-foreground" />
        </div>
        <Link to="/settings" className="grid h-8 w-8 flex-none place-items-center rounded-lg border border-white/10 bg-white/[0.03]">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      </div>

      {/* Symbol picker — slim */}
      <div className="flex items-center gap-2">
        <Select value={symbol} onValueChange={setSymbol}>
          <SelectTrigger className="h-8 flex-1 rounded-xl border-white/10 bg-black/60 px-2.5 text-xs lg:h-10 lg:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DERIV_SYMBOLS.map((s) => <SelectItem key={s.symbol} value={s.symbol}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className={cn("rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider lg:px-3 lg:py-1.5 lg:text-[11px]",
          running ? "border-bull/40 bg-bull/10 text-bull" : "border-white/10 text-muted-foreground")}>
          {running ? (paused ? "Paused" : "Live") : "Idle"}
        </div>
      </div>

      {/* RESPONSIVE GRID — single column on mobile, 12-col terminal on desktop */}
      <div className="grid gap-3 lg:grid-cols-12">

      {/* LEFT COLUMN — selector + price + digits + thermometer */}
      <div className="space-y-3 lg:col-span-8">
      {/* EVEN/ODD glowing segmented selector */}
      <div className="lg:sticky lg:top-2 lg:z-30">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/70 p-1 backdrop-blur-xl"
             style={{ boxShadow: `0 6px 22px -10px ${direction === 0 ? GREEN : RED}` }}>
          {(["EVEN", "ODD"] as const).map((lbl, i) => {
            const active = direction === i;
            const color = i === 0 ? GREEN : RED;
            return (
              <button key={lbl} onClick={() => setDirection(i as 0 | 1)}
                className={cn(
                  "relative rounded-xl py-2 text-xs font-bold uppercase tracking-[0.22em] transition-all lg:py-3 lg:text-sm",
                  active ? "scale-[1.01] animate-pulse" : "text-muted-foreground hover:text-foreground",
                )}
                style={active ? {
                  background: i === 0
                    ? `linear-gradient(180deg, ${GREEN_SOFT}, oklch(0.18 0.08 145 / 0.45))`
                    : `linear-gradient(180deg, ${RED_SOFT}, oklch(0.22 0.12 25 / 0.45))`,
                  color,
                  boxShadow: i === 0
                    ? `inset 0 0 0 1px ${GREEN}55, 0 0 18px -2px ${GREEN}aa`
                    : `inset 0 0 0 1px ${RED}66, 0 0 18px -2px ${RED}aa`,
                  textShadow: `0 0 10px ${color}88`,
                } : undefined}>
                {lbl}
                {active && <span className="absolute inset-x-3 -bottom-px h-px" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* LIVE PRICE — compact */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-black/70 to-black/40 px-3 py-2 lg:px-5 lg:py-4"
           style={{ borderColor: "oklch(0.78 0.2 145 / 0.3)", boxShadow: `0 0 22px -10px ${GREEN}88` }}>
        <div className="flex items-center justify-between gap-3 lg:gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full" style={{ background: GREEN, opacity: 0.7 }} />
              <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
            </span>
            <div>
              <div className="text-[8px] font-semibold uppercase tracking-[0.22em] text-muted-foreground lg:text-[10px]">Live · {symbol}</div>
              <div className="text-[10px] text-muted-foreground lg:text-xs">Last <span className="num font-bold" style={{ color: last % 2 === 0 ? GREEN : RED, textShadow: `0 0 8px ${last % 2 === 0 ? GREEN : RED}88` }}>{last}</span></div>
            </div>
          </div>
          <div className="text-right">
            <div key={lastEpoch} className="num text-lg font-bold tabular-nums leading-none lg:text-3xl"
                 style={{ color: priceUp ? GREEN : RED, textShadow: `0 0 14px ${priceUp ? GREEN + "99" : RED + "99"}` }}>
              {animatedPrice ? animatedPrice.toFixed(3) : "--"}
            </div>
            <div className={cn("text-[9px] font-semibold num lg:text-xs", priceUp ? "text-bull" : "text-bear")}>
              {priceUp ? "▲" : "▼"} {priceUp ? "up" : "down"}
            </div>
          </div>
        </div>
      </div>

      {/* DIGITS STRIP — small bubbles */}
      <div className="rounded-2xl border border-white/10 bg-black/50 p-1.5 backdrop-blur lg:p-3">
        <div ref={stripRef} className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] lg:gap-1.5 [&::-webkit-scrollbar]:hidden">
          {recent.map((d, i) => {
            const isEven = d % 2 === 0;
            const isLast = i === recent.length - 1;
            return (
              <div key={`${i}-${d}-${lastEpoch}`}
                className={cn("grid h-5 w-5 flex-none place-items-center rounded-full border text-[9px] font-bold num lg:h-7 lg:w-7 lg:text-[11px]", isLast && "scale-110")}
                style={isEven ? {
                  background: `radial-gradient(circle at 30% 30%, ${GREEN}, oklch(0.45 0.18 145))`,
                  borderColor: GREEN, color: "oklch(0.12 0.04 145)",
                  boxShadow: isLast ? `0 0 10px ${GREEN}` : `0 0 4px ${GREEN}55`,
                } : {
                  background: `radial-gradient(circle at 30% 30%, ${RED}, oklch(0.4 0.16 25))`,
                  borderColor: RED, color: "oklch(0.98 0 0)",
                  boxShadow: isLast ? `0 0 10px ${RED}` : `0 0 4px ${RED}55`,
                }}>
                {d}
              </div>
            );
          })}
        </div>
      </div>

      {/* MARKET THERMOMETER — centered live needle */}
      <Thermometer
        pressure={pressureA}
        momentum={momentumA}
        edge={edge}
        dominant={dominant}
        evenPct={evenA}
        oddPct={oddA}
        confidence={confidence}
        sample={total}
        tick={lastEpoch}
      />
      </div>

      {/* RIGHT COLUMN — risk + controls + manual */}
      <div className="space-y-3 lg:col-span-4">

      {/* RISK CONTROL PANEL — compact grid */}
      <div className="rounded-2xl border border-white/10 bg-black/60 p-2.5 backdrop-blur lg:p-4"
           style={{ boxShadow: `inset 0 0 0 1px ${GREEN}22, 0 0 24px -14px ${GREEN}` }}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground lg:text-[11px]">Risk Control</div>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground lg:text-xs">
            Auto trade
            <button onClick={() => upd("autoTrade", !cfg.autoTrade)}
              className={cn("relative h-4 w-7 rounded-full border transition", cfg.autoTrade ? "border-transparent" : "border-white/20 bg-white/[0.04]")}
              style={cfg.autoTrade ? { background: GREEN, boxShadow: `0 0 10px ${GREEN}` } : undefined}>
              <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-black transition-all", cfg.autoTrade ? "left-3.5" : "left-0.5")} />
            </button>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:gap-2">
          <NumField label="Stake" value={cfg.stake} onChange={(v) => upd("stake", v)} step={0.5} min={0.35} />
          <NumField label="Take Profit" value={cfg.takeProfit} onChange={(v) => upd("takeProfit", v)} step={1} />
          <NumField label="Max Loss" value={cfg.maxLoss} onChange={(v) => upd("maxLoss", v)} step={1} />
          <NumField label="Martingale" value={cfg.martingale} onChange={(v) => upd("martingale", v)} step={0.1} min={1} suffix="×" />
          <NumField label="Ticks" value={cfg.ticks} onChange={(v) => upd("ticks", Math.max(1, Math.round(v)))} step={1} min={1} />
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-1.5 py-1">
            <div className="text-[8px] uppercase tracking-wider text-muted-foreground">P&amp;L</div>
            <div className={cn("num text-xs font-bold tabular-nums", sessionPnl >= 0 ? "text-bull" : "text-bear")}>
              {sessionPnl >= 0 ? "+" : ""}{sessionPnl.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* TRADING CONTROLS */}
      <div className="space-y-1.5 lg:space-y-2">
        <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
          <CtrlBtn
            onClick={() => (paused ? resumeLoop() : startLoop())}
            disabled={running && !paused}
            color={GREEN} icon={<Play className="h-3.5 w-3.5" />}
            label={paused ? "Resume" : "Start"} glow
          />
          <CtrlBtn
            onClick={pauseLoop}
            disabled={!running || paused}
            color={CYAN} icon={<Pause className="h-3.5 w-3.5" />} label="Pause"
          />
          <CtrlBtn
            onClick={stopLoop}
            disabled={!running}
            color={RED} icon={<Square className="h-3.5 w-3.5" />} label="Stop"
          />
        </div>
        <button onClick={() => placeOnce(false)} disabled={running || busy}
          className="group relative w-full overflow-hidden rounded-xl border py-2.5 text-xs font-bold uppercase tracking-[0.2em] transition-all hover:scale-[1.01] disabled:opacity-50"
          style={{
            borderColor: `${CYAN}55`,
            background: `linear-gradient(135deg, oklch(0.82 0.16 200 / 0.18), oklch(0.78 0.2 145 / 0.12))`,
            color: CYAN, textShadow: `0 0 10px ${CYAN}88`,
            boxShadow: `0 0 18px -6px ${CYAN}, inset 0 0 0 1px ${CYAN}33`,
          }}>
          <span className="inline-flex items-center gap-2"><Zap className="h-3.5 w-3.5" /> {busy ? "Placing…" : "Trade Without AI"}</span>
        </button>
      </div>

      {/* MANUAL MODE */}
      <div className="rounded-2xl border border-white/10 bg-black/60 p-2.5 backdrop-blur lg:p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground lg:text-[11px]">Manual Mode</div>
          <span className="text-[9px] text-muted-foreground lg:text-[11px]">Single shot</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
          <button onClick={() => placeOnce(false, 0)} disabled={busy}
            className="rounded-xl border py-2 text-xs font-bold uppercase tracking-[0.18em] transition hover:scale-[1.01] disabled:opacity-50 lg:py-3 lg:text-sm"
            style={{
              borderColor: `${GREEN}55`, color: GREEN,
              background: `linear-gradient(180deg, ${GREEN_SOFT}, transparent)`,
              boxShadow: `0 0 14px -6px ${GREEN}, inset 0 0 0 1px ${GREEN}33`,
              textShadow: `0 0 8px ${GREEN}88`,
            }}>EVEN</button>
          <button onClick={() => placeOnce(false, 1)} disabled={busy}
            className="rounded-xl border py-2 text-xs font-bold uppercase tracking-[0.18em] transition hover:scale-[1.01] disabled:opacity-50 lg:py-3 lg:text-sm"
            style={{
              borderColor: `${RED}66`, color: RED,
              background: `linear-gradient(180deg, ${RED_SOFT}, transparent)`,
              boxShadow: `0 0 14px -6px ${RED}, inset 0 0 0 1px ${RED}33`,
              textShadow: `0 0 8px ${RED}88`,
            }}>ODD</button>
        </div>
      </div>
      </div>
      </div>

      {/* TRADE HISTORY — full width across grid */}
      <div className="rounded-2xl border border-white/10 bg-black/60 p-2 backdrop-blur lg:p-4">
        <div className="mb-1 flex items-center justify-between px-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground lg:text-[11px]">
          <span>Recent Trades</span>
          <span>Last 8</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/5">
          <table className="w-full text-[10px] lg:text-sm">
            <thead className="bg-white/[0.03] text-muted-foreground">
              <tr>
                <th className="px-1.5 py-1 text-left font-medium uppercase tracking-wider lg:px-3 lg:py-2">Type</th>
                <th className="px-1.5 py-1 text-right font-medium uppercase tracking-wider lg:px-3 lg:py-2">Stake</th>
                <th className="px-1.5 py-1 text-right font-medium uppercase tracking-wider lg:px-3 lg:py-2">Entry</th>
                <th className="px-1.5 py-1 text-right font-medium uppercase tracking-wider lg:px-3 lg:py-2">Exit</th>
                <th className="px-1.5 py-1 text-right font-medium uppercase tracking-wider lg:px-3 lg:py-2">P/L</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={5} className="px-1.5 py-3 text-center text-muted-foreground">No trades yet</td></tr>
              )}
              {history.map((t) => {
                const isEven = t.contract_type === "DIGITEVEN";
                const won = (t.profit ?? 0) > 0;
                return (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="px-1.5 py-1 font-semibold lg:px-3 lg:py-2" style={{ color: isEven ? GREEN : RED, textShadow: `0 0 6px ${isEven ? GREEN : RED}66` }}>{isEven ? "E" : "O"}</td>
                    <td className="num px-1.5 py-1 text-right lg:px-3 lg:py-2">{t.stake.toFixed(2)}</td>
                    <td className="num px-1.5 py-1 text-right text-muted-foreground lg:px-3 lg:py-2">{t.entry_spot?.toFixed(3) ?? "—"}</td>
                    <td className="num px-1.5 py-1 text-right text-muted-foreground lg:px-3 lg:py-2">{t.exit_spot?.toFixed(3) ?? "—"}</td>
                    <td className={cn("num px-1.5 py-1 text-right font-bold lg:px-3 lg:py-2", won ? "text-bull" : (t.profit ?? 0) < 0 ? "text-bear" : "text-muted-foreground")}>
                      {t.profit == null ? "…" : `${won ? "+" : ""}${t.profit.toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!active && <p className="px-1 text-[10px] text-bear">Connect a Deriv account in Settings to trade.</p>}
    </div>
  );
}

function Mini({ label, value, color, pulse }: { label: string; value: string; color: string; pulse?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 px-1 py-1">
      <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("num text-[11px] font-bold tabular-nums leading-tight", pulse && "animate-pulse")}
           style={{ color, textShadow: `0 0 8px ${color}66` }}>{value}</div>
    </div>
  );
}

function Thermometer({
  pressure, momentum, edge, dominant, evenPct, oddPct, confidence, sample, tick,
}: {
  pressure: number; momentum: number; edge: number;
  dominant: "EVEN" | "ODD"; evenPct: number; oddPct: number;
  confidence: number; sample: number; tick: number;
}) {
  // pressure in [-100, 100] → needle position in [0%, 100%]
  const pos = Math.max(0, Math.min(100, 50 + pressure / 2));
  const momPos = Math.max(0, Math.min(100, 50 + momentum / 2));
  const intensity = Math.min(1, edge / 30); // glow intensity scales with edge
  const sideColor = dominant === "EVEN" ? GREEN : RED;
  const glow = `0 0 ${10 + intensity * 28}px ${sideColor}`;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-2.5 backdrop-blur"
         style={{ boxShadow: `inset 0 0 0 1px ${sideColor}22, 0 0 ${12 + intensity * 18}px -10px ${sideColor}` }}>
      <div className="mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Live Market Thermometer</span>
        <span>n=<span className="num text-foreground">{sample}</span></span>
      </div>

      {/* polarity labels */}
      <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
        <span style={{ color: RED, textShadow: `0 0 8px ${RED}88` }}>◀ ODD</span>
        <span className="text-muted-foreground">Pressure</span>
        <span style={{ color: GREEN, textShadow: `0 0 8px ${GREEN}88` }}>EVEN ▶</span>
      </div>

      {/* the bar */}
      <div className="relative h-4 w-full overflow-visible rounded-full border border-white/10 bg-[linear-gradient(90deg,oklch(0.4_0.16_25/0.35),oklch(0.18_0.02_240/0.4)_50%,oklch(0.4_0.18_145/0.35))]">
        {/* tick marks */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-1">
          {Array.from({ length: 11 }).map((_, i) => (
            <span key={i} className={cn("h-1.5 w-px", i === 5 ? "h-3 bg-white/40" : "bg-white/15")} />
          ))}
        </div>
        {/* center fill from middle to needle */}
        <div
          className="absolute inset-y-0 transition-[left,width,background] duration-300 ease-out"
          style={{
            left: `${Math.min(50, pos)}%`,
            width: `${Math.abs(pos - 50)}%`,
            background: pressure >= 0
              ? `linear-gradient(90deg, ${GREEN}55, ${GREEN})`
              : `linear-gradient(270deg, ${RED}55, ${RED})`,
            boxShadow: `0 0 ${6 + intensity * 14}px ${sideColor}aa`,
            opacity: 0.85,
          }}
        />
        {/* momentum ghost marker */}
        <div
          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/10 transition-[left] duration-200 ease-out"
          style={{ left: `${momPos}%` }}
          title="Short-term momentum"
        />
        {/* main needle */}
        <div
          key={tick}
          className="absolute top-1/2 h-6 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,background,box-shadow] duration-300 ease-out"
          style={{
            left: `${pos}%`,
            background: sideColor,
            boxShadow: glow,
          }}
        />
      </div>

      {/* readouts */}
      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
        <Mini label="Even" value={`${evenPct.toFixed(1)}%`} color={GREEN} />
        <Mini label="Odd" value={`${oddPct.toFixed(1)}%`} color={RED} />
        <Mini label="AI" value={dominant} color={sideColor} pulse />
        <Mini label="Conf" value={`${confidence}%`} color={confidence >= 70 ? GREEN : confidence >= 60 ? CYAN : RED} />
      </div>
      <div className="mt-1.5 flex items-center justify-between px-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
        <span>Edge <span className="num font-semibold text-foreground">{edge.toFixed(2)}%</span></span>
        <span>Momentum <span className="num font-semibold" style={{ color: momentum >= 0 ? GREEN : RED }}>{momentum >= 0 ? "+" : ""}{momentum.toFixed(0)}</span></span>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, step = 1, min = 0, suffix }: {
  label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] px-1.5 py-1 transition focus-within:border-[oklch(0.78_0.2_145/0.5)] focus-within:shadow-[0_0_12px_-2px_oklch(0.78_0.2_145/0.6)]">
      <span className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center">
        <input
          type="number" inputMode="decimal" step={step} min={min}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num w-full bg-transparent text-xs font-bold tabular-nums outline-none"
        />
        {suffix && <span className="ml-0.5 text-[9px] text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

function CtrlBtn({ onClick, disabled, color, icon, label, glow }: {
  onClick: () => void; disabled?: boolean; color: string; icon: React.ReactNode; label: string; glow?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="group relative flex items-center justify-center gap-1.5 overflow-hidden rounded-xl border py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
      style={{
        borderColor: `${color}66`, color,
        background: `linear-gradient(180deg, ${color.replace(")", " / 0.18)")}, transparent)`.replace("oklch(", "oklch("),
        boxShadow: glow && !disabled
          ? `0 0 18px -4px ${color}, inset 0 0 0 1px ${color}55`
          : `inset 0 0 0 1px ${color}33`,
        textShadow: `0 0 8px ${color}88`,
      }}>
      {icon}<span>{label}</span>
    </button>
  );
}