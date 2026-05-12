import { useTicks } from "@/hooks/use-ticks";
import { analyze } from "@/lib/ai-analysis";
import { Activity, Target, Gauge, ShieldCheck } from "lucide-react";

function statusText(a: ReturnType<typeof analyze>) {
  if (!a) return "AI calibrating market sensors…";
  if (a.confidence >= 80 && a.entryScore >= 70) return "Momentum strong — entry favorable";
  if (a.volatility >= 70) return "High volatility detected — caution";
  if (a.entryScore < 40) return "Weak confirmation — AI waiting for stronger setup";
  if (a.recommendation === "WAIT") return "Range conditions — observing breakout";
  return `${a.recommendation} bias · ${a.confidence}% confidence`;
}

export function AIMomentumStrip({ symbol }: { symbol: string }) {
  const ticks = useTicks(symbol, 60);
  const a = analyze(ticks.map((t) => t.quote));
  const items = [
    { label: "Momentum", val: `${Math.abs(a?.momentum ?? 0).toFixed(2)}%`, icon: Activity, color: "var(--meter-momentum)" },
    { label: "Trend pressure", val: `${(a?.trendStrength ?? 0).toFixed(0)}%`, icon: Gauge, color: "var(--meter-bull)" },
    { label: "Entry quality", val: `${a?.entryScore ?? 0}`, icon: Target, color: "var(--meter-ai)" },
    { label: "AI confidence", val: `${a?.confidence ?? 0}%`, icon: ShieldCheck, color: "var(--meter-momentum)" },
  ];
  const ready = (a?.entryScore ?? 0) >= 60 && (a?.confidence ?? 0) >= 70;

  return (
    <div className="glass-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${ready ? "bg-[var(--meter-ai)] animate-pulse" : "bg-muted-foreground"}`} style={{ boxShadow: ready ? "0 0 12px var(--meter-ai)" : undefined }} />
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">AI Momentum Engine</div>
            <div className="text-sm font-medium">{statusText(a)}</div>
          </div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${ready ? "border-[var(--meter-ai)]/40 bg-[var(--meter-ai)]/10 text-[var(--meter-ai)]" : "border-border bg-card/60 text-muted-foreground"}`}>
          {ready ? "TRADE READY" : "STANDBY"}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <it.icon className="h-3 w-3" style={{ color: it.color }} />
              {it.label}
            </div>
            <div className="num text-lg font-semibold" style={{ color: it.color }}>{it.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}