import { MarketWatchTile } from "./MarketWatchTile";

const WATCHLIST = [
  { symbol: "R_10",       name: "Volatility 10" },
  { symbol: "R_25",       name: "Volatility 25" },
  { symbol: "R_50",       name: "Volatility 50" },
  { symbol: "R_75",       name: "Volatility 75" },
  { symbol: "R_100",      name: "Volatility 100" },
  { symbol: "BOOM300N",   name: "Boom 300" },
  { symbol: "BOOM500",    name: "Boom 500" },
  { symbol: "BOOM1000",   name: "Boom 1000" },
  { symbol: "CRASH300N",  name: "Crash 300" },
  { symbol: "CRASH500",   name: "Crash 500" },
  { symbol: "CRASH1000",  name: "Crash 1000" },
];

export function MarketWatchGrid({
  selected, onSelect,
}: { selected: string; onSelect: (s: string) => void; }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-11">
      {WATCHLIST.map((m) => (
        <MarketWatchTile
          key={m.symbol}
          symbol={m.symbol}
          name={m.name}
          selected={selected === m.symbol}
          onClick={() => onSelect(m.symbol)}
        />
      ))}
    </div>
  );
}
