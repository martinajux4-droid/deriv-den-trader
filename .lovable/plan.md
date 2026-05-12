## Deriv Trading System — Build Plan

A web app to trade Deriv synthetic indices (Volatility 10/25/50/75/100, etc.) with a manual panel and an automated bot, secured by user accounts.

### What you'll get

1. **Login / Signup** (email + Google) — your own user account in the app.
2. **Connect Deriv** — one-click OAuth to link your Deriv account (demo or real). Tokens stored encrypted per user.
3. **Live dashboard** — real-time price ticks, account balance, open positions.
4. **Manual trading panel**
   - Symbol picker (Volatility 10/25/50/75/100, 1s variants)
   - Contract types: Rise/Fall, Higher/Lower, Matches/Differs, Even/Odd, Over/Under
   - Stake, duration (ticks/seconds), one-click Buy
   - Live tick chart
5. **Bot builder + runner**
   - Strategy presets: Rise/Fall trend follower, Digit Over/Under, Martingale
   - Configurable: symbol, stake, take-profit, stop-loss, max trades, martingale multiplier
   - Start/Stop, live status, trade-by-trade log
6. **Trade history & P&L** — every trade saved, filterable, daily P&L summary.
7. **Settings** — switch between linked Deriv accounts (demo/real), default stake, risk limits.

### Important — what you need to do once

Deriv requires you to register an "app" to get an OAuth `app_id`:
- Go to https://api.deriv.com/dashboard/ → Register application
- Set OAuth redirect URL to your app's `/auth/deriv/callback` URL
- Paste the `app_id` into the app's Settings page (it's public, not a secret)

I'll ship with Deriv's public test `app_id` (1089) so you can try it immediately on demo, and a settings field to swap in your own.

### Design direction

Trading-app aesthetic: dark theme, dense data, monospace numerics, green/red P&L, subtle motion on price changes. Inspired by Deriv DTrader and Binance pro UI.

### Technical details

- **Stack**: TanStack Start (existing) + Lovable Cloud (Supabase) for auth & DB.
- **Deriv API**: WebSocket `wss://ws.derivws.com/websockets/v3?app_id=...` — connection lives in the browser (per-user token), wrapped in a typed React client with auto-reconnect.
- **OAuth flow**: Redirect to `https://oauth.deriv.com/oauth2/authorize?app_id=...&l=EN`; Deriv returns tokens in URL params (`token1`, `acct1`, `cur1`...). Callback route parses, saves to `deriv_accounts` table via authenticated server function.
- **Bot runner**: Browser-side loop driven by tick subscription; each completed contract written to `trades` table via server function. (Browser-runner means the bot only runs while the tab is open — fine for v1; a server-side runner would need a long-lived worker, out of scope.)
- **DB tables** (RLS, user-scoped):
  - `profiles` (id, display_name)
  - `deriv_accounts` (user_id, loginid, currency, is_virtual, token, is_active)
  - `strategies` (user_id, name, type, config jsonb)
  - `bot_runs` (user_id, strategy_id, status, started_at, stopped_at, pnl)
  - `trades` (user_id, bot_run_id nullable, contract_id, symbol, contract_type, stake, payout, profit, entry_spot, exit_spot, status, opened_at, closed_at)
- **Routes**: `/` (landing), `/login`, `/auth/deriv/callback`, `/_authenticated/dashboard`, `/trade`, `/bot`, `/history`, `/settings`.
- **Roles**: standard `user_roles` table + `has_role` security-definer function (no admin features in v1, but scaffolded).

### Build order

1. Enable Lovable Cloud, set up auth (email + Google) and DB schema with RLS.
2. Design system + app shell (dark trading theme, sidebar nav).
3. Landing + login pages.
4. Deriv WebSocket client + OAuth connect flow + account switcher.
5. Manual trade panel with live ticks.
6. Bot builder + runner + live log.
7. Trade history page + dashboard summary.
8. Settings (app_id, default stake, risk limits).

### Honest caveats

- Trading real money is risky. The bot is a browser-side script — it stops if you close the tab. I'll add clear warnings and default to demo accounts.
- Deriv OAuth tokens are stored in your DB; protected by RLS so only you can read your own.
- Google sign-in requires the default Lovable Cloud Google provider (no extra setup from you).
