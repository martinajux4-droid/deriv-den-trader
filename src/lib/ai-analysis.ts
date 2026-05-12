// Shared AI / quantitative analysis engine. Pure functions over a tick stream.
// Used by the bot, signals panel, and insights panel so every surface speaks
// the same language.

export type Analysis = {
  trendDir: "UP" | "DOWN" | "FLAT";
  trendStrength: number;     // 0..100
  momentum: number;          // % change last N
  volatility: number;        // 0..100 (scaled stdev)
  rsi: number;               // 0..100
  ema9: number;
  ema21: number;
  emaCross: "GOLDEN" | "DEATH" | "NONE";
  support: number;
  resistance: number;
  buyPressure: number;       // 0..100
  sellPressure: number;      // 0..100
  reversalProb: number;      // 0..100
  continuationProb: number;  // 0..100
  confidence: number;        // 0..100
  entryScore: number;        // 0..100
  riskScore: number;         // 0..100
  sentiment: "Bullish" | "Bearish" | "Neutral";
  recommendation: "RISE" | "FALL" | "WAIT";
  recommendationText: string;
  last: number;
};

function ema(values: number[], period: number): number {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let v = values[0];
  for (let i = 1; i < values.length; i++) v = values[i] * k + v * (1 - k);
  return v;
}

function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  if (gains + losses === 0) return 50;
  const rs = gains / Math.max(1e-9, losses);
  return 100 - 100 / (1 + rs);
}

export function analyze(quotes: number[]): Analysis | null {
  if (quotes.length < 12) return null;
  const last = quotes[quotes.length - 1];
  const window = quotes.slice(-30);
  const first = window[0];
  const momentum = ((last - first) / first) * 100;

  const rets: number[] = [];
  for (let i = 1; i < window.length; i++) rets.push((window[i] - window[i - 1]) / window[i - 1]);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  const stdev = Math.sqrt(variance);
  const volatility = Math.min(100, stdev * 50_000);

  const e9 = ema(window, 9);
  const e21 = ema(window, 21);
  const emaCross: Analysis["emaCross"] = e9 > e21 * 1.0002 ? "GOLDEN" : e9 < e21 * 0.9998 ? "DEATH" : "NONE";

  const r = rsi(window);
  const support = Math.min(...window);
  const resistance = Math.max(...window);

  const ups = rets.filter((x) => x > 0).length;
  const buyPressure = Math.round((ups / rets.length) * 100);
  const sellPressure = 100 - buyPressure;

  const trendStrength = Math.min(100, Math.abs(momentum) * 25 + Math.abs(e9 - e21) / Math.max(1e-9, e21) * 5000);
  const trendDir: Analysis["trendDir"] = momentum > 0.02 ? "UP" : momentum < -0.02 ? "DOWN" : "FLAT";

  // RSI extremes hint reversal
  const rsiExtreme = r >= 70 ? r - 70 : r <= 30 ? 30 - r : 0; // 0..30
  const reversalProb = Math.min(95, rsiExtreme * 2 + (100 - trendStrength) * 0.3);
  const continuationProb = Math.min(95, trendStrength * 0.7 + (50 - Math.abs(50 - r)) * 0.4);

  const confidence = Math.round(Math.max(50, Math.min(97, 55 + trendStrength * 0.35 + Math.abs(buyPressure - 50) * 0.4)));
  const entryScore = Math.round(Math.max(0, Math.min(100, continuationProb * 0.6 + confidence * 0.4)));
  const riskScore = Math.round(Math.max(5, Math.min(95, volatility * 0.5 + (100 - confidence) * 0.5)));

  const sentiment: Analysis["sentiment"] =
    buyPressure >= 58 ? "Bullish" : buyPressure <= 42 ? "Bearish" : "Neutral";

  let recommendation: Analysis["recommendation"] = "WAIT";
  let recommendationText = "Range conditions — wait for breakout confirmation.";
  if (trendDir === "UP" && emaCross !== "DEATH" && buyPressure >= 55 && r < 75) {
    recommendation = "RISE";
    recommendationText = `Bullish continuation favored on ${trendStrength.toFixed(0)}% trend strength.`;
  } else if (trendDir === "DOWN" && emaCross !== "GOLDEN" && buyPressure <= 45 && r > 25) {
    recommendation = "FALL";
    recommendationText = `Downside pressure dominant — ${(100 - buyPressure)}% sell flow.`;
  } else if (rsiExtreme > 15) {
    recommendation = r >= 70 ? "FALL" : "RISE";
    recommendationText = `RSI ${r.toFixed(0)} extreme — possible reversal zone.`;
  }

  return {
    trendDir, trendStrength, momentum, volatility, rsi: r, ema9: e9, ema21: e21, emaCross,
    support, resistance, buyPressure, sellPressure, reversalProb, continuationProb,
    confidence, entryScore, riskScore, sentiment, recommendation, recommendationText, last,
  };
}

// Last-digit utilities for digit strategies
export function digitStats(quotes: number[]): { even: number; odd: number; over5: number; under5: number; lastDigit: number } {
  const digits = quotes.map((q) => Number(String(q.toFixed(5)).replace(".", "").slice(-1)));
  const even = digits.filter((d) => d % 2 === 0).length / Math.max(1, digits.length) * 100;
  const over5 = digits.filter((d) => d > 5).length / Math.max(1, digits.length) * 100;
  return {
    even: Math.round(even),
    odd: Math.round(100 - even),
    over5: Math.round(over5),
    under5: Math.round(100 - over5),
    lastDigit: digits[digits.length - 1] ?? 0,
  };
}
