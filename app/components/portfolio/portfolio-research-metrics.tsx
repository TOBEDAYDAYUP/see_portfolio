import type { AnnualPaperPerformance, AlpacaPosition } from "../../../lib/alpaca/types";

type Props = {
  positions: AlpacaPosition[];
  annualPerformance?: AnnualPaperPerformance | null;
};
const money = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
const signedMoney = (value: number): string => (value > 0 ? "+" : "") + money(value);
const signedPercent = (value: number): string => (value > 0 ? "+" : "") + value.toFixed(2) + "%";

type Metric = {
  label: string;
  value: string;
  detail: string;
  footnote: string;
  state: "pending" | "neutral" | "positive" | "negative";
};
function performanceMetric(annual: AnnualPaperPerformance | null | undefined): Metric {
  // Next.js development servers may temporarily serve an older API response
  // without this newly added field. Missing or invalid data must not crash Holdings.
  if (!annual || annual.available !== true ||
      typeof annual.profitLoss !== "number" || !Number.isFinite(annual.profitLoss)) return {
    label: "Trailing 12M Account P/L", value: "—",
    detail: "Account history unavailable", footnote: "Awaiting Alpaca annual P/L data.",
    state: "pending",
  };
  if (annual.completeYear !== true) return {
    label: "Trailing 12M Account P/L", value: "—",
    detail: typeof annual.daysCovered !== "number" || !Number.isFinite(annual.daysCovered) ? "Less than 12 months on record" : "Only " + annual.daysCovered + " days of history",
    footnote: "Available-period P/L: " + signedMoney(annual.profitLoss) + ". Not a full-year result.",
    state: "pending",
  };
  return {
    label: "Trailing 12M Account P/L",
    value: signedMoney(annual.profitLoss),
    detail: typeof annual.profitLossPct !== "number" || !Number.isFinite(annual.profitLossPct) ? "Alpaca-reported P/L" : "Alpaca P/L: " + signedPercent(annual.profitLossPct * 100),
    footnote: "Based on Alpaca's historical P/L; deposits and withdrawals may affect reported performance.",
    state: annual.profitLoss > 0 ? "positive" : annual.profitLoss < 0 ? "negative" : "neutral",
  };
}
function unrealizedMetric(positions: AlpacaPosition[]): Metric {
  if (positions.length === 0) return {
    label: "Unrealized Return", value: money(0),
    detail: "0.00% · No open positions",
    footnote: "Open-position mark-to-market P/L.",
    state: "neutral",
  };
  if (positions.some(p => p.unrealizedPl === null)) return {
    label: "Unrealized Return", value: "—",
    detail: "Incomplete positions data", footnote: "Waiting for position-level P/L from Alpaca.",
    state: "pending",
  };
  const pl = positions.reduce((sum, p) => sum + (p.unrealizedPl ?? 0), 0);
  const basis = positions.reduce((sum, p) => sum + Math.abs(p.costBasis ?? 0), 0);
  return {
    label: "Unrealized Return", value: signedMoney(pl),
    detail: basis > 0 ? signedPercent(pl / basis * 100) + " · " + positions.length + " open positions" : positions.length + " open positions",
    footnote: "Sum of Alpaca-reported unrealized P/L across all open positions.",
    state: pl > 0 ? "positive" : pl < 0 ? "negative" : "neutral",
  };
}

/** Four research-focused metrics; never fabricate model forecasts or income estimates. */
export default function PortfolioResearchMetrics({positions,annualPerformance}:Props) {
  const cards: Metric[] = [
    {
      label: "12M Forecast Upside",
      value: "—",
      detail: "Forecast model pending",
      footnote: "A 12-month valuation model must be built and validated before displaying an estimate.",
      state: "pending",
    },
    performanceMetric(annualPerformance),
    {
      label: "Projected Dividends",
      value: positions.length === 0 ? money(0) + "/yr" : "—",
      detail: positions.length === 0 ? "No open dividend-paying positions" : "Dividend forecast pending",
      footnote: positions.length === 0
        ? "Expected dividend income from the current empty portfolio is zero."
        : "Requires verified dividend schedules, share counts and payment assumptions.",
      state: positions.length === 0 ? "neutral" : "pending",
    },
    unrealizedMetric(positions),
  ];
  const tone = (state: Metric["state"]) =>
    state === "positive" ? "text-emerald-300" :
      state === "negative" ? "text-rose-300" : "text-slate-100";
  return <section aria-label="Portfolio research and performance metrics" className="mb-5">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold">Portfolio insights</h2>
        <p className="mt-1 text-xs text-slate-400">Historical results and future estimates are clearly distinguished.</p>
      </div>
      <span className="text-xs text-slate-500">Alpaca Paper · USD</span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card=><article key={card.label} className="surface-panel flex min-h-[170px] flex-col rounded-2xl p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-slate-400">{card.label}</h3>
          {card.state === "pending" && <span className="shrink-0 rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-slate-500">Pending</span>}
        </div>
        <strong className={"mt-3 block text-2xl font-semibold tabular-nums " + tone(card.state)}>{card.value}</strong>
        <p className="mt-1 text-xs text-slate-300">{card.detail}</p>
        <p className="mt-auto pt-4 text-[11px] leading-5 text-slate-500">{card.footnote}</p>
      </article>)}
    </div>
  </section>;
}
