# SEE Portfolio

A lightweight investment research prototype built with **Next.js 16, React 19, TypeScript, and Tailwind CSS 4**.

> **Data notice:** Portfolio holdings use read-only Alpaca Paper Trading data. Research charts/news use Alpaca market data, and optional fundamentals use SEC EDGAR filings. Twelve-month forecasts and notifications remain unimplemented; no trading or order execution is connected.

## Portfolio equity chart · selectable history windows

Portfolio → Holdings → Portfolio value over time provides five clickable
time ranges: **1D, 5D, 1M, 1Y, ALL** (default: 1M). Selected windows
request real Alpaca Paper account equity snapshots with **5-minute** bars
for 1D, **hourly** bars for 5D, and **daily** snapshots for longer ranges.
5D means the **last five actual NY equity-market sessions**, not five
calendar dates: the server requests 21 calendar days of Alpaca market-hours
data and retains only the latest five distinct observed weekdays.
Weekends, exchange holidays, and missing sessions are not synthesized.
Alpaca's annual API period is `1A` (mapped from the 1Y UI label). ALL
requests daily history from the actual account's `created_at` through an
explicit current-time `end` (omitting `end` can default to a month), without
inventing pre-account equity or a fixed multi-year horizon.
If Alpaca rejects the high-frequency 1D/5D requests, the app tries actual
lower-resolution Alpaca hourly/daily data and labels it as a fallback; it
never interpolates or invents account equity. Failures show a diagnostic
HTTP/endpoint status and a retry button rather than an opaque generic error.

The chart preserves honest missing-data states. Fewer than two snapshots
means no line is drawn. The X axis uses five labels from actual observations (first, three interior
timestamps, last), or fewer if the API has fewer observations. 5D uses one
timestamp from each observed trading session, with no empty weekend slot.
The 1D chart labels its X axis in New York trading time.

**Interactive equity crosshair:** Hover within 24 screen pixels of the
historical equity line (or click/tap near it) to select the nearest *actual*
Alpaca snapshot. The chart draws a dashed vertical line to the top timestamp
label and a dashed horizontal line to the right-hand USD account-equity label.
Timestamp labels use New York market time with automatic EST/EDT handling.
Clicks pin/unpin a selected observation; hover previews disappear on pointer
leave. Keyboard users can focus the chart, navigate real observations with
left/right arrows (Home/End supported), and press Escape to clear selection.
No interpolated/fabricated portfolio equity is displayed; sparse lines snap
to an existing observation rather than claiming intermediate values.
The original 3 Y-axis ticks and 5 X-axis date labels remain visible.

All account-history API routes remain local-development-only pending
authentication; requests do not place trades and never expose paper keys.
Historical equity changes can include deposits and withdrawals and are
not time-weighted investment returns.

## Research Stock Search · Daily IEX price and change

Research → Stock Search now adds **the latest available Alpaca IEX daily-session
price**, plus **absolute USD price change and percentage change compared with
the previous available IEX trading session**, next to each search result.
Values are calculated in SEE Portfolio from Alpaca `dailyBar.c` and
`prevDailyBar.c` using the batched `/v2/stocks/snapshots?feed=iex` API.

The asset-directory search and quote loading are independent: missing or
inaccessible quotes never prevent search, Watchlist or Stock Report navigation.
Every displayed quote shows its NY trading-session date; weekends/holidays
continue to show the previous session, **not a live consolidated market quote**.
Missing, stale, inconsistent or future-dated bars are withheld. Up to 20 symbols
are requested per batch, cached in memory for 25 seconds to conserve provider
requests. Paper API credentials stay on the server; the new search-quotes
endpoint remains local-development-only until authentication is implemented.

## Research DCF v0.2 — one-year forecast equity cash-flow scenario model

Research → Stock Reports → Company Fundamentals now includes an interactive
one-year explicit-forecast discounted cash-flow panel. It starts from **verified SEC 10-Q TTM
or recent 10-K annual operating cash flow minus reported PP&E purchases**
and a validated, dated SEC issuer-level outstanding-share count. Users
explicitly adjust next-year cash-flow growth, **cost of equity**, and
terminal growth. The panel shows next-year projected cash flow and its present
value, a Gordon-growth terminal value at year one, modeled equity value per share,
scenario upside/downside against the dated Alpaca IEX close, and a 3×3
discount-rate/terminal-growth sensitivity matrix. Invalid and missing
inputs produce no invented valuation.

**Important limitation:** This is a simplified **equity cash-flow proxy DCF**.
CFO minus capex omits net borrowing, so it is not a fully reconciled FCFE.
It is also NOT an unlevered FCFF/WACC enterprise valuation and must not be
represented as one. It assumes constant projected growth, unchanged shares
and investor-supplied—not verified analyst—discount/growth rates.
With just one explicit forecast year, most estimated equity value may depend on the terminal
value. The simpler model should not be mistaken for improved forecast accuracy.
Negative cash flow, stale or unavailable share snapshots, and unsupported
multiple-share-class issuers are withheld. The prototype is unsuitable for
some sectors, especially banks/insurers. No security recommendation or
independently validated price target is generated.

Pure calculation tests: `node --experimental-strip-types --test tests/dcf.test.mjs`.
No new third-party key, dependency or data endpoint is introduced.

## Portfolio Valuation & Dividends v1 · multi-source

Portfolio → Valuation now reads **actual Alpaca Paper holdings**, applies the same
SEC annual + 10-Q TTM computations and IEX daily price reference already used
in Research, then computes a covered-positions P/E from **earnings yield** rather
than an arithmetic P/E mean. Market-value-weighted FCF yield and explicit P/E/
FCF coverage percentages prevent missing metrics from being treated as zero.
Only long US listed stock positions are eligible (cash, ETFs, shorts, options
and unsupported foreign filers are excluded). The source can process up to
12 eligible tickers per request; extra positions are visibly marked unanalysed.

When the SEC `companyfacts` standard total-shares field is absent, the engine
tries **SEC original 10-Q/10-K Inline XBRL** and sums separate share classes
*only if* the classes, counts and snapshot date can be reconciled. If this
also fails, an optional `FMP_API_KEY` enables the FMP `stable/shares-float`
**outstandingShares** fallback — never its free float. Provider date and
source are preserved, and data newer than the quote or more than 220 days
old are withheld. FMP endpoint coverage/pricing may vary with plan, and
no third-party key is required for the SEC-only path. A 403/rate limit or
failed provider never results in invented values.

Portfolio → Dividends reads Alpaca Paper `/v2/account/activities/DIV` for
previous cash **DIV credits** and market-data `/v1/corporate-actions` for
known cash distributions. The upcoming amount is explicitly indicative
(current qty × declared cash rate) and is NOT proof of entitlement.
The annualized run-rate is shown only after 3 observed quarterly-spaced
ordinary distributions, excluding specials; incomplete pagination
suppresses run-rate forecasts. No missing dividend is assumed zero;
the page discloses partial coverage and original data providers.

Portfolio account APIs remain **local-development-only** until secure user
authentication is implemented. No paper trades/orders are placed and no
private API keys are serialized to clients. Full FCFF/WACC DCF and validated price targets
remain out of scope. Local end-to-end credentials and any provider tier
restrictions still need to be verified.

## Research News timestamps

Research → Recent Company News and Market & Sector News display the Alpaca
`created_at` article timestamp to the **minute** in `America/Toronto` time
(e.g. `Oct 30, 2026 · 2:35 PM EDT`), with DST-aware EST/EDT labels. These are
provider article timestamps, **not independent verification of the originating
publisher's first-publication time**. Missing or malformed offset-aware timestamps
display `Time unavailable` instead of guessing. No extra market-data provider,
permissions, or user timezone setting is required.

## Research Valuation v0.2 — point-in-time SEC TTM + dated share counts

Research → Stock Reports now shows **TTM P/E (approximate)**, TTM P/S, latest P/B,
TTM free cash flow yield, FY P/E for comparison, and a dated market-cap **proxy**.
TTM fields use the SEC 10-K last completed fiscal-year actual plus current fiscal
10-Q year-to-date minus the corresponding prior-year 10-Q year-to-date amount.
Quarterly and annual fiscal periods must align; 10-Q data must be filed no later than
the reference stock-close date. An exact TTM bridge is required for every TTM field;
missing or mismatched facts are withheld. TTM diluted EPS uses addition/subtraction
of reported rounded diluted EPS and is **approximate**, not recomputed GAAP EPS.

SEC `dei:EntityCommonStockSharesOutstanding` (fallback to
`us-gaap:CommonStockSharesOutstanding`) supplies dated issuer common shares.
Latest 10-Q/10-K `us-gaap:StockholdersEquity` supplies dated book equity.
Both have distinct disclosed as-of dates, and are withheld if missing or stale.
Price, multiples and market-cap proxy use **the same historical Alpaca IEX
daily close**, not a real-time or consolidated quote. The independent interactive
chart can use delayed consolidated SIP OHLCV and may show a different last bar.
No claim is made of live market capitalization.

News uses verified provider ticker tags, a direct-company versus sector distinction,
HTML-entity decoding and cross-provider title deduplication. Secondary sector
coverage is collapsed under its own heading. Annual historical tables, less important
FY metrics and future-model placeholders are collapsed to prioritize current data.

Existing Portfolio holdings, paper P/L, VaR/ES and brokerage permissions remain
unchanged. Local-only API restrictions and existing SEC_USER_AGENT setup remain.
No full FCFF/WACC DCF, 12-month forecast, Forward P/E or EV/EBITDA is implemented. Model inputs
and the local user's SEC and Alpaca connectivity still require end-to-end verification.

### Previous annual-only approach (v0.1)

## Research Valuation Multiples v0.1 — annual, sourced, conservative

Research → Stock Reports now displays **FY P/E (diluted)** from the most recent SEC 10-K diluted earnings-per-share fact and the latest available historical Alpaca IEX close. This is **not** a TTM P/E, Forward P/E, live quote or future price estimate.

**FY P/S, FY P/B and FY FCF Yield** are explicitly marked **proxies**, using the most recent SEC fiscal-year *weighted-average diluted shares* as an estimate of current shares. The displayed estimated market cap is **not** a verified market capitalization. Share issuance/buybacks, splits, multiple classes and stale filings can distort these ratios; review the source dates and footnotes. P/E is suppressed for negative/zero EPS; P/B is suppressed for nonpositive book equity; missing inputs remain unavailable. Price data older than ten days, fiscal data older than 550 days, and class-share tickers using a dot or hyphen are gated rather than shown as misleading valuations.

SEC annual EPS uses the official `USD/shares` unit, diluted shares use `shares`, and book equity uses the annual `USD` balance-sheet fact. All annual flow facts must meet the existing full-year 10-K filtering. Missing SEC_USER_AGENT leaves the feature disabled, without affecting Portfolio. No new credentials, packages or endpoints are introduced.

**Still unavailable:** live market cap, verified TTM multiples, Forward P/E, EV/EBITDA, historical relative valuation, peer comparables, DCF and 12-month price targets. A FY valuation multiple is not an intrinsic value estimate.

## Company Fundamentals v0.1 — official SEC annual filings

Research → Stock Reports now contains an independent Company Fundamentals panel. It reads **actual SEC EDGAR 10-K US-GAAP XBRL company facts** for supported US public issuers: annual revenue, net income, operating cash flow, reported capital spending, annual free cash flow (OCF minus capex), fiscal-year revenue growth, operating/net margins, assets, liabilities and cash. A year-end comparison table and the official SEC XBRL source URL are provided.

**One-time optional SEC setup:** the SEC requires requests to identify the client and include a real email contact. Set `SEC_USER_AGENT="SEE Portfolio Research your-email@domain.com"` in ignored local `.env.local`, using an email that you control; restart `npm run dev`. This is not an API key and no third-party account is necessary. Without it, the Fundamentals panel displays **SEC data setup required**; all existing Alpaca portfolio, Research prices, charts, risk and news still work.

The backend caches the SEC ticker→CIK index for 24h and SEC annual company summaries for 1h; API route `/api/research/fundamentals?symbol=AAPL` is read-only and disabled outside local development pending user authentication. Its responses contain only selected, validated annual metrics, not the entire large SEC payload.

**Data quality:** only full-year 10-K/10-K-A US-GAAP facts with approximately 330–380-day measurement spans appear as annual income/cash flow. 10-Q and year-to-date interim facts are excluded, 10-K instant balance sheet items are handled separately. Recent issuer restatements and missing taxonomy concepts can affect figures; missing inputs display —, never invented numbers. US-listed ETFs and non-US issuers without comparable US-GAAP 10-K data may not be supported. This is **not** a valuation or a 12-month forecast.

Testing: `node --experimental-strip-types --test tests/*.test.mjs` covers financial-year filtering, restated values, sources, ratios, capex, and missing data.

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

### Research chart native Mac trackpad interactions

- **Two-finger vertical trackpad swipe on the chart scrolls the whole web page**, just as it does elsewhere on the site. Ordinary wheel scrolling never zooms the chart.
- Fractional chart viewport coordinates preserve small trackpad movements without rounding each step away. Zoom cannot fabricate additional market bars or increase time resolution beyond the selected 1D/5D/1M/1Y/All API granularity.
- **Two-finger trackpad pinch in/out over the chart** zooms its visible historical data around the pointer. On macOS Chrome this is distinguished from ordinary scrolling via a pinch-specific Ctrl+wheel event. To move through a zoomed-in chart, **press/hold with one finger on the Mac trackpad (or hold the mouse left button) and drag left/right**. Dragging left reveals later history; dragging right reveals earlier history. At full range there is no hidden timeline to move.
- **Drag-to-select zoom remains removed**: no selection rectangle appears. A held pointer now *pans*, but does not zoom. Both vertical and horizontal two-finger swipes are left to the browser for normal page/trackpad behavior. Only pinch zoom is intercepted. Existing left/right arrow buttons, Reset Zoom, keyboard crosshair and Escape continue to work.
- Chart type selection moved to the **right** and offers exactly three types: Candlesticks, Line chart and OHLC bars. Volume On/Off stays to the left, independent of the chart type. No chart library or additional Alpaca keys needed.

### Historical chart data quality update

- Research charts now request **delayed SIP consolidated historical bars first**, with the last 20 minutes excluded for intraday queries. Alpaca's documented Basic Trading API access generally permits historical SIP data older than 15 minutes without the paid real-time SIP plan.
- If Alpaca explicitly denies historical SIP access (HTTP 403/422), charts fall back to the existing **IEX** feed and label that limitation. No fabricated consolidated volumes.
- Charts display a **limited/insufficient data warning** when historical bars are too sparse or when at least half the bars report zero volume. If only one or no bar is returned, the screen shows a factual empty/one-bar state instead of a misleading huge one-candle plot.
- Intraday warnings identify the last *actual available New York market date*, so an old bar (e.g. Oct 27 when viewing on Oct 30) is not presented as today's market session.
- **Not changed:** Portfolio Holdings, portfolio risk methodology, Research VaR/ES and company news. Those continue to use the prior IEX-based calculation pipeline until separately reviewed.

## Research Stock Report trading session correction

- **1D, 5D and 1M** now exclude U.S. equities **pre-market (before 09:30 ET)** and **after-hours (at or after the regular market close)** before grouping their raw price bars into 50 OHLCV candles.
- The server retrieves Alpaca Paper Trading's official **GET /v2/calendar** for actual session open/close per trading date, including holidays and **13:00 early-close** sessions. An explicit warning appears if the calendar endpoint fails, in which case only the default 09:30–16:00 ET time filter is applied.
- Times use `America/New_York`, handling EDT/EST automatically. Market-session filtering runs **before** the latest-1-day or latest-5-day selection, so pre-market data from a new day does not hide yesterday's completed session.
- **1M 30-minute bars** replace hourly bars to prevent 09:00–10:00 buckets mixing pre-market and post-open trades. Trading-session OHLCV and volume are sourced from genuine Alpaca SIP (IEX fallback) market bars; no out-of-session volume is added to regular-session buckets.
- **1Y and All** still use original provider **daily/weekly aggregate bars** for performance and broad history; those native provider aggregates are *not* reconstructed from regular-session-only intraday data and may contain after-hours contributions. The UI explicitly discloses this limitation.

## Research Stock Report chart v0.3 — consistent 50-candle density

- Every selected period (1D / 5D / 1M / 1Y / All) defaults to **50 evenly spaced visual OHLCV candles** when at least 50 genuine source bars are available. The physical chart width and visible candle count stay consistent across periods.
- Existing raw OHLCV bars are combined into exactly 50 chronological groups: **open = first; high = highest; low = lowest; close = last; volume = sum**. No high, low or trading volume is dropped, and no synthetic underlying market bars are added.
- **1M now requests real 30-minute Alpaca bars** so each source bar aligns with 09:30–16:00 ET. The default 50 visual candles are rebuilt only from qualifying regular-session bars. Other ranges: 1D=5Min, 5D=15Min, 1Y=1Day, All=1Week.
- While zooming with a mouse wheel or trackpad, the display **re-aggregates the current raw-bar viewport**. Zooming reveals more temporal detail instead of merely enlarging the original 50 aggregated candles. All three modes (Candlesticks, Line chart, OHLC Bars) and summed volume use identical density.
- If fewer than 50 real source bars exist (illiquid/new listing, data entitlement or narrow deep zoom), show the real count with a warning; never invent or interpolate market trades to force exactly 50. Hover details include the aggregated source-bar count and time interval. The backend remains read-only and uses delayed SIP with labeled IEX fallback.

## Research Stock Report chart v0.2 — OHLCV and interactive history

In **Research → Stock Reports**, the previous fixed daily-close line is replaced with an interactive price/volume chart:

- **1D:** most recent trading session in 5-minute OHLCV bars; **5D:** last five sessions in 15-minute bars.
- **1M:** 30-minute OHLCV bars; **1Y:** provider daily bars; **All:** provider weekly bars requested since **2016-01-01** (up to available Alpaca coverage). Intraday ranges omit the latest 20 minutes; daily/weekly ranges omit the current potentially incomplete New York market date.
- Modes: **Candles**, **Line**, **OHLC Bars**; separate **Volume On/Off** histogram.
- Move the pointer to inspect timestamp, Open, High, Low, Close and source volume. Use **trackpad pinch** to zoom, then **single-finger click-and-hold + horizontal drag** or left/right arrow buttons to pan. Reset zoom restores the full period; keyboard Left/Right moves the crosshair and Escape resets zoom. Two-finger swipes scroll the page.
- OHLCV comes from actual historical Alpaca SIP consolidated data when accessible, with labeled IEX-only fallback; the 50 visual buckets aggregate genuine provider bars. Bars are split-adjusted. Incomplete API pagination, invalid bars and no-data ranges never create fake data.
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
