/**
 * Risk Engine v0.2 — pure, deterministic math (including empirical 1-day VaR and ES).
 *
 * Methodology: current invested long-equity weights are applied at the START
 * of the historical window, then allowed to drift (hypothetical buy-and-hold).
 * This is NOT the account's realized historical return or changing past weights.
 * Market data is not fetched here; all prices are supplied by the caller.
 */
export type RiskHolding = { symbol: string; marketValue: number };
export type DailyClose = { date: string; close: number };
export type RiskAllocation = {
  symbol: string;
  marketValue: number;
  weightPct: number;
};
export type RiskPathPoint = { date: string; index: number; drawdownPct: number };
export type RiskMetrics = {
  allocations: RiskAllocation[];
  investedValue: number;
  topPositionPct: number;
  topThreePct: number;
  hhi: number;
  effectivePositions: number;
  annualizedVolatilityPct: number | null;
  maxDrawdownPct: number | null;
  dailyReturnObservations: number;
  firstDate: string | null;
  lastDate: string | null;
  path: RiskPathPoint[];
  historySufficient: boolean;
  /** Historical simulation using 1-day modeled returns; excludes account cash. */
  var95Pct: number | null;
  var95Usd: number | null;
  expectedShortfall95Pct: number | null;
  expectedShortfall95Usd: number | null;
  tailObservations: number;
  tailRiskSufficient: boolean;
};

const MIN_RETURN_OBSERVATIONS = 30;
const MAX_CLOSE_POINTS = 301;
const TRADING_DAYS = 252;
export const TAIL_RISK_MIN_RETURNS = 200;
export const TAIL_FRACTION_95 = 0.05;

export type TailRisk95 = {
  /** Loss magnitudes, never negative; 1-day percentages, NOT confidence guarantees. */
  var95Pct: number;
  expectedShortfall95Pct: number;
  tailObservations: number;
};

/**
 * Nonparametric historical simulation: descending losses = -daily returns.
 * Empirical VaR95 is the k-th worst loss; ES95 averages the worst k losses,
 * where k = ceil(5% × n). Require >=200 daily returns (>=10 tail outcomes).
 * These are in-sample summaries, not validated exceedance probabilities.
 */
export function calculateHistoricalTailRisk95(dailyReturns: number[]): TailRisk95 | null {
  if (dailyReturns.length < TAIL_RISK_MIN_RETURNS) return null;
  if (dailyReturns.some(r => !Number.isFinite(r) || r <= -1)) {
    throw new Error("Daily returns must be finite and greater than -100%.");
  }
  const loss = dailyReturns.map(r => -r).sort((a,b) => b-a);
  const k = Math.ceil(dailyReturns.length * TAIL_FRACTION_95);
  const worst = loss.slice(0,k);
  return {
    var95Pct: 100 * Math.max(0,worst[k-1]),
    expectedShortfall95Pct: 100 * Math.max(0,worst.reduce((sum,v)=>sum+v,0)/k),
    tailObservations: k,
  };
}

function stdevSample(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, r) => sum + r, 0) / values.length;
  const sq = values.reduce((sum, r) => sum + (r - mean) ** 2, 0);
  return Math.sqrt(sq / (values.length - 1));
}

/** Uses date intersection: never fill missing prices or pretend holidays trade. */
export function calculateRisk(
  holdings: RiskHolding[],
  priceSeries: Record<string, DailyClose[]>,
): RiskMetrics {
  if (!holdings.length) throw new Error("Risk calculation requires positions.");
  const seen = new Set<string>();
  for (const item of holdings) {
    if (!item.symbol || !Number.isFinite(item.marketValue) || item.marketValue <= 0 ||
        seen.has(item.symbol)) {
      throw new Error("Holdings must have unique symbols and positive finite values.");
    }
    seen.add(item.symbol);
  }
  const investedValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  if (!(investedValue > 0) || !Number.isFinite(investedValue)) throw new Error("Invalid invested value.");
  const allocations = holdings.map((h) => ({
    symbol: h.symbol,
    marketValue: h.marketValue,
    weightPct: 100 * h.marketValue / investedValue,
  })).sort((a, b) => b.weightPct - a.weightPct);
  const weights = allocations.map((a) => a.weightPct / 100);
  const hhi = weights.reduce((total, w) => total + w * w, 0);
  const noHistory = (): RiskMetrics => ({
    allocations, investedValue,
    topPositionPct: allocations[0].weightPct,
    topThreePct: allocations.slice(0, 3).reduce((a, h) => a + h.weightPct, 0),
    hhi, effectivePositions: 1 / hhi,
    annualizedVolatilityPct: null, maxDrawdownPct: null,
    dailyReturnObservations: 0, firstDate: null, lastDate: null,
    path: [], historySufficient: false,
    var95Pct: null, var95Usd: null,
    expectedShortfall95Pct: null, expectedShortfall95Usd: null,
    tailObservations: 0, tailRiskSufficient: false,
  });

  const maps = allocations.map((h) => {
    const map = new Map<string, number>();
    for (const bar of priceSeries[h.symbol] ?? []) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(bar.date) &&
          Number.isFinite(bar.close) && bar.close > 0) map.set(bar.date, bar.close);
    }
    return map;
  });
  if (maps.some((m) => m.size < 2)) return noHistory();
  const dates = [...maps[0].keys()].filter((date) => maps.every((map) => map.has(date)))
    .sort().slice(-MAX_CLOSE_POINTS);
  if (dates.length < 2) return noHistory();
  const first = dates[0];
  const initialPrices = maps.map((map) => map.get(first)!);
  const path: RiskPathPoint[] = [];
  let peak = 100;
  let worst = 0;
  const returns: number[] = [];
  let lastValue = 100;
  for (const date of dates) {
    // An equivalent constant share quantity for each starting dollar weight.
    // The historical path is hypothetical, NOT a reconstruction of past trades.
    const index = allocations.reduce((sum, h, i) =>
      sum + (h.weightPct / 100) * 100 * maps[i].get(date)! / initialPrices[i], 0);
    if (path.length) returns.push(index / lastValue - 1);
    lastValue = index;
    peak = Math.max(peak, index);
    const drawdownPct = 100 * (index / peak - 1);
    worst = Math.min(worst, drawdownPct);
    path.push({ date, index, drawdownPct });
  }
  if (returns.length < MIN_RETURN_OBSERVATIONS) {
    return { ...noHistory(), firstDate: first, lastDate: dates[dates.length - 1],
      dailyReturnObservations: returns.length };
  }
  const tail = calculateHistoricalTailRisk95(returns);
  return {
    allocations, investedValue,
    topPositionPct: allocations[0].weightPct,
    topThreePct: allocations.slice(0, 3).reduce((a, h) => a + h.weightPct, 0),
    hhi, effectivePositions: 1 / hhi,
    annualizedVolatilityPct: stdevSample(returns) * Math.sqrt(TRADING_DAYS) * 100,
    maxDrawdownPct: worst, dailyReturnObservations: returns.length,
    firstDate: first, lastDate: dates[dates.length - 1],
    path, historySufficient: true,
    var95Pct: tail?.var95Pct ?? null,
    var95Usd: tail ? investedValue * tail.var95Pct / 100 : null,
    expectedShortfall95Pct: tail?.expectedShortfall95Pct ?? null,
    expectedShortfall95Usd: tail ? investedValue * tail.expectedShortfall95Pct / 100 : null,
    tailObservations: tail?.tailObservations ?? 0,
    tailRiskSufficient: tail !== null,
  };
}
