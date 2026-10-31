import type { FundamentalSnapshot } from "./fundamentals-types";
import { calculateFYValuation } from "./valuation-math";

export type CurrentValuation={
  price:number|null;priceAsOf:string;priceSource:string;
  fyPE:number|null;
  ttmPEApprox:number|null;ttmPSProxy:number|null;
  latestPBProxy:number|null;ttmFCFYieldProxyPct:number|null;
  marketCapProxyUSD:number|null;
  ttmEnd:string|null;ttmRevenue:number|null;ttmNetIncome:number|null;
  ttmFCF:number|null;ttmEPSApprox:number|null;
  sharesOutstanding:number|null;sharesDate:string|null;
  bookEquity:number|null;bookDate:string|null;
  warnings:string[];hasCurrentInputs:boolean;
};
const valid=(n:number|null|undefined):n is number=>typeof n==="number"&&Number.isFinite(n);
const positive=(n:number|null|undefined):n is number=>valid(n)&&n>0;
const days=(a:string,b:string)=>{
 const d1=Date.parse(a+"T00:00:00Z"),d2=Date.parse(b+"T00:00:00Z");
 return Number.isFinite(d1)&&Number.isFinite(d2)?(d2-d1)/86400000:null;
};
const ratio=(n:number|null,d:number|null):number|null=>
 n!==null&&d!==null&&d>0&&Number.isFinite(n/d)?n/d:null;
/**
 * Avoid false live market-cap claims: these multiples use a DATED SEC share
 * snapshot. TTM diluted EPS is labeled approximate due to rounded reported EPS.
 * When any component is absent/stale, its own ratio is null.
 */
export function calculateCurrentValuation(data:FundamentalSnapshot,
 price:number|null,priceAsOf:string,priceSource:string,
 today=new Date().toISOString().slice(0,10)):CurrentValuation{
 const warnings:string[]=[];
 const fy=calculateFYValuation(data,price,priceAsOf,today);
 const age=days(priceAsOf,today);
 const recentPrice=positive(price)&&age!==null&&age>=0&&age<=10;
 const classOK=!/[.\-]/.test(data.symbol);
 if(!recentPrice)warnings.push("The daily reference close is missing or more than 10 calendar days old; multiples are withheld.");
 if(!classOK)warnings.push("Multiple share classes: issuer-level SEC shares and EPS may not match this ticker; multiples are withheld.");
 const enabled=recentPrice&&classOK;
 const sharesPoint=data.recent?.sharesOutstanding;
 const equityPoint=data.recent?.bookEquity;
 const ttm=data.recent?.ttm;
 const sharesAge=sharesPoint?days(sharesPoint.asOf,priceAsOf):null;
 const equityAge=equityPoint?days(equityPoint.asOf,priceAsOf):null;
 const sharesOK=enabled&&sharesPoint&&positive(sharesPoint.value)&&sharesPoint.filedAt<=priceAsOf&&
  sharesAge!==null&&sharesAge>=0&&sharesAge<=220;
 const equityOK=enabled&&equityPoint&&positive(equityPoint.value)&&equityPoint.filedAt<=priceAsOf&&
  equityAge!==null&&equityAge>=0&&equityAge<=220;
 const ttmAge=ttm?days(ttm.periodEnd,priceAsOf):null;
 const ttmOK=enabled&&ttm&&ttm.filedAt<=priceAsOf&&ttmAge!==null&&ttmAge>=0&&ttmAge<=310;
 const cap=sharesOK&&positive(price)?price*sharesPoint.value:null;
 const marketCapProxyUSD=positive(cap)?cap:null;
 const ttmEPSApprox=ttmOK&&valid(ttm.dilutedEpsApprox)?ttm.dilutedEpsApprox:null;
 const ttmRevenue=ttmOK&&valid(ttm.revenue)?ttm.revenue:null;
 const ttmNetIncome=ttmOK&&valid(ttm.netIncome)?ttm.netIncome:null;
 const ttmFCF=ttmOK&&valid(ttm.freeCashFlow)?ttm.freeCashFlow:null;
 const bookEquity=equityOK?equityPoint.value:null;
 if(enabled&&!sharesOK)warnings.push("Recent SEC shares outstanding are not available; market-cap-based ratios are withheld.");
 if(enabled&&!equityOK)warnings.push("Recent SEC shareholder equity is not available; P/B is withheld.");
 if(enabled&&!ttmOK)warnings.push("A complete recent 10-Q TTM bridge is unavailable; TTM ratios are withheld.");
 if(ttmOK&&ttmEPSApprox!==null)warnings.push("TTM diluted EPS is FY EPS + latest 10-Q YTD EPS − prior comparable 10-Q YTD EPS; rounded/dilution changes make it approximate.");
 if(marketCapProxyUSD!==null)warnings.push(
  "Market-cap proxy uses SEC reported shares as of "+sharesPoint!.asOf+
  ", not shares outstanding today. It is not a live market capitalization.");
 const pe=enabled&&positive(price)&&positive(ttmEPSApprox)?price/ttmEPSApprox:null;
 const ps=ratio(marketCapProxyUSD,ttmRevenue);
 const pb=ratio(marketCapProxyUSD,bookEquity);
 const yieldPct=ratio(ttmFCF,marketCapProxyUSD);
 return {
  price:recentPrice?price:null,priceAsOf,priceSource,
  fyPE:fy.pe,ttmPEApprox:valid(pe)?pe:null,
  ttmPSProxy:ps,latestPBProxy:pb,
  ttmFCFYieldProxyPct:yieldPct===null?null:yieldPct*100,
  marketCapProxyUSD,
  ttmEnd:ttmOK?ttm.periodEnd:null,ttmRevenue,ttmNetIncome,ttmFCF,ttmEPSApprox,
  sharesOutstanding:sharesOK?sharesPoint.value:null,
  sharesDate:sharesOK?sharesPoint.asOf:null,
  bookEquity,bookDate:equityOK?equityPoint.asOf:null,
  warnings,hasCurrentInputs:enabled,
 };
}
