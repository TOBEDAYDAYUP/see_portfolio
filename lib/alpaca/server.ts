import "server-only";
import type { AlpacaPortfolioResult, AlpacaPosition, PortfolioHistoryPoint, AnnualPaperPerformance, PaperHistoryResponse } from "./types";
import {portfolioHistoryRequestPath,portfolioHistoryFallbackPath,portfolioHistoryResolution,type PortfolioHistoryRange} from "./history-range";
import {lastFiveMarketSessions} from "./history-display";
import {parseReturnsHistory} from "../portfolio/returns";

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
function parseAnnualPerformance(raw: unknown): AnnualPaperPerformance {
  const missing: AnnualPaperPerformance = {
    available: false, daysCovered: null, completeYear: false,
    profitLoss: null, profitLossPct: null,
  };
  if (!isObject(raw) || !Array.isArray(raw.timestamp)
    || !Array.isArray(raw.profit_loss) || !Array.isArray(raw.profit_loss_pct)) return missing;
  const timestamps: unknown[] = raw.timestamp;
  const profitLosses: unknown[] = raw.profit_loss;
  const profitLossPcts: unknown[] = raw.profit_loss_pct;
  if (!timestamps.length) return missing;
  const validDates = timestamps.map(asNumber).filter((n): n is number => n !== null);
  if (validDates.length < 2) return missing;
  const daysCovered = Math.round((validDates[validDates.length-1] - validDates[0]) / 86400);
  // Alpaca API's yearly window can contain less than a year of account history.
  // We distinguish a full 12-month summary from an available-to-date partial period.
  const finalIndex = timestamps.length - 1;
  const profitLoss = asNumber(profitLosses[finalIndex]);
  const profitLossPct = asNumber(profitLossPcts[finalIndex]);
  return {
    available: profitLoss !== null,
    daysCovered: Math.max(0, daysCovered),
    completeYear: daysCovered >= 330,
    profitLoss,
    profitLossPct,
  };
}

export async function loadPaperPortfolio(): Promise<AlpacaPortfolioResult> {
  const keyId = process.env.ALPACA_PAPER_KEY_ID?.trim();
  const secretKey = process.env.ALPACA_PAPER_SECRET_KEY?.trim();
  if (!keyId || !secretKey) return { status: "not_configured" };

  try {
    const [accountRaw, positionsRaw, historyResult, annualHistoryResult] = await Promise.all([
      alpacaGet("/v2/account", keyId, secretKey),
      alpacaGet("/v2/positions", keyId, secretKey),
      alpacaGet("/v2/account/portfolio/history?period=1M&timeframe=1D", keyId, secretKey)
        .then((value) => ({ ok: true as const, value }))
        .catch(() => ({ ok: false as const })),
      alpacaGet("/v2/account/portfolio/history?period=1A&timeframe=1D", keyId, secretKey)
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
      annualPerformance: annualHistoryResult.ok ? parseAnnualPerformance(annualHistoryResult.value) : parseAnnualPerformance(null),
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

/**
 * Fetch just the selected chart window without reloading positions or placing
 * orders. ALL starts at Alpaca's account creation date, not an invented period.
 * Requires the same local-development-only route guard as account data.
 */
export async function loadPaperHistory(range:PortfolioHistoryRange):Promise<PaperHistoryResponse>{
 const keyId=process.env.ALPACA_PAPER_KEY_ID?.trim();
 const secretKey=process.env.ALPACA_PAPER_SECRET_KEY?.trim();
 if(!keyId||!secretKey)return {status:"not_configured",message:"Configure Alpaca Paper credentials in .env.local."};
 try{
  let createdAt:string|undefined;
  if(range==="ALL"){
   const account=await alpacaGet("/v2/account",keyId,secretKey);
   if(!isObject(account))throw new AlpacaUpstreamError("unavailable");
   createdAt=textField(account,"created_at");
   if(!createdAt)return {status:"error",message:"Alpaca did not return an account creation date; full history cannot be requested."};
  }
  const path=portfolioHistoryRequestPath(range,createdAt);
  if(!path)return {status:"error",message:"Full account history is unavailable because the account start date is invalid."};
  let raw:unknown;
  let resolution=portfolioHistoryResolution[range];
  try{
   raw=await alpacaGet(path,keyId,secretKey);
  }catch(error){
   // The 1D / 5D intraday endpoints sometimes fail for newer paper
   // accounts. Try a lower-resolution genuine Alpaca history request,
   // never manufactured points, and disclose the resolution change.
   const fallback=portfolioHistoryFallbackPath(range);
   if(!(error instanceof AlpacaUpstreamError)||error.code!=="unavailable"||!fallback)throw error;
   raw=await alpacaGet(fallback,keyId,secretKey);
   resolution=range==="5D"?"Daily snapshots (fallback) · last five market sessions":"Hourly snapshots (fallback)";
  }
  if(!isObject(raw)||!Array.isArray(raw.timestamp)||!Array.isArray(raw.equity))
   throw new AlpacaUpstreamError("unavailable");
  const allPoints=parseHistory(raw).sort((a,b)=>a.timestamp-b.timestamp);
  // 5D means five actual NY market sessions. We deliberately fetched a longer
  // calendar window so weekends/holidays don't shorten the five sessions.
  const points=range==="5D"?lastFiveMarketSessions(allPoints):allPoints;
  // Important: Alpaca resets intraday P/L per trading day by default.
  // For 5D, use an independent 1D-timeframe request to get a continuous
  // broker P/L baseline across the trading sessions, while retaining the
  // actual hourly snapshots for the existing equity chart.
  let pnlPoints:ReturnType<typeof parseReturnsHistory>=[];
  if(range==="5D"){
   try{
    const dailyRaw=await alpacaGet("/v2/account/portfolio/history?period=21D&timeframe=1D",keyId,secretKey);
    const dailyPoints=lastFiveMarketSessions(parseHistory(dailyRaw));
    pnlPoints=parseReturnsHistory(dailyRaw,new Set(dailyPoints.map(point=>point.timestamp)));
   }catch{
    // Do not make the working equity chart fail just because the separate
    // daily P/L query is temporarily unavailable.
    pnlPoints=[];
   }
  }else{
   pnlPoints=parseReturnsHistory(raw,new Set(points.map(point=>point.timestamp)));
  }
  return {status:"ok",range,points,resolution,pnlPoints};
 }catch(error:unknown){
  const code=error instanceof AlpacaUpstreamError?error.code:"unavailable";
  const message=code==="auth_failed"
   ?"Alpaca rejected your paper credentials."
   :code==="rate_limited"?"Alpaca history rate limit reached. Try again later."
   :"Historical Alpaca account equity is temporarily unavailable.";
  return {status:"error",message};
 }
}
