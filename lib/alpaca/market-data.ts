import "server-only";
import type { DailyClose } from "../analytics/risk";

const DATA_HOST = "https://data.alpaca.markets";
const REQUEST_TIMEOUT_MS = 12000;
const MAX_PAGES = 5;
const MAX_SYMBOLS = 30;

type Bar = { t?: unknown; c?: unknown };
type ApiPage = {
  bars?: Record<string, Bar[]>;
  next_page_token?: string | null;
};
function validateSymbols(symbols: string[]): void {
  if (symbols.length === 0 || symbols.length > MAX_SYMBOLS ||
      symbols.some((symbol) => !/^[A-Z0-9.\-]{1,16}$/.test(symbol))) {
    throw new Error("Unsupported or excessive stock symbols.");
  }
}
/**
 * Alpaca's free IEX market-data feed, complete daily bars only.
 * Paginate because the multi-symbol response limit applies to ALL symbols together.
 * Request ~14.5 months to obtain at least 200 aligned stock trading returns.\n * Keep API credentials on the server; never send these data requests from React.
 */
export async function loadDailyStockCloses(symbols: string[]): Promise<Record<string, DailyClose[]>> {
  validateSymbols(symbols);
  const key = process.env.ALPACA_PAPER_KEY_ID?.trim();
  const secret = process.env.ALPACA_PAPER_SECRET_KEY?.trim();
  if (!key || !secret) throw new Error("Paper market data is not configured.");

  const end = new Date();
  // Avoid including today's unfinished market session.
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 440);
  const params = new URLSearchParams({
    symbols: symbols.join(","),
    timeframe: "1Day",
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    feed: "iex",
    adjustment: "split",
    sort: "asc",
    limit: "10000",
  });
  const output: Record<string, DailyClose[]> = Object.fromEntries(symbols.map(s => [s, []]));
  let token: string | null = null;
  let done = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    if (token) params.set("page_token", token);
    const response = await fetch(DATA_HOST + "/v2/stocks/bars?" + params.toString(), {
      method: "GET",
      headers: { "APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret,
        Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("Alpaca price history could not be retrieved.");
    const data: unknown = await response.json();
    if (typeof data !== "object" || !data || Array.isArray(data)) {
      throw new Error("Unexpected Alpaca historical bar data.");
    }
    const result = data as ApiPage;
    for (const symbol of symbols) {
      const bars = result.bars?.[symbol];
      if (!Array.isArray(bars)) continue;
      for (const bar of bars) {
        const rawDate = typeof bar.t === "string" ? bar.t.slice(0, 10) : "";
        const close = typeof bar.c === "number" ? bar.c : Number(bar.c);
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate) && Number.isFinite(close) && close > 0) {
          output[symbol].push({date: rawDate, close});
        }
      }
    }
    token = typeof result.next_page_token === "string" && result.next_page_token
      ? result.next_page_token : null;
    if (!token) { done = true; break; }
  }
  // Never silently omit paginated stocks, which would bias calculated risk.
  if (!done) throw new Error("Incomplete market-data pagination.");
  return output;
}
