/** Verified SEC annual US-GAAP filing measurements, not projections. */
export type AnnualMetric="revenue"|"netIncome"|"operatingIncome"|"operatingCashFlow"|
 "capitalExpenditure"|"totalAssets"|"totalLiabilities"|"cash";
export type AnnualFinancialRow={
  fiscalYear:number; fiscalYearEnd:string; filedAt:string;
  metrics:Record<AnnualMetric,number|null>;
  filingUrl:string|null;
};
export type FundamentalSnapshot={
  symbol:string;cik:string; companyName:string;
  currency:"USD"; source:"SEC EDGAR · annual US GAAP 10-K";
  fiscalYears:AnnualFinancialRow[];
  revenueYoYPct:number|null; netMarginPct:number|null;
  operatingMarginPct:number|null; freeCashFlowUsd:number|null;
  latestFilingDate:string|null; dataUrl:string;
  notes:string[];
};
export type FundamentalsApiResponse=
 | {status:"ok";data:FundamentalSnapshot}
 | {status:"not_configured";message:string}
 | {status:"not_available";message:string}
 | {status:"error";message:string};
