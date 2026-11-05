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
/** Alpaca-reported P/L for up to the past year. Coverage may be shorter for newer accounts. */
export type AnnualPaperPerformance = {
  available: boolean;
  daysCovered: number | null;
  completeYear: boolean;
  profitLoss: number | null;
  profitLossPct: number | null;
};
export type PaperAccountSummary = {
  status: string;
  equity: number | null;
  cash: number | null;
  buyingPower: number | null;
  lastEquity: number | null;
};
export type AlpacaPortfolioResult =
  | { status: "not_configured" }
  | { status: "connected"; source: "alpaca-paper"; fetchedAt: string; account: PaperAccountSummary; positions: AlpacaPosition[]; history: PortfolioHistoryPoint[]; historyAvailable: boolean; annualPerformance: AnnualPaperPerformance }
  | { status: "error"; code: "auth_failed" | "rate_limited" | "unavailable" | "disabled"; message: string };

/** A historical chart request returns only sanitized Alpaca account equity points. */
export type PaperHistoryResponse =
 | {status:"ok";range:import("./history-range").PortfolioHistoryRange;
    points:PortfolioHistoryPoint[];resolution:string}
 | {status:"not_configured";message:string}
 | {status:"error";message:string};
