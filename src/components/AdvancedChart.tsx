import { useMemo, useState } from "react";
import { useTicks } from "@/hooks/use-ticks";
import { analyze } from "@/lib/ai-analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, Eye, EyeOff, Brain } from "lucide-react";
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

function rsiSeries(values: number[], period = 14) {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period) { out.push(50); continue; }
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = values[j] - values[j - 1];
      if (d >= 0) gains += d; else losses -= d;
    }
    const rs = gains / (losses || 1e-9);
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

function bollinger(values: number[], period = 20, mult = 2) {
  const upper: number[] = [], lower: number[] = [], mid: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - period + 1);
    const slice = values.slice(start, i + 1);
    const m = slice.reduce((a, b) => a + b, 0) / slice.length;
    const v = slice.reduce((a, b) => a + (b - m) ** 2, 0) / slice.length;
    const sd = Math.sqrt(v);
    mid.push(m); upper.push(m + sd * mult); lower.push(m - sd * mult);
  }
  return { upper, lower, mid };
}

export function AdvancedChart({ symbol, name }: { symbol: string; name: string }) {
  const [count, setCount] = useState(120);
  const [showBoll, setShowBoll] = useState(true);
  const [showAi, setShowAi] = useState(true);
  const ticks = useTicks(symbol, count);
  const quotes = useMemo(() => ticks.map((t) => t.quote), [ticks]);
  const ai = useMemo(() => analyze(quotes), [quotes]);

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

    const e9 = ema(quotes, 9).map((v, i) => [i * stepX, toY(v)] as const);
    const e21 = ema(quotes, 21).map((v, i) => [i * stepX, toY(v)] as const);
    const ema9Path = e9.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const ema21Path = e21.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

    const b = bollinger(quotes);
    const upPath = b.upper.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(2)},${toY(v).toFixed(2)}`).join(" ");
    const lowPath = b.lower.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(2)},${toY(v).toFixed(2)}`).join(" ");
    const bandArea = upPath + " " + b.lower.slice().reverse().map((v, k) => {
      const i = b.lower.length - 1 - k;
      return `L${(i * stepX).toFixed(2)},${toY(v).toFixed(2)}`;
    }).join(" ") + " Z";

    const last = quotes[quotes.length - 1];
    const first = quotes[0];
    const change = last - first;
    const pct = (change / first) * 100;
    const dir = change >= 0 ? "up" : "down";

    const rs = rsiSeries(quotes);
    const rsiVal = rs[rs.length - 1];
    // RSI sub-pane
    const rsiH = 60;
    const rsiToY = (v: number) => rsiH - (v / 100) * rsiH;
    const rsiPath = rs.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(2)},${rsiToY(v).toFixed(2)}`).join(" ");

    return { w, h, path, area, ema9Path, ema21Path, upPath, lowPath, bandArea, last, change, pct, dir, rsiVal, rsiPath, rsiH, min, max, supY: toY(min), resY: toY(max) };
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 text-[11px] text-muted-foreground md:flex">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> EMA 9</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> EMA 21</span>
            {data?.rsiVal != null && (
              <Badge variant="outline" className="num text-[10px]">RSI {data.rsiVal.toFixed(0)}</Badge>
            )}
            {ai && (
              <Badge variant="outline" className={cn("num text-[10px]",
                ai.recommendation === "RISE" && "border-bull/40 text-bull",
                ai.recommendation === "FALL" && "border-bear/40 text-bear")}>
                <Brain className="mr-1 h-3 w-3"/> {ai.recommendation} · {ai.confidence}%
              </Badge>
            )}
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
            onClick={() => setShowBoll((v) => !v)}>
            {showBoll ? <Eye className="mr-1 h-3 w-3"/> : <EyeOff className="mr-1 h-3 w-3"/>} BB
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
            onClick={() => setShowAi((v) => !v)}>
            {showAi ? <Eye className="mr-1 h-3 w-3"/> : <EyeOff className="mr-1 h-3 w-3"/>} AI
          </Button>
          <div className="flex rounded-md border border-border bg-background/40 p-0.5">
            {COUNT_OPTIONS.map((o) => (
              <Button key={o.count} size="sm" variant="ghost"
                onClick={() => setCount(o.count)}
                className={cn("h-7 px-2 text-xs", count === o.count && "bg-primary/15 text-primary")}>
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        {data ? (
          <>
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

            {/* Bollinger band */}
            {showBoll && (
              <>
                <path d={data.bandArea} fill="oklch(0.7 0.18 250 / 0.08)" />
                <path d={data.upPath} fill="none" stroke="oklch(0.7 0.18 250 / 0.45)" strokeWidth="1" strokeDasharray="2 3" />
                <path d={data.lowPath} fill="none" stroke="oklch(0.7 0.18 250 / 0.45)" strokeWidth="1" strokeDasharray="2 3" />
              </>
            )}

            {/* support / resistance */}
            <line x1="0" x2={data.w} y1={data.resY} y2={data.resY} stroke="oklch(0.65 0.22 25 / 0.3)" strokeDasharray="4 4" />
            <line x1="0" x2={data.w} y1={data.supY} y2={data.supY} stroke="oklch(0.74 0.18 150 / 0.3)" strokeDasharray="4 4" />
            <text x="8" y={data.resY - 4} fontSize="10" fill="oklch(0.65 0.22 25 / 0.7)">R {data.max.toFixed(4)}</text>
            <text x="8" y={data.supY - 4} fontSize="10" fill="oklch(0.74 0.18 150 / 0.7)">S {data.min.toFixed(4)}</text>

            <path d={data.area} fill="url(#chartFill)" />
            <path d={data.path} fill="none" stroke={positive ? "var(--color-bull)" : "var(--color-bear)"} strokeWidth="1.6" />
            <path d={data.ema9Path} fill="none" stroke="var(--color-primary)" strokeWidth="1.2" opacity="0.85" />
            <path d={data.ema21Path} fill="none" stroke="var(--color-accent)" strokeWidth="1.2" opacity="0.85" />

            {/* AI overlay */}
            {showAi && ai && ai.recommendation !== "WAIT" && (() => {
              const y = data.h - ((data.last - data.min) / (data.max - data.min || 1)) * (data.h - 30) - 15;
              const isUp = ai.recommendation === "RISE";
              const stroke = isUp ? "var(--color-bull)" : "var(--color-bear)";
              return (
                <g>
                  <rect x={data.w - 220} y={10} width={210} height={42} rx={8}
                    fill="oklch(0.18 0.02 260 / 0.85)" stroke={stroke} strokeOpacity="0.6" />
                  <text x={data.w - 210} y={28} fontSize="11" fill={stroke} fontWeight="600">
                    AI · {ai.recommendation} · {ai.confidence}%
                  </text>
                  <text x={data.w - 210} y={44} fontSize="10" fill="oklch(0.85 0 0 / 0.85)">
                    Entry {ai.entryScore} · Risk {ai.riskScore}
                  </text>
                  <line x1="0" x2={data.w - 240} y1={y} y2={y} stroke={stroke} strokeOpacity="0.35" strokeDasharray="3 4" />
                </g>
              );
            })()}

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

          {/* RSI sub-pane */}
          <div className="border-t border-border/60 px-1">
            <svg viewBox={`0 0 ${data.w} ${data.rsiH}`} className="block h-[60px] w-full">
              <line x1="0" x2={data.w} y1={data.rsiH * 0.3} y2={data.rsiH * 0.3} stroke="oklch(0.65 0.22 25 / 0.25)" strokeDasharray="2 3" />
              <line x1="0" x2={data.w} y1={data.rsiH * 0.7} y2={data.rsiH * 0.7} stroke="oklch(0.74 0.18 150 / 0.25)" strokeDasharray="2 3" />
              <path d={data.rsiPath} fill="none" stroke="var(--color-primary)" strokeWidth="1.2" />
              <text x="6" y="12" fontSize="9" fill="oklch(0.7 0 0 / 0.6)">RSI 14</text>
              <text x="6" y={data.rsiH * 0.3 - 2} fontSize="9" fill="oklch(0.65 0.22 25 / 0.7)">70</text>
              <text x="6" y={data.rsiH * 0.7 - 2} fontSize="9" fill="oklch(0.74 0.18 150 / 0.7)">30</text>
            </svg>
          </div>
          </>
        ) : (
          <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
            <Activity className="mr-2 h-4 w-4 animate-pulse" /> Streaming ticks…
          </div>
        )}
      </div>
    </div>
  );
}
