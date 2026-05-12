## Scope

This is a very large upgrade touching the bot engine, trade terminal, market watch, risk management, AI analysis, history/analytics, and global UI polish. To ship it well without a 30-minute mega-edit that risks breaking the working Deriv connection, I'll deliver it in **3 sequenced phases**. Each phase is independently shippable and testable on your demo account before moving to the next.

---

### Phase 1 — Engine & Risk (highest impact, fixes real bugs)

Goal: bot becomes safe, smart, and stops failing on "duration not offered".

1. **Contract validator** — new `src/lib/deriv-contracts.ts` that calls Deriv `contracts_for` once per symbol, caches supported `contract_type` + `duration`/`duration_unit` ranges. Bot auto-snaps duration into the supported range and skips strategies the symbol doesn't support. Eliminates the "Trading is not offered for this duration" error.
2. **AI analysis core** — new `src/lib/ai-analysis.ts` with one shared engine producing: trend dir & strength, momentum, volatility (stdev of returns), buy/sell pressure, RSI, EMA9/21 cross, support/resistance from rolling extremes, reversal probability, confidence %, entry score, risk score, plain-English recommendation. Used by signals, insights, and the bot.
3. **Bot engine v2** (`src/lib/bot-engine.ts` rewrite) with:
   - Modes: **safe / normal / aggressive** + **auto / semi-auto / manual**
   - Risk: take-profit, stop-loss, daily target, max drawdown, max trades, max consecutive losses (auto-pause), cooldown after losses, smart-recovery, emergency stop
   - Stake: fixed, smart-adjust (scale by AI confidence), martingale, anti-martingale
   - Strategies: Rise/Fall AI, Even/Odd AI, Over/Under AI, Trend Following, Smart Scalping, Momentum, Sniper Entry, Breakout, Reversal, S/R Bounce, Volatility Spike Hunter
   - States surfaced live: `scanning | waiting_entry | executing | managing | paused | risk_lock | stopped`
   - Only fires when AI confidence ≥ user threshold

### Phase 2 — Bot Console & Trade Terminal UI

4. **Bot console** (`/bot`) redesign: glass cards, strategy picker grid (each card shows win rate / confidence / risk / recommended market / expected ROI), risk manager panel, live status pill, P&L curve, recent decisions log, Start / Stop / **Pause** / **Resume** / **Emergency Stop** controls.
5. **Trade terminal** (`/trade`) redesign: bigger candlestick chart with EMA9/21, RSI sub-pane, Bollinger Bands toggle, S/R overlays, AI overlay (entry zones), floating order panel, live activity stream, market heatmap strip.
6. **Market watch** expanded: V10, V25, V50, V75, V100, Boom 300/500/1000, Crash 300/500/1000 — each tile shows price, mini sparkline, AI signal, trend arrow, buy/sell pressure bars, volatility score, sentiment label.

### Phase 3 — Analytics & Polish

7. **History & analytics** (`/history`): P&L curve, daily/weekly bars, win/loss streak tracker, AI-accuracy chart (predicted vs actual), strategy leaderboard, heatmap by hour/day, full trade journal table.
8. **Global polish**: skeleton loaders, glow indicators on live data, floating AI assistant button (uses Lovable AI to answer "what should I trade now?" using the analysis engine), micro-animations, mobile pass.

---

### Technical notes

- All trading still goes through `DerivClient` over WebSocket — no schema changes required.
- AI uses local quantitative heuristics on tick streams (no API calls, instant). I can later wire Lovable AI Gateway for the floating assistant only.
- Bot status keeps using `use-bot-status.ts` so the dashboard widget stays in sync.
- Trades continue to persist to `trades` + `bot_runs` tables (already exist with RLS).
- No DB migrations needed for phase 1–3.

---

### Confirm before I start

I'll begin with **Phase 1** now if you say "go". Want any of these tweaked first?

- Skip a phase or reorder?
- Drop any strategy from the list?
- Default risk preset (safe / normal / aggressive)?