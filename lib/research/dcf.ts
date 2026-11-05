/**
 * Five-year equity cash-flow proxy DCF (FCFE-like, NOT unlevered FCFF).
 *
 * Cash flow from operations less capital expenditure includes interest
 * and working-capital effects but does not add net borrowing. As a result
 * it is NOT a formally reconciled FCFE or a WACC/FCFF enterprise DCF.
 *
 * Source cash flow and reported shares must be supplied by independently
 * validated SEC data; all forward assumptions are explicit user inputs.
 * This calculator never fetches data or fabricates analyst estimates.
 */
export type DCFAssumptions={
  baseCashFlowUsd:number;
  sharesOutstanding:number;
  growthRatePct:number;
  costOfEquityPct:number;
  terminalGrowthPct:number;
  referencePriceUsd:number|null;
};
export type DCFYear={
  year:number;
  projectedCashFlowUsd:number;
  presentValueUsd:number;
};
export type DCFResult={
  projectedYears:DCFYear[];
  pvForecastUsd:number;
  terminalValueAtYearFiveUsd:number;
  pvTerminalUsd:number;
  estimatedEquityValueUsd:number;
  estimatedValuePerShareUsd:number;
  upsideVsReferencePct:number|null;
  terminalWeightPct:number;
};
/** Null means insufficient inputs or economically invalid assumptions. */
export function calculateEquityCashFlowDCF(a:DCFAssumptions):DCFResult|null{
 const finite=(n:number)=>Number.isFinite(n);
 if(!finite(a.baseCashFlowUsd)||a.baseCashFlowUsd<=0||
    !finite(a.sharesOutstanding)||a.sharesOutstanding<=0||
    !finite(a.growthRatePct)||a.growthRatePct< -30||a.growthRatePct>50||
    !finite(a.costOfEquityPct)||a.costOfEquityPct<3||a.costOfEquityPct>40||
    !finite(a.terminalGrowthPct)||a.terminalGrowthPct< -5||a.terminalGrowthPct>8||
    a.costOfEquityPct-a.terminalGrowthPct<1)return null;
 const growth=a.growthRatePct/100;
 const requiredReturn=a.costOfEquityPct/100;
 const terminalGrowth=a.terminalGrowthPct/100;
 const projectedYears:DCFYear[]=[];
 let flow=a.baseCashFlowUsd;
 let pvForecastUsd=0;
 for(let year=1;year<=5;year++){
  flow*=1+growth;
  const discounted=flow/(1+requiredReturn)**year;
  if(!finite(flow)||!finite(discounted))return null;
  projectedYears.push({year,projectedCashFlowUsd:flow,presentValueUsd:discounted});
  pvForecastUsd+=discounted;
 }
 const terminalValueAtYearFiveUsd=flow*(1+terminalGrowth)/(requiredReturn-terminalGrowth);
 const pvTerminalUsd=terminalValueAtYearFiveUsd/(1+requiredReturn)**5;
 const estimatedEquityValueUsd=pvForecastUsd+pvTerminalUsd;
 const estimatedValuePerShareUsd=estimatedEquityValueUsd/a.sharesOutstanding;
 if(!finite(estimatedValuePerShareUsd)||estimatedEquityValueUsd<=0)return null;
 const px=a.referencePriceUsd;
 return {
  projectedYears,pvForecastUsd,terminalValueAtYearFiveUsd,pvTerminalUsd,
  estimatedEquityValueUsd,estimatedValuePerShareUsd,
  upsideVsReferencePct:px!==null&&finite(px)&&px>0
   ?(estimatedValuePerShareUsd/px-1)*100:null,
  terminalWeightPct:pvTerminalUsd/estimatedEquityValueUsd*100,
 };
}
