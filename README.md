# SEE Portfolio

A lightweight investment research prototype built with **Next.js 16, React 19, TypeScript, and Tailwind CSS 4**.

> **Data notice:** Holdings can now read directly from your Alpaca **Paper Trading** account after local configuration. Other research views and news remain demo placeholders. No real-money trading, order execution, AI scoring, or notifications are connected.

## Development

Requires Node.js 22 or later.

```bash
npm ci
cp .env.example .env.local
# Open .env.local in your text editor and enter your Alpaca PAPER keys.
npm run dev
```

Open http://localhost:3000.

Run the checks before merging:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

GitHub Actions runs these checks automatically on pull requests and pushes.

## Research Stock Report chart v0.2 — OHLCV and interactive history

In **Research → Stock Reports**, the previous fixed daily-close line is replaced with an interactive price/volume chart:

- **1D:** most recent IEX session in 5-minute OHLCV bars; **5D:** last five IEX sessions in 15-minute bars.
- **1M / 1Y:** daily OHLCV bars; **All:** weekly OHLCV bars requested since **2016-01-01** (up to available Alpaca coverage). Intraday ranges omit the latest 20 minutes; daily/weekly ranges omit the current potentially incomplete New York market date.
- Modes: **Candles**, **Line**, **OHLC Bars**; separate **Volume On/Off** histogram.
- Move the pointer to inspect timestamp, Open, High, Low, Close and IEX volume. Drag across the SVG to select/zoom a date interval; after zoom, **Shift+drag** or left/right arrow buttons to pan, **Reset zoom** to return. Keyboard Left/Right moves the crosshair and Escape resets zoom.
- OHLC and **volume are actual historical Alpaca IEX exchange bars**, not simulated candles or consolidated US market volume. Bars are split-adjusted. Incomplete API pagination, invalid bars and no-data ranges never create fake data.
- The chart uses a separate `GET /api/research/chart?symbol=AAPL&range=1M` API and the same existing local-only Alpaca Paper credentials. Company risk statistics and the original daily close in Stock Reports are **unchanged** and independently calculated from their existing history.
- There are no new client chart dependencies or API accounts needed. Market-data permissions, exchange coverage and rate limits still apply.

## Research beta — real company lookup, watchlist, reports and news

Research is **separate from Portfolio**. It does not change Alpaca holdings, portfolio P/L, VaR/ES, or projected dividends.

- **Stock Search:** type a ticker or company name. The local server queries Alpaca Paper's active US-equity asset directory (15-minute in-process cache) and ranks exact ticker / ticker prefix / company-name matches. Only verified records can be added.
- **My Watchlist:** follow up to 30 US equity/ETF assets, remove tickers and open their reports. The list lives in browser \`localStorage\` under \`see-research-watchlist-v1\`, separate from the existing demo/brief watchlist key. No server-side user accounts yet; browser/device-specific.
- **Stock Reports:** last available split-adjusted daily **IEX** closes (not a live consolidated price); chart and price change; individual-stock historical volatility, max drawdown and 1-day historical VaR95 / ES95 computed from the existing pure TypeScript Risk Engine. Require 30 observations for volatility/drawdown and 200 for VaR/ES. A $100 notional used internally for return math is **not** an actual holding, and no dollar P/L is generated.
- **News & Updates:** recent Alpaca-supplied headlines, summaries, publication information and source links for followed stocks; articles also appear in the individual report. Not AI-generated and no notifications are sent.
- **Not yet built:** validated 12-month expected return, forward dividend forecasts, fundamental valuation and AI-generated summaries. These sections show explicit unavailable states, not fabricated amounts.

Read-only research routes: \`GET /api/research/search?q=\`, \`GET /api/research/report?symbol=\`, \`GET /api/research/news?symbols=\`. They are **disabled in production**, as are the personal Alpaca Portfolio endpoints, until user authentication and authorization are implemented. All API secrets remain on the server. All research endpoints use \`Cache-Control: private, no-store\`; ticker inputs and saved data are validated.

The existing Alpaca Paper environment variables in \`.env.local\` are sufficient. No additional npm packages, data-provider keys or Python environment required. Network/API rate limits and data-plan entitlements still apply.

## Portfolio / Research workspaces

- The global header has two **plain-text, unboxed** workspace choices immediately to the right of the SEE Portfolio brand: **Portfolio** and **Research**.
- Portfolio retains its existing sidebar (Holdings, Analysis, Valuations, Dividends, Returns, Updates, Daily Brief, Settings) and all existing Alpaca/Paper functionality.
- Research has its own sidebar (Stock Search, My Watchlist, Stock Reports, News & Updates), and preserves the user's Portfolio page selection when switching back.
- At this milestone, Research is a clearly labeled foundation/preview only. Verified symbol search, persistent independent watchlists, stock reports and news are the next implementation steps; no demo stocks are treated as real holdings or verified research.
- The mobile research navigation and light/dark styling are also included.

## Project structure

```text
app/
  page.tsx                            # Compose screens and select the active section
  layout.tsx                          # Root HTML shell and metadata
  globals.css                         # Dark/light theme and layout styles
  components/
    layout/navigation.tsx             # Header, blue glass sidebar, mobile navigation
    brief/daily-brief.tsx             # Daily Brief presentation
    settings/
      settings-panel.tsx              # Settings screen composition
      appearance-settings.tsx         # Light/Dark theme choice
      notification-settings.tsx       # Notifications and sensitivity
      regional-settings.tsx           # Language and display currency
      brief-settings.tsx              # Brief sentiment/company filters
      followed-companies-settings.tsx # Sample company watchlist
    portfolio-dashboard.tsx           # Alpaca paper portfolio coordinator
    portfolio/portfolio-overview.tsx  # Original split chart/radar layout, real paper-equity series
    portfolio/paper-equity-chart.tsx  # One actual daily paper equity chart
    settings/alpaca-connection.tsx     # Test connection + instructions
    portfolio/alpaca-portfolio.tsx     # Paper account, positions, equity history
    portfolio/tail-risk.tsx           # Historical VaR95 / ES95 visualization
    portfolio/portfolio-research-metrics.tsx # 12M P/L, unrealized return, forecast placeholders
    portfolio/
      performance-chart.tsx           # Sample performance SVG
      portfolio-overview.tsx          # Chart and placeholder health card
      portfolio-metrics.tsx           # Performance metric cards
      holdings-panel.tsx              # Table, selected holding, detail tabs
      section-placeholder.tsx         # Unbuilt sections
hooks/
  use-preferences.ts                  # Persist browser-only preferences
lib/
  navigation.ts                       # Portfolio navigation item definitions
  demo/
    market.ts                         # Fictional company/news catalog
    portfolio.ts                      # Fictional holdings and formatting helpers
lib/alpaca/
  server.ts                            # Server-only Alpaca API access (GET only)
  types.ts                             # Sanitized API response types
app/api/alpaca/portfolio/route.ts      # Local-only, no-store, read-only endpoint
types/
  app.ts                              # Shared TypeScript types
.github/workflows/verify.yml          # CI: types, lint, production build
```

## Design conventions

- Keep `app/page.tsx` a thin composition layer. Feature components belong in their own folders.
- Shared types live in `types/`. Sample data lives under `lib/demo/`, **never** mix it with real brokerage data without prominent labels.
- Preferences are stored in the **current browser** using existing `see-*-v1` keys; there is no login or database.
- The blue frosted left sidebar is intentionally retained. Main content uses solid, readable dashboard panels in both themes.
- Do not expose API keys in client components, commit credentials, or use a `NEXT_PUBLIC_` prefix for private brokerage secrets.

## Alpaca Paper Trading integration (local only)

**Do not paste your secret into code or commit it to GitHub.** In the project root:

1. Run `cp .env.example .env.local` (once).
2. Open `~/Documents/see_portfolio/.env.local` in VS Code.
3. Replace the two placeholders (`ALPACA_PAPER_KEY_ID` and `ALPACA_PAPER_SECRET_KEY`) with your own **paper** credentials.
4. Save and restart `npm run dev` (`Ctrl+C`, then `npm run dev`). Open Holdings.
5. In **Settings → Connections → Alpaca Paper Trading**, click **Test Alpaca connection** to confirm.

**To change keys later**, edit only `.env.local` and restart the development server.

- The paper host is fixed to `https://paper-api.alpaca.markets`. Live trading is not supported.
- Only GET account, GET positions, and GET account portfolio history are sent. The app reads 1M chart history and separately queries 1A account P/L history.
- The browser receives only sanitized account data; keys are never returned in API responses.
- Until user authentication/authorization exists, the API route is **disabled in production**. Do not deploy this personal account integration publicly.
- The UI always labels paper data as simulated. Real paper account values display in USD; the demo-only CNY conversion is intentionally not applied to Alpaca balances.
- Empty paper positions and API failures never silently fall back to fictional demo holdings.
- Four portfolio insights replace cash/buying-power/previous-equity cards: 12-month forecast (pending validated model), trailing 12-month Alpaca P/L (shows unavailable/partial history instead of inventing a year), projected dividends (zero for no positions; pending data otherwise), and summed unrealized P/L. Alpaca annual P/L may be affected by cash flows.
- Holdings shows exactly one real Alpaca equity history chart in the original top-left layout, preserving the top-right risk/radar placeholder. The duplicate lower history chart and fictional holding/return cards are not shown.

## Risk Engine v0.1 — Analysis

The **Analysis** sidebar item now uses the connected Alpaca Paper positions (local development only):

- Displays current long-US-equity allocation, top-holding concentration, Herfindahl–Hirschman Index (HHI), effective position count, annualized historical volatility and historical maximum drawdown.
- Retrieves up to ~235 calendar days of split-adjusted daily **IEX** stock bars from Alpaca Market Data, using pagination. It requires at least 30 aligned daily returns for history-based metrics.
- The historical risk model creates a **hypothetical buy-and-hold basket initialized with current invested stock weights**, not historical account holdings or realized returns. Cash, deposits/withdrawals, short positions, crypto, derivatives and FX are not modeled.
- Empty accounts display `No open paper positions` with no invented risk scores. Positions outside the supported scope display an explicit unsupported message; missing market data leaves volatility/drawdown unavailable while retaining correct concentration figures.
- No Python, database, or new npm dependency is required. Server API: `/api/alpaca/risk` (disabled in production until user authentication exists).

### Validate the risk math

```bash
node --experimental-strip-types --test tests/risk-engine.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

Unit tests cover single-stock concentration, multi-stock HHI, sample volatility, peak-to-trough drawdown and insufficient price data.

## Risk Engine v0.2 — Historical VaR & Expected Shortfall

- **Historical VaR 95% (one day):** empirical loss threshold at the 5% worst modeled daily outcomes.
- **Expected Shortfall 95% (one day):** average loss across the worst 5% of modeled daily outcomes; positive reported loss magnitudes are floored at zero.
- `k = ceil(0.05 × n)`; use the k-th largest daily loss for VaR and the average of the k largest losses for ES. Both are shown as % of **currently invested long US equity exposure** and USD using current invested market value, **not** total account equity including cash.
- Require **at least 200 aligned daily portfolio returns** (at least 10 tail outcomes). Historical market data lookback requests ~440 calendar days and up to 301 common daily closes; when incomplete, VaR/ES are deliberately unavailable.
- Results describe a hypothetical buy-and-hold basket initialized using **today's** stock weights. These are **in-sample** tail statistics, NOT calibrated probabilities, guaranteed loss limits or actual historical account performance; do not interpret them as a backtested risk model.
- VaR/ES calculations use the existing TypeScript Risk Engine and Alpaca's IEX daily stock bars. No additional services, subscriptions, API keys or languages are required for this milestone.

Run both risk test suites with:

```bash
node --experimental-strip-types --test tests/*.test.mjs
```

**Later improvement:** walk-forward VaR exception backtesting, confidence calibration and stress scenarios before claiming any predictive accuracy.

## Planned integrations (not implemented)

1. Add user authentication and authorization before allowing remote account access.
2. Introduce validated, auditable `lib/analytics/` risk and valuation calculations.
3. Expand market-data coverage and add news ingestion, classification, and notifications.

The development branch and pull request should pass all checks before being merged into `main`.
