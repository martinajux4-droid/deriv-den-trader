import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DERIV_SYMBOLS } from "@/lib/deriv-symbols";
import { AdvancedChart } from "@/components/AdvancedChart";
import { TradePanel } from "@/components/TradePanel";
import { MarketWatchGrid } from "@/components/MarketWatchGrid";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { ActiveTradesPanel } from "@/components/ActiveTradesPanel";
import { useDeriv } from "@/hooks/use-deriv";

export const Route = createFileRoute("/_authenticated/trade")({
  component: Trade,
});

function Trade() {
  const { profile } = useDeriv();
  const [symbol, setSymbol] = useState<string>(profile?.default_symbol || "R_100");
  const meta = DERIV_SYMBOLS.find((s) => s.symbol === symbol);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trade Terminal</h1>
          <p className="text-xs text-muted-foreground">
            Institutional execution · live ticks · AI overlays · multi-timeframe analysis
          </p>
        </div>
      </div>

      {/* Market heatmap strip */}
      <MarketWatchGrid selected={symbol} onSelect={setSymbol} />

      {/* Main terminal: chart + floating order panel */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <AdvancedChart symbol={symbol} name={meta?.name || symbol} />
          <AIInsightsPanel symbol={symbol} name={meta?.name || symbol} />
        </div>
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <TradePanel symbol={symbol} />
          <ActiveTradesPanel />
        </div>
      </div>
    </div>
  );
}
