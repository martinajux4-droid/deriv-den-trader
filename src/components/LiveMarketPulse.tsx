import { useMemo, useRef } from "react";
import { Activity, Gauge, TrendingDown, TrendingUp, Minus, Waves } from "lucide-react";
import { useTicks } from "@/hooks/use-ticks";
import { analyze } from "@/lib/ai-analysis";
import { cn } from "@/lib/utils";

type Tone = "bull" | "bear" | "warn" | "primary" | "muted";

function Chip({
  icon, label, value, sub, tone, pulse,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  tone: Tone; pulse?: boolean;
}) {
  const map: Record<Tone, string> = {
    bull: "border-bull/40 bg-bull/8 text-bull",
    bear: "border-bear/40 bg-bear/10 text-bear",
    warn: "border-warning/40 bg-warning/10 text-warning",
    primary: "border-primary/40 bg-primary/8 text-primary",
    muted: "border-border/50 bg-background/40 text-muted-foreground",
  };
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur-sm", map[tone])}>
      <span className={cn("grid h-7 w-7 place-items-center rounded-lg bg-background/40", pulse && "animate-pulse")}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="num truncate text-[12px] font-semibold">{value}</div>
        {sub && <div className="text-[9px] text-muted-foreground/80">{sub}</div>}
      </div>
    </div>
  );
}

export function LiveMarketPulse({ symbol }: { symbol: string }) {
  const ticks = useTicks(symbol, 60);
  const quotes = useMemo(() => ticks.map((t) => t.quote), [ticks]);
  const a = useMemo(() => analyze(quotes), [quotes]);
  const prevVolRef = useRef<number | null>(null);

  // Compare volatility against last snapshot to show direction (up/down).
  const volNow = a?.volatility ?? 0;
  const prevVol = prevVolRef.current;
  const volDir: "up" | "down" | "flat" =
    prevVol == null ? "flat" : volNow > prevVol + 1 ? "up" : volNow < prevVol - 1 ? "down" : "flat";
  // Update after read so next render compares against this one
  if (a) prevVolRef.current = volNow;

  // Resistance / support zone — how close last price is to recent extremes
  let zoneLabel = "Mid range";
  let zoneTone: Tone = "muted";
  let zoneSub = "Free to move";
  if (quotes.length >= 20) {
    const hi = Math.max(...quotes);
    const lo = Math.min(...quotes);
    const last = quotes[quotes.length - 1];
    const range = Math.max(1e-9, hi - lo);
    const pos = (last - lo) / range; // 0..1
    if (pos >= 0.85) { zoneLabel = "Resistance zone"; zoneTone = "bear"; zoneSub = "Near recent high"; }
    else if (pos <= 0.15) { zoneLabel = "Support zone"; zoneTone = "bull"; zoneSub = "Near recent low"; }
    else if (pos >= 0.6) { zoneLabel = "Upper band"; zoneTone = "warn"; zoneSub = "Pushing higher"; }
    else if (pos <= 0.4) { zoneLabel = "Lower band"; zoneTone = "warn"; zoneSub = "Pressing lower"; }
  }

  // Momentum zone
  const mom = a?.momentum ?? 0;
  const momLabel = mom > 0.05 ? "Bullish momentum" : mom < -0.05 ? "Bearish momentum" : "Neutral";
  const momTone: Tone = mom > 0.05 ? "bull" : mom < -0.05 ? "bear" : "muted";
  const momIcon = mom > 0.05 ? <TrendingUp className="h-3.5 w-3.5" /> : mom < -0.05 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />;

  // Volatility tone — high vol = warn, dropping = primary
  const volTone: Tone = volNow >= 70 ? "bear" : volNow >= 45 ? "warn" : volDir === "down" ? "primary" : "muted";
  const volIcon = volDir === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : volDir === "down" ? <TrendingDown className="h-3.5 w-3.5" /> : <Waves className="h-3.5 w-3.5" />;
  const volSub = volDir === "up" ? "Rising" : volDir === "down" ? "Cooling off" : "Steady";

  // Trend pressure
  const trend = a?.trendStrength ?? 0;
  const trendTone: Tone = trend >= 65 ? "primary" : trend >= 40 ? "warn" : "muted";

  return (
    <div className="relative mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <Chip
        icon={volIcon}
        label="Volatility"
        value={`${volNow.toFixed(0)}%`}
        sub={volSub}
        tone={volTone}
        pulse={volDir !== "flat"}
      />
      <Chip
        icon={momIcon}
        label="Momentum zone"
        value={momLabel}
        sub={`${mom >= 0 ? "+" : ""}${mom.toFixed(2)}%`}
        tone={momTone}
        pulse={momTone !== "muted"}
      />
      <Chip
        icon={<Activity className="h-3.5 w-3.5" />}
        label="Price zone"
        value={zoneLabel}
        sub={zoneSub}
        tone={zoneTone}
        pulse={zoneTone === "bear" || zoneTone === "bull"}
      />
      <Chip
        icon={<Gauge className="h-3.5 w-3.5" />}
        label="Trend pressure"
        value={`${trend.toFixed(0)}%`}
        sub={a ? a.trendDir : "—"}
        tone={trendTone}
        pulse={trendTone === "primary"}
      />
    </div>
  );
}