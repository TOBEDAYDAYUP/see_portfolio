import type { FundamentalSnapshot } from "./fundamentals-types";

/**
 * FY valuation multiples, not TTM ratios, targets or a DCF.
 * P/S, P/B and FCF yield use FY weighted-average diluted shares as an
 * explicitly labeled MARKET-CAP PROXY. This is not a verified current share count.
 */
export type FYValuation = {
  fiscalYearEnd: string;
  priceAsOf: string;
  price: number | null;
  dilutedEPS: number | null;
  weightedAverageDilutedShares: number | null;
  marketCapProxyUSD: number | null;
  pe: number | null;
  psProxy: number | null;
  pbProxy: number | null;
  fcfYieldProxyPct: number | null;
  available: boolean;
  warnings: string[];
};

const good=(value:number|null|undefined):value is number=>
 typeof value==="number"&&Number.isFinite(value);
const positive=(value:number|null|undefined):value is number=>good(value)&&value>0;
function dayNumber(value:string):number|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const date=Date.parse(value+"T00:00:00Z");
 return Number.isFinite(date)&&new Date(date).toISOString().slice(0,10)===value
  ?Math.floor(date/86400000):null;
}
export function calculateFYValuation(
 data:FundamentalSnapshot, price:number|null, priceAsOf:string,
 today=new Date().toISOString().slice(0,10)
):FYValuation{
 const latest=data.fiscalYears[0];
 const fyEnd=latest?.fiscalYearEnd??"";
 const m=latest?.metrics;
 const eps=m?.dilutedEps??null;
 const shares=m?.dilutedWeightedShares??null;
 const warnings:string[]=[];
 const todayDay=dayNumber(today), priceDay=dayNumber(priceAsOf), fyDay=dayNumber(fyEnd);
 const priceAge=todayDay!==null&&priceDay!==null?todayDay-priceDay:null;
 const fyAge=todayDay!==null&&fyDay!==null?todayDay-fyDay:null;
 const freshPrice=positive(price)&&priceAge!==null&&priceAge>=0&&priceAge<=10;
 const freshFY=fyAge!==null&&fyAge>=0&&fyAge<=550;
 const simpleShareClass=!/[.\-]/.test(data.symbol);
 if(!freshPrice)warnings.push("No usable recent IEX close (10 calendar-day freshness limit). Valuation ratios are withheld.");
 if(!freshFY)warnings.push("Latest SEC fiscal year is missing or older than 550 days. Valuation ratios are withheld.");
 if(!simpleShareClass)warnings.push("Class-specific share pricing may not match issuer-level SEC EPS or share counts; multiples are withheld.");
 const available=freshPrice&&freshFY&&simpleShareClass;
 const cap=available&&positive(shares)?price*shares:null;
 const marketCapProxyUSD=cap!==null&&Number.isFinite(cap)&&cap>0?cap:null;
 const revenue=m?.revenue??null;
 const book=m?.stockholdersEquity??null;
 const ocf=m?.operatingCashFlow??null;
 const capex=m?.capitalExpenditure??null;
 const fcf=good(ocf)&&good(capex)&&capex>=0?ocf-capex:null;
 const pe=available&&positive(eps)?price/eps:null;
 const ps=marketCapProxyUSD!==null&&positive(revenue)?marketCapProxyUSD/revenue:null;
 const pb=marketCapProxyUSD!==null&&positive(book)?marketCapProxyUSD/book:null;
 const yieldPct=marketCapProxyUSD!==null&&good(fcf)?100*fcf/marketCapProxyUSD:null;
 const valid=(n:number|null)=>n!==null&&Number.isFinite(n)&&n>=-1e12&&n<=1e12?n:null;
 if(available&&!positive(eps))
   warnings.push(good(eps)&&eps<=0?"Diluted EPS is zero or negative: FY P/E is not meaningful.":"No verified FY diluted EPS in SEC filing.");
 if(available&&!positive(shares))
   warnings.push("SEC FY diluted weighted-average shares are missing; P/S, P/B and FCF yield cannot be approximated.");
 if(available&&positive(shares))
   warnings.push("Market-cap proxy = IEX close × FY weighted-average diluted shares, NOT current market capitalization. Buybacks, issuance, splits and multiple share classes may materially distort comparisons.");
 return {
  fiscalYearEnd:fyEnd,priceAsOf,price:freshPrice?price:null,
  dilutedEPS:good(eps)?eps:null,weightedAverageDilutedShares:positive(shares)?shares:null,
  marketCapProxyUSD,pe:valid(pe),psProxy:valid(ps),pbProxy:valid(pb),
  fcfYieldProxyPct:valid(yieldPct),available,warnings
 };
}
