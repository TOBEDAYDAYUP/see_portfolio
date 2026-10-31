import type { AlpacaPosition } from "../alpaca/types";
export type CashDividend={
 id:string;symbol:string;exDate:string;payableDate:string|null;
 declarationDate:string|null;rateUSD:number;special:boolean;
};
export type ReceivedDividend={id:string;symbol:string;date:string;netAmountUSD:number};
export type DividendRow={
 symbol:string;qty:number;marketValue:number;
 nextExDate:string|null;nextPayDate:string|null;nextRateUSD:number|null;
 announcedIndicativeUSD:number|null;annualRateUSD:number|null;annualRunRateUSD:number|null;
};
export type DividendSummary={
 receivedUSD:number; receivedCount:number; receivedCoverageComplete:boolean;
 announcedIndicativeUSD:number|null;annualizedRunRateUSD:number|null;
 projectedCoveragePct:number;rows:DividendRow[];
 paid:ReceivedDividend[];warnings:string[];
};
type Obj=Record<string,unknown>;
const obj=(x:unknown):x is Obj=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const date=(s:unknown):s is string=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+"T00:00:00Z"));
const numeric=(x:unknown):number|null=>{
 if(typeof x!=="number"&&typeof x!=="string")return null;
 if(typeof x==="string"&&!x.trim())return null;
 const v=Number(x);return Number.isFinite(v)?v:null;
};
export function parseCashDividends(raw:unknown):CashDividend[]{
 if(!obj(raw)||!Array.isArray(raw.cash_dividends))return [];
 const seen=new Set<string>(),out:CashDividend[]=[];
 for(const item of raw.cash_dividends){
  if(!obj(item)||typeof item.symbol!=="string"||!date(item.ex_date)||
     (item.currency!==undefined&&item.currency!==""&&item.currency!=="USD"))continue;
  const rate=numeric(item.rate);
  if(rate===null||rate<=0||rate>10000)continue;
  const key=typeof item.id==="string"?item.id:item.symbol+"|"+item.ex_date+"|"+rate;
  if(seen.has(key))continue;seen.add(key);
  out.push({id:key,symbol:item.symbol,exDate:item.ex_date,
   payableDate:date(item.payable_date)?item.payable_date:null,
   declarationDate:date(item.declaration_date)?item.declaration_date:
    date(item.process_date)?item.process_date:null,
   rateUSD:rate,special:item.special===true});
 }
 return out.sort((a,b)=>a.exDate.localeCompare(b.exDate));
}
export function parseReceivedDividends(raw:unknown):ReceivedDividend[]{
 if(!Array.isArray(raw))return [];
 const seen=new Set<string>(),out:ReceivedDividend[]=[];
 for(const item of raw){
  if(!obj(item)||item.activity_type!=="DIV"||typeof item.id!=="string"||
     typeof item.symbol!=="string"||!date(item.date))continue;
  const v=numeric(item.net_amount);
  if(v===null||!Number.isFinite(v)||seen.has(item.id))continue;
  seen.add(item.id);out.push({id:item.id,symbol:item.symbol,date:item.date,netAmountUSD:v});
 }
 return out.sort((a,b)=>b.date.localeCompare(a.date));
}
const elapsed=(a:string,b:string)=>
 (Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000;
/** Forecasting is explicitly run-rate assuming latest regular quarterly dividend repeats.
 * 3 separate ex-dates at sensible quarterly spacing are required, never specials. */
export function annualRegularRate(events:CashDividend[],symbol:string,today:string):number|null{
 const historical=events.filter(e=>e.symbol===symbol&&!e.special&&e.exDate<=today&&
   elapsed(e.exDate,today)<=410).sort((a,b)=>b.exDate.localeCompare(a.exDate));
 if(historical.length<3)return null;
 const last=historical.slice(0,3);
 if(last.some(e=>e.rateUSD<=0))return null;
 if(![elapsed(last[1].exDate,last[0].exDate),elapsed(last[2].exDate,last[1].exDate)]
  .every(x=>x>=55&&x<=115))return null;
 return last[0].rateUSD*4;
}
export function summarizeDividends(positions:AlpacaPosition[],events:CashDividend[],
 paid:ReceivedDividend[],paidComplete:boolean,today:string):DividendSummary{
 const longs=positions.filter(p=>p.assetClass==="us_equity"&&p.side==="long"&&
  p.marketValue!==null&&p.marketValue>0&&p.qty!==null&&p.qty>0);
 const invested=longs.reduce((s,p)=>s+(p.marketValue??0),0);
 const rows=longs.map((p):DividendRow=>{
  const upcoming=events.filter(e=>e.symbol===p.symbol&&e.exDate>today&&
   e.declarationDate!==null&&e.declarationDate<=today).sort((a,b)=>a.exDate.localeCompare(b.exDate))[0];
  const annualRateUSD=annualRegularRate(events,p.symbol,today);
  return {symbol:p.symbol,qty:p.qty??0,marketValue:p.marketValue??0,
   nextExDate:upcoming?.exDate??null,nextPayDate:upcoming?.payableDate??null,
   nextRateUSD:upcoming?.rateUSD??null,announcedIndicativeUSD:upcoming?upcoming.rateUSD*(p.qty??0):null,
   annualRateUSD,annualRunRateUSD:annualRateUSD===null?null:annualRateUSD*(p.qty??0)};
 });
 const projected=rows.filter(x=>x.annualRunRateUSD!==null);
 const sumProjected=projected.reduce((s,x)=>s+(x.annualRunRateUSD??0),0);
 const announced=rows.filter(x=>x.announcedIndicativeUSD!==null);
 return {receivedUSD:paid.reduce((s,x)=>s+x.netAmountUSD,0),receivedCount:paid.length,
  receivedCoverageComplete:paidComplete,
  announcedIndicativeUSD:announced.length?announced.reduce((s,x)=>s+(x.announcedIndicativeUSD??0),0):null,
  annualizedRunRateUSD:projected.length?sumProjected:null,
  projectedCoveragePct:invested>0?100*projected.reduce((s,x)=>s+x.marketValue,0)/invested:0,
  rows,paid,warnings:[
   "Received dividends are Alpaca Paper activity DIV only (net_amount); special/capital-gain/withholding activity types are not included.",
   "Announced payout = current shares × declared rate before ex-date; it does not prove entitlement or account receipt.",
   "Annual run-rate requires at least 3 quarterly-spaced regular dividends; assumes the latest rate persists and excludes specials.",
   "Missing scheduled dividends are not evidence of a zero-dividend company; provider announcements can be delayed.",
  ]};
}
