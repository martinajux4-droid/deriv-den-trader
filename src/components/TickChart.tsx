import { useEffect, useRef, useState } from "react";
import { useDeriv } from "@/hooks/use-deriv";

export function TickChart({ symbol }: { symbol: string }) {
  const { client, status } = useDeriv();
  const [ticks, setTicks] = useState<{ epoch: number; quote: number }[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    if (!client || status !== "open") return;
    let off: (() => void) | null = null;
    setTicks([]);
    (async () => {
      try {
        // history
        const res = await client.send({ ticks_history: symbol, count: 60, end: "latest", style: "ticks" });
        if (res.history) {
          const arr = res.history.times.map((t: number, i: number) => ({ epoch: t, quote: Number(res.history.prices[i]) }));
          setTicks(arr);
          setLast(arr[arr.length - 1]?.quote ?? null);
        }
        off = await client.subscribeTicks(symbol, (t) => {
          setTicks((cur) => {
            const next = [...cur, { epoch: t.epoch, quote: t.quote }];
            return next.slice(-120);
          });
          setPrev(last);
          setLast(t.quote);
        });
      } catch (e) { console.error(e); }
    })();
    return () => { off?.(); };
  }, [client, status, symbol]);

  const min = Math.min(...ticks.map((t) => t.quote), Infinity);
  const max = Math.max(...ticks.map((t) => t.quote), -Infinity);
  const w = 800, h = 200;
  const path = ticks.length
    ? ticks.map((t, i) => {
        const x = (i / Math.max(1, ticks.length - 1)) * w;
        const y = max === min ? h / 2 : h - ((t.quote - min) / (max - min)) * (h - 10) - 5;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(" ")
    : "";

  const dir = last !== null && prev !== null ? (last >= prev ? "up" : "down") : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{symbol}</div>
          <div className={`num text-3xl font-semibold ${dir === "up" ? "bull" : dir === "down" ? "bear" : ""}`}>
            {last !== null ? last.toFixed(4) : "—"}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{ticks.length} ticks</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-40 w-full">
        <path d={path} fill="none" stroke={dir === "down" ? "var(--color-bear)" : "var(--color-bull)"} strokeWidth="1.5" />
      </svg>
    </div>
  );
}
