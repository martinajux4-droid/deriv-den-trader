import { useMemo, useState } from "react";
import { useTicks } from "@/hooks/use-ticks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const COUNT_OPTIONS = [
  { label: "60", count: 60 },
  { label: "120", count: 120 },
  { label: "240", count: 240 },
  { label: "500", count: 500 },
];

function ema(values: number[], period: number) {
  if (!values.length) return [] as number[];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(values: number[], period = 14) {
  if (values.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const rs = gains / (losses || 1e-9);
  return 100 - 100 / (1 + rs);
}

export function AdvancedChart({ symbol, name }: { symbol: string; name: string }) {
  const [count, setCount] = useState(120);
  const ticks = useTicks(symbol, count);
  const quotes = ticks.map((t) => t.quote);

  const data = useMemo(() => {
    if (!quotes.length) return null;
    const min = Math.min(...quotes);
    const max = Math.max(...quotes);
    const span = max - min || 1;
    const w = 1000;
    const h = 360;
    const stepX = w / Math.max(1, quotes.length - 1);
    const toY = (v: number) => h - ((v - min) / span) * (h - 30) - 15;
    const points = quotes.map((v, i) => [i * stepX, toY(v)] as const);
    const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const area = path + ` L${points[points.length - 1][0].toFixed(2)},${h} L0,${h} Z`;

    const ema9 = ema(quotes, 9).map((v, i) => [i * stepX, toY(v)] as const);
    const ema21 = ema(quotes, 21).map((v, i) => [i * stepX, toY(v)] as const);
    const ema9Path = ema9.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const ema21Path = ema21.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

    const last = quotes[quotes.length - 1];
    const first = quotes[0];
    const change = last - first;
    const pct = (change / first) * 100;
    const dir = change >= 0 ? "up" : "down";
    const rsiVal = rsi(quotes);

    // support / resistance: simple recent min/max
    const supY = toY(min);
    const resY = toY(max);

    return { w, h, path, area, ema9Path, ema21Path, last, change, pct, dir, rsiVal, supY, resY, min, max };
  }, [quotes]);

  const positive = data?.dir === "up";

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{symbol}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-base font-semibold">{name}</div>
              {data && (
                <span className={cn("num text-sm", positive ? "bull" : "bear")}>
                  {data.last.toFixed(4)} · {data.pct >= 0 ? "+" : ""}{data.pct.toFixed(3)}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> EMA 9</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> EMA 21</span>
            {data?.rsiVal != null && (
              <Badge variant="outline" className="ml-2 num text-[10px]">RSI {data.rsiVal.toFixed(0)}</Badge>
            )}
          </div>
          <div className="flex rounded-md border border-border bg-background/40 p-0.5">
            {COUNT_OPTIONS.map((o) => (
              <Button
                key={o.count}
                size="sm"
                variant="ghost"
                onClick={() => setCount(o.count)}
                className={cn(
                  "h-7 px-2 text-xs",
                  count === o.count && "bg-primary/15 text-primary"
                )}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        {data ? (
          <svg viewBox={`0 0 ${data.w} ${data.h}`} className="block h-[360px] w-full">
            <defs>
              <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={positive ? "var(--color-bull)" : "var(--color-bear)"} stopOpacity="0.35" />
                <stop offset="100%" stopColor={positive ? "var(--color-bull)" : "var(--color-bear)"} stopOpacity="0" />
              </linearGradient>
              <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 40" fill="none" stroke="oklch(1 0 0 / 0.04)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={data.w} height={data.h} fill="url(#grid)" />
            {/* support / resistance */}
            <line x1="0" x2={data.w} y1={data.resY} y2={data.resY} stroke="oklch(0.65 0.22 25 / 0.3)" strokeDasharray="4 4" />
            <line x1="0" x2={data.w} y1={data.supY} y2={data.supY} stroke="oklch(0.74 0.18 150 / 0.3)" strokeDasharray="4 4" />
            <text x="8" y={data.resY - 4} fontSize="10" fill="oklch(0.65 0.22 25 / 0.7)">R {data.max.toFixed(4)}</text>
            <text x="8" y={data.supY - 4} fontSize="10" fill="oklch(0.74 0.18 150 / 0.7)">S {data.min.toFixed(4)}</text>

            <path d={data.area} fill="url(#chartFill)" />
            <path d={data.path} fill="none" stroke={positive ? "var(--color-bull)" : "var(--color-bear)"} strokeWidth="1.6" />
            <path d={data.ema9Path} fill="none" stroke="var(--color-primary)" strokeWidth="1.2" opacity="0.85" />
            <path d={data.ema21Path} fill="none" stroke="var(--color-accent)" strokeWidth="1.2" opacity="0.85" />
            {/* live dot */}
            {(() => {
              const x = data.w;
              const y = data.h - ((data.last - data.min) / (data.max - data.min || 1)) * (data.h - 30) - 15;
              return (
                <g>
                  <circle cx={x - 2} cy={y} r="6" fill={positive ? "var(--color-bull)" : "var(--color-bear)"} opacity="0.25">
                    <animate attributeName="r" values="4;9;4" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x - 2} cy={y} r="3" fill={positive ? "var(--color-bull)" : "var(--color-bear)"} />
                </g>
              );
            })()}
          </svg>
        ) : (
          <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
            <Activity className="mr-2 h-4 w-4 animate-pulse" /> Streaming ticks…
          </div>
        )}
      </div>
    </div>
  );
}
