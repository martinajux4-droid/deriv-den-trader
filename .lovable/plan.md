## Manual Trading Terminal — Premium Strategy Pages

Build a dedicated **Manual Trading Terminal** with one clean page per strategy (Even/Odd, Over/Under, Matches/Differs, Rise/Fall), inspired by hifextrader.com but redesigned for an institutional, Apple-clean, Bloomberg-grade feel.

### New routes (file-based, TanStack)

```
src/routes/_authenticated/manual.tsx              -> /manual (hub: 4 strategy cards)
src/routes/_authenticated/manual.even-odd.tsx     -> /manual/even-odd
src/routes/_authenticated/manual.over-under.tsx   -> /manual/over-under
src/routes/_authenticated/manual.matches-differs.tsx -> /manual/matches-differs
src/routes/_authenticated/manual.rise-fall.tsx    -> /manual/rise-fall
```

Add **Manual Terminal** entry to `AppShell` sidebar nav.

### Shared layout

Each strategy page uses `ManualStrategyLayout`:
- Top: market selector (volatility indices) + live price ticker
- Left/Center: **Market Meter** (strategy-specific visualization)
- Right (or below on mobile): **Trade Inputs** (Stake, Take Profit, Max Loss, Martingale, Ticks) + collapsible "Advanced" (Duration, Digit prediction, Risk multiplier)
- Action buttons: START / STOP / SAFE MODE
- Bottom: AI Momentum strip + compact Trade History table

Mobile: single column, large tap targets, glass cards, sticky action bar.

### New components

- `src/components/manual/ManualStrategyLayout.tsx` — shared shell (header, background, bottom history, action bar)
- `src/components/manual/MarketMeter.tsx` — wraps strategy-specific meters
- `src/components/manual/meters/EvenOddDial.tsx` — circular watch-style dial (blue/red split)
- `src/components/manual/meters/OverUnderHistogram.tsx` — twin histogram bars + probability curve
- `src/components/manual/meters/DigitFrequencyMatrix.tsx` — 0-9 frequency grid + heatmap
- `src/components/manual/meters/RiseFallPressure.tsx` — bull/bear dominance gauge + wave
- `src/components/manual/TradeInputs.tsx` — minimal form (stake, TP, ML, martingale, ticks) + collapsible advanced
- `src/components/manual/AIMomentumStrip.tsx` — momentum %, trend pressure, entry quality, confidence, readiness with status text
- `src/components/manual/LivePriceStream.tsx` — large smooth animated digits, glow transitions
- `src/components/manual/ManualHistoryTable.tsx` — compact rows; filter by strategy; clear + export CSV
- `src/components/manual/ActionButtons.tsx` — START / STOP / SAFE MODE with glow

Color tokens (added to `src/styles.css`):
- `--meter-bull` (blue), `--meter-bear` (red), `--meter-momentum` (cyan), `--meter-ai` (gold)
- `--glass-bg`, `--glass-border` for unified glassmorphism

### Logic / data

- Reuse `useTicks`, `useDeriv`, `analyze()` from `src/lib/ai-analysis.ts`, and `digitStats()` for digit pages.
- Manual trading uses `client.getProposal` + `buyContract` (same pattern as `TradePanel.tsx`); each strategy maps to its contract types:
  - Even/Odd → `DIGITEVEN` / `DIGITODD`
  - Over/Under → `DIGITOVER` / `DIGITUNDER`
  - Matches/Differs → `DIGITMATCH` / `DIGITDIFF`
  - Rise/Fall → `CALL` / `PUT`
- Auto-trading loop with martingale + TP/ML stop is local to the strategy page (lightweight, no changes to `bot-engine.ts`).
- Trade history reads from `trades` table filtered by `contract_type`.

### Out of scope (this iteration)

- Server-side migrations (none needed — `trades` table already supports all contract types)
- Sound engine changes (already exists)
- Existing `/bot` automated dashboard stays untouched
