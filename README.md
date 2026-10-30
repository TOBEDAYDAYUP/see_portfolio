# SEE Portfolio

A lightweight investment research prototype built with **Next.js 16, React 19, TypeScript, and Tailwind CSS 4**.

> **Prototype data notice:** The financial amounts, portfolio history, fair values, and news in the current interface are fictitious demonstration data. No Alpaca API, live price feed, trading, AI scoring, or push notification service is connected yet.

## Development

Requires Node.js 22 or later.

```bash
npm ci
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
    portfolio-dashboard.tsx           # Portfolio screen coordinator
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

## Planned integrations (not implemented)

1. Introduce a server-only `lib/alpaca/` read-only client and an `app/api/alpaca/` route.
2. Keep paper positions and paper performance explicitly labeled.
3. Introduce validated, auditable `lib/analytics/` risk/valuation calculations.
4. Introduce a news ingestion, classification, and notification pipeline.

The development branch and pull request should pass all checks before being merged into `main`.
