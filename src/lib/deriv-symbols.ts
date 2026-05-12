export type DerivSymbol = {
  symbol: string;
  name: string;
  group: string;
};

export const DERIV_SYMBOLS: DerivSymbol[] = [
  { symbol: "R_10", name: "Volatility 10 Index", group: "Standard" },
  { symbol: "R_25", name: "Volatility 25 Index", group: "Standard" },
  { symbol: "R_50", name: "Volatility 50 Index", group: "Standard" },
  { symbol: "R_75", name: "Volatility 75 Index", group: "Standard" },
  { symbol: "R_100", name: "Volatility 100 Index", group: "Standard" },
  { symbol: "1HZ10V", name: "Volatility 10 (1s) Index", group: "1-second" },
  { symbol: "1HZ25V", name: "Volatility 25 (1s) Index", group: "1-second" },
  { symbol: "1HZ50V", name: "Volatility 50 (1s) Index", group: "1-second" },
  { symbol: "1HZ75V", name: "Volatility 75 (1s) Index", group: "1-second" },
  { symbol: "1HZ100V", name: "Volatility 100 (1s) Index", group: "1-second" },
  { symbol: "BOOM1000", name: "Boom 1000 Index", group: "Boom & Crash" },
  { symbol: "BOOM500", name: "Boom 500 Index", group: "Boom & Crash" },
  { symbol: "CRASH1000", name: "Crash 1000 Index", group: "Boom & Crash" },
  { symbol: "CRASH500", name: "Crash 500 Index", group: "Boom & Crash" },
];

export const CONTRACT_TYPES = [
  { id: "CALL", name: "Rise", pair: "PUT", group: "Up/Down" },
  { id: "PUT", name: "Fall", pair: "CALL", group: "Up/Down" },
  { id: "DIGITOVER", name: "Digit Over", group: "Digits" },
  { id: "DIGITUNDER", name: "Digit Under", group: "Digits" },
  { id: "DIGITEVEN", name: "Even", group: "Digits" },
  { id: "DIGITODD", name: "Odd", group: "Digits" },
  { id: "DIGITMATCH", name: "Matches", group: "Digits" },
  { id: "DIGITDIFF", name: "Differs", group: "Digits" },
] as const;
