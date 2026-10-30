import "server-only";
import type { AlpacaPortfolioResult, AlpacaPosition, PortfolioHistoryPoint } from "./types";

/** This application only permits the Alpaca PAPER host. No live trading host or order routes. */
const PAPER_ORIGIN = "https://paper-api.alpaca.markets";
const REQUEST_TIMEOUT_MS = 9000;

type JsonObject = Record<string, unknown>;
function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asNumber(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function textField(data: JsonObject, key: string): string {
  return typeof data[key] === "string" ? data[key] : "";
}

class AlpacaUpstreamError extends Error {
  constructor(public readonly code: "auth_failed" | "rate_limited" | "unavailable") {
    super(code);
  }
}

async function alpacaGet(path: string, keyId: string, secretKey: string): Promise<unknown> {
  const response = await fetch(PAPER_ORIGIN + path, {
    method: "GET",
    headers: {
      "APCA-API-KEY-ID": keyId,
      "APCA-API-SECRET-KEY": secretKey,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new AlpacaUpstreamError("auth_failed");
    if (response.status === 429) throw new AlpacaUpstreamError("rate_limited");
    throw new AlpacaUpstreamError("unavailable");
  }
  return response.json() as Promise<unknown>;
}
function parsePosition(value: unknown): AlpacaPosition | null {
  if (!isObject(value)) return null;
  const symbol = textField(value, "symbol");
  if (!symbol) return null;
  return {
    symbol,
    assetClass: textField(value, "asset_class"),
    side: textField(value, "side"),
    qty: asNumber(value.qty),
    avgEntryPrice: asNumber(value.avg_entry_price),
    currentPrice: asNumber(value.current_price),
    marketValue: asNumber(value.market_value),
    costBasis: asNumber(value.cost_basis),
    unrealizedPl: asNumber(value.unrealized_pl),
    unrealizedPlPct: asNumber(value.unrealized_plpc),
    changeTodayPct: asNumber(value.change_today),
  };
}
function parseHistory(raw: unknown): PortfolioHistoryPoint[] {
  if (!isObject(raw) || !Array.isArray(raw.timestamp) || !Array.isArray(raw.equity)) return [];
  const timestamps: unknown[] = raw.timestamp;
  const equities: unknown[] = raw.equity;
  return timestamps.flatMap((value, index): PortfolioHistoryPoint[] => {
    const timestamp = asNumber(value);
    const equity = asNumber(equities[index]);
    return timestamp !== null && equity !== null && equity >= 0 ? [{ timestamp, equity }] : [];
  });
}
export async function loadPaperPortfolio(): Promise<AlpacaPortfolioResult> {
  const keyId = process.env.ALPACA_PAPER_KEY_ID?.trim();
  const secretKey = process.env.ALPACA_PAPER_SECRET_KEY?.trim();
  if (!keyId || !secretKey) return { status: "not_configured" };

  try {
    const [accountRaw, positionsRaw, historyResult] = await Promise.all([
      alpacaGet("/v2/account", keyId, secretKey),
      alpacaGet("/v2/positions", keyId, secretKey),
      alpacaGet("/v2/account/portfolio/history?period=1M&timeframe=1D", keyId, secretKey)
        .then((value) => ({ ok: true as const, value }))
        .catch(() => ({ ok: false as const })),
    ]);

    if (!isObject(accountRaw) || !Array.isArray(positionsRaw)) {
      throw new AlpacaUpstreamError("unavailable");
    }

    const positions = positionsRaw
      .map(parsePosition)
      .filter((p): p is AlpacaPosition => p !== null)
      .sort((a,b) => Math.abs(b.marketValue ?? 0) - Math.abs(a.marketValue ?? 0));

    return {
      status: "connected",
      source: "alpaca-paper",
      fetchedAt: new Date().toISOString(),
      account: {
        status: textField(accountRaw, "status"),
        equity: asNumber(accountRaw.equity),
        cash: asNumber(accountRaw.cash),
        buyingPower: asNumber(accountRaw.buying_power),
        lastEquity: asNumber(accountRaw.last_equity),
      },
      positions,
      history: historyResult.ok ? parseHistory(historyResult.value) : [],
      historyAvailable: historyResult.ok,
    };
  } catch (error: unknown) {
    const code = error instanceof AlpacaUpstreamError ? error.code : "unavailable";
    // Never forward upstream response bodies or credentials into browser output.
    const message = code === "auth_failed"
      ? "Alpaca rejected these paper credentials. Check .env.local and restart the dev server."
      : code === "rate_limited"
        ? "Alpaca rate limit reached. Try refreshing later."
        : "Alpaca Paper API is temporarily unavailable. Check your connection and try again.";
    return { status: "error", code, message };
  }
}
