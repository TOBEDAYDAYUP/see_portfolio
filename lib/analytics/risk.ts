/**
 * Risk Engine v0.1 — pure, deterministic math.
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
};

const MIN_RETURN_OBSERVATIONS = 30;
const MAX_CLOSE_POINTS = 151;
const TRADING_DAYS = 252;

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
  return {
    allocations, investedValue,
    topPositionPct: allocations[0].weightPct,
    topThreePct: allocations.slice(0, 3).reduce((a, h) => a + h.weightPct, 0),
    hhi, effectivePositions: 1 / hhi,
    annualizedVolatilityPct: stdevSample(returns) * Math.sqrt(TRADING_DAYS) * 100,
    maxDrawdownPct: worst, dailyReturnObservations: returns.length,
    firstDate: first, lastDate: dates[dates.length - 1],
    path, historySufficient: true,
  };
}
