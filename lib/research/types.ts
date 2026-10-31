/** Sanitized public payloads — Alpaca API credentials never leave the server. */
export type ResearchAsset = {
  symbol: string;
  name: string;
  exchange: string;
  tradable: boolean;
};
export type ResearchArticle = {
  id: string;
  symbol: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string;
  category?: "company"|"sector";
  url: string | null;
};
export type ResearchClose = { date: string; close: number };
export type StockRiskSummary = {
  annualizedVolatilityPct: number | null;
  maxDrawdownPct: number | null;
  var95Pct: number | null;
  expectedShortfall95Pct: number | null;
  observations: number;
};
export type StockReport = {
  asset: ResearchAsset;
  asOf: string;
  closeCurrency: "USD";
  latestClose: number | null;
  previousClose: number | null;
  changePct: number | null;
  chart: ResearchClose[];
  risk: StockRiskSummary | null;
  news: ResearchArticle[];
  warnings: string[];
};
export type ResearchResponse<T> =
  | { status: "ok"; data: T }
  | { status: "not_configured"; message: string }
  | { status: "error"; message: string };
export const MAX_RESEARCH_WATCHLIST = 30;
export const symbolPattern = /^[A-Z0-9][A-Z0-9.\-]{0,15}$/;
