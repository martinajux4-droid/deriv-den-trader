import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { supabase } from "@/integrations/supabase/client";
import { BotRunner, type StrategyConfig, type StrategyType } from "@/lib/bot-engine";
import { DERIV_SYMBOLS } from "@/lib/deriv-symbols";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Play, Square, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bot")({
  component: BotPage,
});

const STRATEGIES: { id: StrategyType; name: string; desc: string }[] = [
  { id: "rise_fall_trend", name: "Rise/Fall trend follower", desc: "Trade CALL after 3 rising ticks, PUT after 3 falling." },
  { id: "digit_over_under", name: "Digit Over/Under", desc: "Pick a barrier (0–9) and direction." },
  { id: "even_odd_martingale", name: "Even/Odd Martingale", desc: "Even or Odd, doubles stake on loss." },
];

function BotPage() {
  const { user } = useAuth();
  const { client, active, balance } = useDeriv();
  const [type, setType] = useState<StrategyType>("rise_fall_trend");
  const [symbol, setSymbol] = useState("R_100");
  const [stake, setStake] = useState("1");
  const [duration, setDuration] = useState("5");
  const [unit, setUnit] = useState("t");
  const [barrier, setBarrier] = useState("5");
  const [contract, setContract] = useState<"DIGITOVER" | "DIGITUNDER" | "DIGITEVEN" | "DIGITODD">("DIGITOVER");
  const [martingale, setMartingale] = useState("2");
  const [tp, setTp] = useState("10");
  const [sl, setSl] = useState("10");
  const [maxTrades, setMaxTrades] = useState("20");

  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<{ t: number; msg: string; tone?: string }[]>([]);
  const [pnl, setPnl] = useState(0);
  const [trades, setTrades] = useState(0);
  const runnerRef = useRef<BotRunner | null>(null);
  const runIdRef = useRef<string | null>(null);

  const log = (msg: string, tone?: string) =>
    setLogs((l) => [{ t: Date.now(), msg, tone }, ...l].slice(0, 200));

  const start = async () => {
    if (!client || !active || !user) { toast.error("Connect a Deriv account first"); return; }
    const cfg: StrategyConfig = {
      type, symbol, stake: Number(stake),
      duration: Number(duration), duration_unit: unit,
      ...(type === "digit_over_under" ? { barrier: Number(barrier), contract: contract as any } : {}),
      ...(type === "even_odd_martingale" ? { contract: contract as any, martingale: Number(martingale) } : {}),
      take_profit: Number(tp) || undefined,
      stop_loss: Number(sl) || undefined,
      max_trades: Number(maxTrades) || undefined,
    };

    const { data: run } = await supabase.from("bot_runs").insert({
      user_id: user.id, status: "running", strategy_id: null, notes: JSON.stringify(cfg),
    }).select().single();
    runIdRef.current = run?.id ?? null;

    setRunning(true); setLogs([]); setPnl(0); setTrades(0);

    const runner = new BotRunner(
      client, cfg, balance?.currency || "USD",
      (e) => {
        if (e.kind === "log") log(e.msg, e.level);
        if (e.kind === "trade_close") { setPnl((p) => p + e.profit); setTrades((t) => t + 1); }
        if (e.kind === "stopped") { log(`Stopped: ${e.reason}`, "info"); setRunning(false); }
      },
      async (data) => {
        if (!user) return;
        if (data.profit === undefined) {
          // open
          await supabase.from("trades").insert({
            user_id: user.id,
            bot_run_id: runIdRef.current,
            contract_id: String(data.contract_id),
            symbol: cfg.symbol,
            contract_type: data.contract_type,
            stake: data.stake,
            duration: cfg.duration, duration_unit: cfg.duration_unit,
            is_virtual: active.is_virtual, loginid: active.loginid,
            status: "open",
          });
        } else {
          await supabase.from("trades").update({
            profit: data.profit,
            status: data.profit > 0 ? "won" : data.profit < 0 ? "lost" : "even",
            entry_spot: data.settled?.entry_spot,
            exit_spot: data.settled?.exit_spot,
            payout: data.settled?.payout,
            closed_at: new Date().toISOString(),
            raw: data.settled,
          }).eq("contract_id", String(data.contract_id)).eq("user_id", user.id);
          if (runIdRef.current) {
            await supabase.from("bot_runs").update({ pnl: runner.currentPnl, trades_count: runner.tradeCount }).eq("id", runIdRef.current);
          }
        }
      },
    );
    runnerRef.current = runner;
    runner.run().finally(async () => {
      setRunning(false);
      if (runIdRef.current) {
        await supabase.from("bot_runs").update({
          status: "stopped", stopped_at: new Date().toISOString(),
          pnl: runner.currentPnl, trades_count: runner.tradeCount,
        }).eq("id", runIdRef.current);
      }
    });
  };

  const stop = () => runnerRef.current?.stop();

  useEffect(() => () => runnerRef.current?.stop("Page closed"), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bot</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Bot runs in your browser. Closing this tab stops it.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card className="space-y-3 p-5">
          <div>
            <Label>Strategy</Label>
            <Select value={type} onValueChange={(v) => setType(v as StrategyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">{STRATEGIES.find((s) => s.id === type)?.desc}</p>
          </div>

          <div>
            <Label>Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DERIV_SYMBOLS.map((s) => <SelectItem key={s.symbol} value={s.symbol}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div><Label>Stake</Label><Input className="num" value={stake} onChange={(e) => setStake(e.target.value)} /></div>
            <div><Label>Dur</Label><Input className="num" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
            <div>
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="t">Ticks</SelectItem>
                  <SelectItem value="s">Sec</SelectItem>
                  <SelectItem value="m">Min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "digit_over_under" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Direction</Label>
                <Select value={contract} onValueChange={(v) => setContract(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIGITOVER">Over</SelectItem>
                    <SelectItem value="DIGITUNDER">Under</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Barrier (0-9)</Label><Input className="num" value={barrier} onChange={(e) => setBarrier(e.target.value)} /></div>
            </div>
          )}

          {type === "even_odd_martingale" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Side</Label>
                <Select value={contract} onValueChange={(v) => setContract(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIGITEVEN">Even</SelectItem>
                    <SelectItem value="DIGITODD">Odd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Multiplier</Label><Input className="num" value={martingale} onChange={(e) => setMartingale(e.target.value)} /></div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div><Label>Take profit</Label><Input className="num" value={tp} onChange={(e) => setTp(e.target.value)} /></div>
            <div><Label>Stop loss</Label><Input className="num" value={sl} onChange={(e) => setSl(e.target.value)} /></div>
            <div><Label>Max trades</Label><Input className="num" value={maxTrades} onChange={(e) => setMaxTrades(e.target.value)} /></div>
          </div>

          {!running ? (
            <Button onClick={start} className="mt-2 w-full" size="lg" disabled={!active}>
              <Play className="mr-2 h-4 w-4" /> Start bot
            </Button>
          ) : (
            <Button onClick={stop} variant="destructive" className="mt-2 w-full" size="lg">
              <Square className="mr-2 h-4 w-4" /> Stop bot
            </Button>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Live P&L</div>
              <div className={`num text-3xl font-semibold ${pnl >= 0 ? "bull" : "bear"}`}>
                {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} {balance?.currency || ""}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-muted-foreground">Trades</div>
              <div className="num text-3xl font-semibold">{trades}</div>
            </div>
          </div>
          <div className="mt-4 max-h-[420px] overflow-auto rounded border border-border bg-background/50">
            {logs.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">No activity yet. Start the bot.</div>
            ) : (
              <ul className="divide-y divide-border text-xs">
                {logs.map((l, i) => (
                  <li key={i} className="flex gap-3 px-3 py-2">
                    <span className="num text-muted-foreground">{new Date(l.t).toLocaleTimeString()}</span>
                    <span className={l.tone === "good" ? "bull" : l.tone === "bad" ? "bear" : ""}>{l.msg}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
