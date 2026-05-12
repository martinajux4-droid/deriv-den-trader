import { useEffect, useState } from "react";
import { useDeriv } from "./use-deriv";

export type Tick = { epoch: number; quote: number };

export function useTicks(symbol: string, count = 60) {
  const { client, status } = useDeriv();
  const [ticks, setTicks] = useState<Tick[]>([]);

  useEffect(() => {
    if (!client || status !== "open") return;
    let off: (() => void) | null = null;
    let cancelled = false;
    setTicks([]);
    (async () => {
      try {
        const res = await client.send({ ticks_history: symbol, count, end: "latest", style: "ticks" });
        if (cancelled) return;
        if (res.history) {
          const arr: Tick[] = res.history.times.map((t: number, i: number) => ({
            epoch: t,
            quote: Number(res.history.prices[i]),
          }));
          setTicks(arr);
        }
        off = await client.subscribeTicks(symbol, (t) => {
          setTicks((cur) => {
            const next = [...cur, { epoch: t.epoch, quote: t.quote }];
            return next.slice(-count);
          });
        });
      } catch (e) {
        console.error("[useTicks]", e);
      }
    })();
    return () => {
      cancelled = true;
      off?.();
    };
  }, [client, status, symbol, count]);

  return ticks;
}
