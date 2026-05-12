import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DERIV_SYMBOLS } from "@/lib/deriv-symbols";
import { TickChart } from "@/components/TickChart";
import { TradePanel } from "@/components/TradePanel";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeriv } from "@/hooks/use-deriv";

export const Route = createFileRoute("/_authenticated/trade")({
  component: Trade,
});

function Trade() {
  const { profile } = useDeriv();
  const [symbol, setSymbol] = useState<string>(profile?.default_symbol || "R_100");

  const groups = Array.from(new Set(DERIV_SYMBOLS.map((s) => s.group)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Trade</h1>
        <Select value={symbol} onValueChange={setSymbol}>
          <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectGroup key={g}>
                <SelectLabel>{g}</SelectLabel>
                {DERIV_SYMBOLS.filter((s) => s.group === g).map((s) => (
                  <SelectItem key={s.symbol} value={s.symbol}>{s.name}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <TickChart symbol={symbol} />
        <TradePanel symbol={symbol} />
      </div>
    </div>
  );
}
