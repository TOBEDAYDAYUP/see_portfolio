import type { ResearchAsset } from "./types";
// Match Research stock symbols without importing a runtime module in node:test.
const symbolPattern = /^[A-Z0-9][A-Z0-9.\-]{0,15}$/;

type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown): string => typeof value === "string" ? value : "";

/**
 * Alpaca Trading API GET /v2/assets uses the JSON property "class": "us_equity".
 * Older/alternate payloads sometimes call it "asset_class"; support both.
 * Keep only verified active US equities. No hypothetical catalog entries.
 */
export function parseResearchAsset(raw: unknown): ResearchAsset | null {
  if (!isRecord(raw)) return null;
  const symbol = str(raw.symbol).toUpperCase();
  const assetClass = str(raw.class) || str(raw.asset_class);
  if (!symbolPattern.test(symbol) || assetClass !== "us_equity" ||
      str(raw.status) !== "active") return null;
  return {
    symbol,
    name: str(raw.name) || symbol,
    exchange: str(raw.exchange) || "US",
    tradable: raw.tradable === true,
  };
}

export function parseResearchAssetDirectory(raw: unknown): ResearchAsset[] {
  if (!Array.isArray(raw)) throw new Error("Unexpected Alpaca asset-directory response.");
  return raw.map(parseResearchAsset).filter((a): a is ResearchAsset => a !== null);
}
