import { useMemo } from "react";
import { useTicks } from "@/hooks/use-ticks";
import { Brain, TrendingUp, TrendingDown, Gauge, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIInsightsPanel({ symbol, name }: { symbol: string; name: string }) {
  const ticks = useTicks(symbol, 60);
  const q = ticks.map((t) => t.quote);

  const insight = useMemo(() => {
    if (q.length < 10) return null;
    const last = q[q.length - 1];
    const first = q[0];
    const pct = ((last - first) / first) * 100;
    const rets: number[] = [];
    for (let i = 1; i < q.length; i++) rets.push((q[i] - q[i - 1]) / q[i - 1]);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
    const vol = Math.sqrt(variance) * 100000;
    const ups = rets.filter((r) => r > 0).length;
    const buyP = (ups / rets.length) * 100;
    const trendStrength = Math.min(100, Math.abs(pct) * 30);
    const sentiment = buyP >= 60 ? "Bullish" : buyP <= 40 ? "Bearish" : "Neutral";
    const reco =
      pct > 0.05 && buyP > 55
        ? "Trend continuation favored — RISE bias on pullbacks."
        : pct < -0.05 && buyP < 45
        ? "Downside pressure dominant — favor FALL entries."
        : "Range conditions — wait for breakout confirmation.";
    return { pct, vol, buyP, trendStrength, sentiment, reco };
  }, [q]);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 text-primary">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">AI Insights · {name}</div>
            <div className="text-[11px] text-muted-foreground">Quantitative read on the active market</div>
          </div>
        </div>
      </div>

      {!insight ? (
        <div className="text-xs text-muted-foreground">Collecting data…</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Sentiment" value={insight.sentiment}
              icon={insight.sentiment === "Bullish" ? <TrendingUp className="h-3 w-3" /> :
                    insight.sentiment === "Bearish" ? <TrendingDown className="h-3 w-3" /> :
                    <Gauge className="h-3 w-3" />}
              tone={insight.sentiment === "Bullish" ? "bull" : insight.sentiment === "Bearish" ? "bear" : "muted"}
            />
            <Metric label="Trend" value={`${insight.trendStrength.toFixed(0)}%`}
              icon={<Zap className="h-3 w-3" />} tone="primary" bar={insight.trendStrength} />
            <Metric label="Volatility" value={`${insight.vol.toFixed(0)}`}
              icon={<Gauge className="h-3 w-3" />} tone="accent" bar={Math.min(100, insight.vol)} />
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-primary">AI Recommendation</div>
            <div className="text-sm leading-relaxed">{insight.reco}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/30 p-3">
            <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase text-muted-foreground">
              <span>Buy pressure</span>
              <span className="num text-foreground">{insight.buyP.toFixed(0)}% / {(100 - insight.buyP).toFixed(0)}%</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-bear/30">
              <div className="bg-bull transition-all" style={{ width: `${insight.buyP}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label, value, icon, tone, bar,
}: { label: string; value: string; icon: React.ReactNode; tone: "bull" | "bear" | "muted" | "primary" | "accent"; bar?: number }) {
  const toneClass =
    tone === "bull" ? "text-bull" :
    tone === "bear" ? "text-bear" :
    tone === "primary" ? "text-primary" :
    tone === "accent" ? "text-accent" : "text-muted-foreground";
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
      <div className={cn("flex items-center gap-1 text-[10px] uppercase", toneClass)}>{icon}{label}</div>
      <div className={cn("num mt-1 text-base font-semibold", toneClass)}>{value}</div>
      {bar != null && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background/60">
          <div className={cn("h-full", tone === "primary" ? "bg-primary" : "bg-accent")}
               style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
    </div>
  );
}
