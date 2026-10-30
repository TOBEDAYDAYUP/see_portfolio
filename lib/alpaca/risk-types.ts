import type { RiskMetrics } from "../analytics/risk";

/** No actual Alpaca holdings or paper balances are returned by this endpoint. */
export type RiskApiResult =
  | { status: "empty"; source: "alpaca-paper" }
  | { status: "connected"; source: "alpaca-paper"; fetchedAt: string; feed: "iex";
      metrics: RiskMetrics; dataWarning: string | null; unsupportedAssets: string[] }
  | { status: "not_configured" }
  | { status: "unsupported"; reason: string }
  | { status: "error"; message: string };
