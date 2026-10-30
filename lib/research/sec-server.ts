import "server-only";
import { parseSECAnnualFinancials,freeCashFlow,ratioPercent,revenueGrowthPct } from "./financial-math";
import type { FundamentalSnapshot } from "./fundamentals-types";

const TIMEOUT_MS=18000;
const CACHE_MS=60*60*1000;
const TICKER_CACHE_MS=24*60*60*1000;
const tickerUrl="https://www.sec.gov/files/company_tickers.json";
type Ticker={symbol:string;cik:string;name:string};
type AnyRecord=Record<string,unknown>;
const record=(v:unknown):v is AnyRecord=>typeof v==="object" && v!==null && !Array.isArray(v);
let companyList:{until:number;entries:Ticker[]}|null=null;
let tickerPending:Promise<Ticker[]>|null=null;
const snapshots=new Map<string,{until:number;value:FundamentalSnapshot|null}>();
const pending=new Map<string,Promise<FundamentalSnapshot|null>>();

export function hasSECContact():boolean{
 const agent=process.env.SEC_USER_AGENT?.trim();
 // SEC explicitly requires an identifying app name and real contact information.
 return !!agent && agent.length>=12 && /\S+@\S+\.\S+/.test(agent);
}
function headers(){
 const agent=process.env.SEC_USER_AGENT?.trim();
 if(!hasSECContact()||!agent)throw new Error("Missing SEC contact information.");
 return {"User-Agent":agent,Accept:"application/json", "Accept-Encoding":"gzip, deflate"};
}
async function getSEC(url:string):Promise<unknown>{
 const res=await fetch(url,{method:"GET",headers:headers(),
   cache:"no-store",signal:AbortSignal.timeout(TIMEOUT_MS)});
 if(res.status===404)return null;
 if(!res.ok)throw new Error("SEC EDGAR request failed ("+res.status+").");
 return res.json() as Promise<unknown>;
}
async function tickers():Promise<Ticker[]>{
 const now=Date.now();
 if(companyList&&companyList.until>now)return companyList.entries;
 if(tickerPending)return tickerPending;
 tickerPending=(async()=>{
  const payload=await getSEC(tickerUrl);
  if(!record(payload))throw new Error("SEC issuer directory is not available.");
  const entries:Ticker[]=[];
  for(const value of Object.values(payload)){
   if(!record(value)||typeof value.ticker!=="string"||typeof value.title!=="string"||
      typeof value.cik_str!=="number"||!Number.isSafeInteger(value.cik_str)||
      value.cik_str<=0)continue;
   const symbol=value.ticker.toUpperCase().trim();
   if(!/^[A-Z0-9][A-Z0-9.\-]{0,15}$/.test(symbol))continue;
   entries.push({symbol,name:value.title,cik:String(value.cik_str).padStart(10,"0")});
  }
  if(!entries.length)throw new Error("No SEC issuers were available.");
  companyList={entries,until:Date.now()+TICKER_CACHE_MS};
  return entries;
 })();
 try{return await tickerPending;}finally{tickerPending=null;}
}
export async function loadFundamentals(symbol:string):Promise<FundamentalSnapshot|null>{
 if(!/^[A-Z0-9][A-Z0-9.\-]{0,15}$/.test(symbol))return null;
 if(!hasSECContact())throw new Error("SEC_USER_AGENT is not configured.");
 const cached=snapshots.get(symbol);
 if(cached&&cached.until>Date.now())return cached.value;
 const concurrent=pending.get(symbol);
 if(concurrent)return concurrent;
 const work=(async()=>{
  const directory=await tickers();
  // Compare exactly except "." / "-" alternative formatting in class shares.
  const normalized=symbol.replace(/[.\-]/g,"");
  const issuer=directory.find(item=>item.symbol===symbol)??directory.find(item=>
   item.symbol.replace(/[.\-]/g,"")===normalized);
  if(!issuer)return null;
  const dataUrl="https://data.sec.gov/api/xbrl/companyfacts/CIK"+issuer.cik+".json";
  const raw=await getSEC(dataUrl);
  const rows=parseSECAnnualFinancials(raw,issuer.cik);
  if(!rows.length)return null;
  const latest=rows[0],m=latest.metrics;
  const notes=[
   "US-GAAP 10-K annual fiscal-year data; no quarterly/YTD figures or analyst estimates.",
   "Missing SEC tags are left unavailable rather than estimated.",
   "Individual fields may come from different filed 10-K versions; use filing links for verification.",
  ];
  const result:FundamentalSnapshot={
   symbol,cik:issuer.cik,companyName:issuer.name,currency:"USD",
   source:"SEC EDGAR · annual US GAAP 10-K",
   fiscalYears:rows,
   revenueYoYPct:revenueGrowthPct(rows),
   netMarginPct:ratioPercent(m.netIncome,m.revenue),
   operatingMarginPct:ratioPercent(m.operatingIncome,m.revenue),
   freeCashFlowUsd:freeCashFlow(m.operatingCashFlow,m.capitalExpenditure),
   latestFilingDate:latest.filedAt,dataUrl,notes,
  };
  return result;
 })();
 pending.set(symbol,work);
 try{
  const value=await work;
  snapshots.set(symbol,{until:Date.now()+CACHE_MS,value});
  return value;
 }finally{pending.delete(symbol);}
}
