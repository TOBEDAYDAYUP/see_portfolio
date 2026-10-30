/** Public, sanitized response types. Private Alpaca credentials never leave the server. */
export type AlpacaPosition = {
  symbol: string;
  assetClass: string;
  side: string;
  qty: number | null;
  avgEntryPrice: number | null;
  currentPrice: number | null;
  marketValue: number | null;
  costBasis: number | null;
  unrealizedPl: number | null;
  unrealizedPlPct: number | null;
  changeTodayPct: number | null;
};
export type PortfolioHistoryPoint = { timestamp: number; equity: number };
export type PaperAccountSummary = {
  status: string;
  equity: number | null;
  cash: number | null;
  buyingPower: number | null;
  lastEquity: number | null;
};
export type AlpacaPortfolioResult =
  | { status: "not_configured" }
  | { status: "connected"; source: "alpaca-paper"; fetchedAt: string; account: PaperAccountSummary; positions: AlpacaPosition[]; history: PortfolioHistoryPoint[]; historyAvailable: boolean }
  | { status: "error"; code: "auth_failed" | "rate_limited" | "unavailable" | "disabled"; message: string };
