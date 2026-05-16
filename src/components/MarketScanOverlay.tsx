import { useEffect, useRef, useState } from "react";
import { Radar, Zap, CheckCircle2, X, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDeriv } from "@/hooks/use-deriv";
import { analyze } from "@/lib/ai-analysis";

const SCAN_MARKETS: { symbol: string; label: string }[] = [
  { symbol: "R_10",   label: "Volatility 10" },
  { symbol: "R_25",   label: "Volatility 25" },
  { symbol: "R_50",   label: "Volatility 50" },
  { symbol: "R_75",   label: "Volatility 75" },
  { symbol: "R_100",  label: "Volatility 100" },
  { symbol: "1HZ10V",  label: "Volatility 10 (1s)" },
  { symbol: "1HZ25V",  label: "Volatility 25 (1s)" },
  { symbol: "1HZ50V",  label: "Volatility 50 (1s)" },
  { symbol: "1HZ75V",  label: "Volatility 75 (1s)" },
  { symbol: "1HZ100V", label: "Volatility 100 (1s)" },
];

type Row = {
  symbol: string;
  label: string;
  confidence: number;
  direction: "RISE" | "FALL" | "WAIT";
  status: "queued" | "scanning" | "done";
};

type Props = {
  open: boolean;
  onClose: () => void;
  onExecute: (symbol: string) => void;
};

export function MarketScanOverlay({ open, onClose, onExecute }: Props) {
  const { client, status } = useDeriv();
  const [rows, setRows] = useState<Row[]>([]);
  const [phase, setPhase] = useState<"scanning" | "locked">("scanning");
  const [lockedSymbol, setLockedSymbol] = useState<string | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!open || !client || status !== "open") return;
    firedRef.current = false;
    setPhase("scanning");
    setLockedSymbol(null);
    setRows(
      SCAN_MARKETS.map((m) => ({
        ...m,
        confidence: 0,
        direction: "WAIT",
        status: "queued",
      }))
    );

    // Real-time scan: fetch tick history for each market, then keep a live
    // tick subscription. Recompute confidence + direction on every update.
    const quotesBySymbol = new Map<string, number[]>();
    const unsubs: Array<() => void> = [];
    let cancelled = false;

    const recompute = (sym: string) => {
      const q = quotesBySymbol.get(sym);
      if (!q || q.length < 12) return;
      const a = analyze(q);
      if (!a) return;
      const dir: Row["direction"] =
        a.recommendation === "RISE" || a.recommendation === "FALL"
          ? a.recommendation
          : a.sentiment === "Bullish" ? "RISE" : a.sentiment === "Bearish" ? "FALL" : "WAIT";
      setRows((rs) =>
        rs.map((r) =>
          r.symbol === sym
            ? { ...r, status: "done", confidence: a.confidence, direction: dir }
            : r,
        ),
      );
    };

    SCAN_MARKETS.forEach((m, i) => {
      const delay = i * 120;
      setTimeout(async () => {
        if (cancelled) return;
        setRows((rs) => rs.map((r) => (r.symbol === m.symbol ? { ...r, status: "scanning" } : r)));
        try {
          const res = await client.send({
            ticks_history: m.symbol, count: 80, end: "latest", style: "ticks",
          });
          if (cancelled) return;
          const prices: number[] = (res.history?.prices ?? []).map((p: any) => Number(p));
          quotesBySymbol.set(m.symbol, prices);
          recompute(m.symbol);
          const off = await client.subscribeTicks(m.symbol, (t) => {
            if (cancelled) return;
            const cur = quotesBySymbol.get(m.symbol) || [];
            const next = [...cur, t.quote].slice(-80);
            quotesBySymbol.set(m.symbol, next);
            recompute(m.symbol);
          });
          if (cancelled) { off(); return; }
          unsubs.push(off);
        } catch (e) {
          // mark as done with zero — won't be picked
          if (!cancelled) {
            setRows((rs) => rs.map((r) => r.symbol === m.symbol ? { ...r, status: "done" } : r));
          }
        }
      }, delay);
    });

    return () => {
      cancelled = true;
      unsubs.forEach((u) => { try { u(); } catch {} });
    };
  }, [open, client, status]);

  // When the best market crosses 61%, lock + fire execute after a beat.
  useEffect(() => {
    if (!open || firedRef.current) return;
    const best = [...rows].sort((a, b) => b.confidence - a.confidence)[0];
    if (best && best.confidence >= 61) {
      firedRef.current = true;
      setLockedSymbol(best.symbol);
      setPhase("locked");
    }
  }, [rows, open, onExecute]);

  if (!open) return null;

  const sorted = [...rows].sort((a, b) => b.confidence - a.confidence);
  const top = sorted[0];

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-primary/30 bg-card/95 shadow-[0_20px_80px_-20px_oklch(0.82_0.15_85/0.5)]">
        <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-[0.06]" />
        <div className="scan-sweep opacity-30" />

        <div className="relative flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className={cn(
              "grid h-10 w-10 place-items-center rounded-xl border",
              phase === "locked"
                ? "border-bull/40 bg-bull/10 text-bull"
                : "border-primary/40 bg-primary/10 text-primary animate-pulse"
            )}>
              {phase === "locked" ? <CheckCircle2 className="h-5 w-5" /> : <Radar className="h-5 w-5" />}
            </span>
            <div>
              <div className="text-sm font-semibold">
                {phase === "locked" ? "Signal locked · executing trade" : "AI scanning volatility markets…"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {phase === "locked"
                  ? `Best market: ${SCAN_MARKETS.find((m) => m.symbol === lockedSymbol)?.label}`
                  : "Ranking 10 markets by live confidence · pause threshold 58% · execute ≥61%"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Top market highlight */}
        {top && (
          <div className={cn(
            "relative mx-5 mt-4 rounded-2xl border p-4 transition-all",
            phase === "locked"
              ? "border-bull/70 bg-bull/15 shadow-[0_0_40px_-8px_oklch(0.74_0.18_150/0.8)] animate-pulse"
              : "border-primary/30 bg-primary/5"
          )}>
            {phase === "locked" && (
              <div className="absolute -top-2 left-4 rounded-full border border-bull/60 bg-bull px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-bull-foreground">
                ★ Best market locked
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Top market</div>
                <div className={cn(
                  "truncate text-lg font-semibold",
                  phase === "locked" && "text-bull"
                )}>{top.label}</div>
              </div>
              <div className="text-right">
                <div className={cn(
                  "num text-3xl font-bold tabular-nums",
                  top.confidence >= 61 ? "text-bull" : top.confidence >= 58 ? "text-warning" : "text-muted-foreground"
                )}>
                  {top.confidence}%
                </div>
                <div className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  top.direction === "RISE" ? "text-bull" : top.direction === "FALL" ? "text-bear" : "text-muted-foreground"
                )}>
                  {top.direction}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Market list */}
        <div className="relative max-h-[42vh] overflow-auto px-5 py-4 space-y-1.5">
          {sorted.map((r, idx) => {
            const tone =
              r.confidence >= 61 ? "bull" :
              r.confidence >= 58 ? "warn" : "muted";
            return (
              <div
                key={r.symbol}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-background/40 px-3 py-2 transition-all",
                  r.symbol === lockedSymbol && "border-bull/60 bg-bull/10 shadow-[0_0_24px_-8px_oklch(0.74_0.18_150/0.7)]",
                  r.symbol !== lockedSymbol && "border-border/50",
                )}
              >
                <span className="num w-5 text-center text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                <span className={cn(
                  "grid h-7 w-7 place-items-center rounded-lg",
                  r.status === "scanning" && "bg-primary/15 text-primary animate-pulse",
                  r.status === "done" && "bg-bull/10 text-bull",
                  r.status === "queued" && "bg-muted/30 text-muted-foreground",
                )}>
                  {r.status === "queued" ? <Activity className="h-3.5 w-3.5" /> :
                   r.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   <Radar className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{r.label}</div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-background/60">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        tone === "bull" ? "bg-bull" : tone === "warn" ? "bg-warning" : "bg-muted-foreground/60"
                      )}
                      style={{ width: `${Math.min(100, r.confidence)}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right">
                  <div className={cn(
                    "num text-sm font-bold tabular-nums",
                    tone === "bull" ? "text-bull" : tone === "warn" ? "text-warning" : "text-foreground"
                  )}>
                    {r.confidence}%
                  </div>
                  <div className={cn(
                    "text-[9px] font-bold uppercase tracking-wider",
                    r.direction === "RISE" ? "text-bull" : r.direction === "FALL" ? "text-bear" : "text-muted-foreground"
                  )}>
                    {r.status === "queued" ? "—" : r.direction}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative flex items-center justify-between gap-2 border-t border-border/50 bg-background/40 px-5 py-3 text-[11px] text-muted-foreground">
          <span>
            {phase === "locked"
              ? "Auto-executing in a moment…"
              : "Waiting for the first market to cross 61% confidence"}
          </span>
          {phase === "locked" && (
            <Button
              size="sm"
              className="h-8 bg-bull text-bull-foreground hover:bg-bull/90"
              onClick={() => lockedSymbol && onExecute(lockedSymbol)}
            >
              <Zap className="mr-1 h-3.5 w-3.5" /> Execute now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}