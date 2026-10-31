import type { AlpacaPosition } from "../alpaca/types";
import type { CurrentValuation } from "../research/valuation-current";
export type HoldingValuation={
 symbol:string;marketValue:number;weightPct:number;
 price:number|null;priceAsOf:string|null;
 pe:number|null;ps:number|null;pb:number|null;fcfYieldPct:number|null;
 earningsPeriodEnd:string|null;sharesSource:string|null;
 reason:string|null;
};
export type ValuationSummary={
 eligibleInvestedUSD:number;totalPositions:number;eligiblePositions:number;
 peCoveragePct:number;fcfCoveragePct:number;weightedPortfolioPE:number|null;
 weightedFCFYieldPct:number|null; holdings:HoldingValuation[];
};
type Input={position:AlpacaPosition;valuation:CurrentValuation|null;reason?:string};
/** Only long USD equities are eligible. Never invent portfolio P/E from arithmetic
 * averaging or treat negative P/E / missing earnings as zero. */
export function summarizePortfolioValuation(inputs:Input[]):ValuationSummary{
 const eligible=inputs.filter(({position:p})=>p.assetClass==="us_equity"&&p.side==="long"&&
  p.marketValue!==null&&Number.isFinite(p.marketValue)&&p.marketValue>0);
 const invested=eligible.reduce((s,x)=>s+(x.position.marketValue??0),0);
 const rows=eligible.map(({position:p,valuation:v,reason}):HoldingValuation=>{
  const mv=p.marketValue??0;
  const valid=(x:number|null|undefined)=>typeof x==="number"&&Number.isFinite(x)?x:null;
  return {symbol:p.symbol,marketValue:mv,weightPct:invested>0?mv/invested*100:0,
   price:v?.price??null,priceAsOf:v?.priceAsOf??null,
   pe:valid(v?.ttmPEApprox),ps:valid(v?.ttmPSProxy),
   pb:valid(v?.latestPBProxy),fcfYieldPct:valid(v?.ttmFCFYieldProxyPct),
   earningsPeriodEnd:v?.ttmEnd??null,sharesSource:v?.sharesSource??null,
   reason:reason??(v?.ttmPEApprox===null?"TTM GAAP EPS unavailable or not positive":null)};
 });
 const peRows=rows.filter(x=>x.pe!==null&&x.pe>0);
 const peMarket=peRows.reduce((s,x)=>s+x.marketValue,0);
 const peDenom=peRows.reduce((s,x)=>s+x.marketValue/(x.pe??1),0);
 const fcfRows=rows.filter(x=>x.fcfYieldPct!==null);
 const fcfMarket=fcfRows.reduce((s,x)=>s+x.marketValue,0);
 const weightedFCFYieldPct=fcfMarket>0?
  fcfRows.reduce((s,x)=>s+x.marketValue*(x.fcfYieldPct??0),0)/fcfMarket:null;
 return {eligibleInvestedUSD:invested,totalPositions:inputs.length,
  eligiblePositions:eligible.length,
  peCoveragePct:invested>0?peMarket/invested*100:0,
  fcfCoveragePct:invested>0?fcfMarket/invested*100:0,
  weightedPortfolioPE:peMarket>0&&peDenom>0?peMarket/peDenom:null,
  weightedFCFYieldPct,holdings:rows};
}
