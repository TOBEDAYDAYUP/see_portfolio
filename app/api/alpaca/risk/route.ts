import { NextResponse } from "next/server";
import { loadPaperPortfolio } from "../../../../lib/alpaca/server";
import { loadDailyStockCloses } from "../../../../lib/alpaca/market-data";
import { calculateRisk } from "../../../../lib/analytics/risk";
import type { RiskApiResult } from "../../../../lib/alpaca/risk-types";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  // This is a PERSONAL paper account. Keep private until user auth is available.
  if (process.env.NODE_ENV !== "development") {
    const result: RiskApiResult = {status:"error",
      message:"Risk analysis is disabled in production until user authentication exists."};
    return NextResponse.json(result, {status:403, headers});
  }
  const account = await loadPaperPortfolio();
  if (account.status === "not_configured") {
    return NextResponse.json({status:"not_configured"} satisfies RiskApiResult, {headers});
  }
  if (account.status === "error") {
    return NextResponse.json({status:"error", message:account.message} satisfies RiskApiResult,
      {status:502, headers});
  }
  if (!account.positions.length) {
    return NextResponse.json({status:"empty", source:"alpaca-paper"} satisfies RiskApiResult, {headers});
  }

  // No invented exposure assumptions for short, crypto, leveraged or malformed positions.
  const unsupported = account.positions.filter((p) =>
    p.assetClass !== "us_equity" || p.side !== "long" ||
    p.marketValue === null || !Number.isFinite(p.marketValue) || p.marketValue <= 0);
  if (unsupported.length) {
    return NextResponse.json({
      status:"unsupported",
      reason:"Risk Engine v0.1 currently handles long US equity positions only. Unsupported holdings: " +
        unsupported.map((p) => p.symbol).join(", "),
    } satisfies RiskApiResult, {headers});
  }
  if (account.positions.length > 30) {
    return NextResponse.json({status:"unsupported",
      reason:"More than 30 holdings. Batch support is planned; no positions were silently excluded."} satisfies RiskApiResult,
    {headers});
  }
  const positions = account.positions.map((p) => ({symbol:p.symbol, marketValue:p.marketValue!}));
  try {
    let dataWarning: string | null = null;
    let prices: Awaited<ReturnType<typeof loadDailyStockCloses>> = {};
    try {
      prices = await loadDailyStockCloses(positions.map((p) => p.symbol));
    } catch {
      dataWarning = "Historical IEX prices are currently unavailable; only allocation and concentration are shown.";
    }
    const metrics = calculateRisk(positions, prices);
    if (!metrics.historySufficient) {
      dataWarning = dataWarning ?? "Not enough synchronized daily IEX closing prices. At least 30 daily returns for all holdings are required.";
    }
    const result: RiskApiResult = {
      status:"connected",
      source:"alpaca-paper",
      fetchedAt:new Date().toISOString(),
      feed:"iex",
      metrics,
      dataWarning,
      unsupportedAssets:[],
    };
    return NextResponse.json(result, {headers});
  } catch {
    const result: RiskApiResult = {status:"error",
      message:"Risk calculation could not be completed. Please check holdings or retry."};
    return NextResponse.json(result, {status:502, headers});
  }
}
