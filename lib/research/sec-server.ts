import "server-only";
import { parseSECAnnualFinancials,freeCashFlow,ratioPercent,revenueGrowthPct } from "./financial-math";
import type { FundamentalSnapshot } from "./fundamentals-types";
import { parseSECRecentData } from "./sec-ttm";
import { loadFMPOutstandingShares } from "./fmp-shares";
import { selectSECPrimaryFiling,parseSECInlineShares } from "./sec-inline-shares";

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
async function loadSECInlineOutstanding(cik:string,asOfDate:string){
 try{
  const submission=await getSEC("https://data.sec.gov/submissions/CIK"+cik+".json");
  const filing=selectSECPrimaryFiling(submission,asOfDate,cik);
  if(!filing)return null;
  const response=await fetch(filing.url,{headers:headers(),cache:"no-store",
    signal:AbortSignal.timeout(14000)});
  if(!response.ok)return null;
  const html=await response.text();
  if(html.length>18000000)return null;
  return parseSECInlineShares(html,asOfDate,filing.filed,filing.url);
 }catch{return null;}
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
export async function loadFundamentals(symbol:string,asOfDate=new Date().toISOString().slice(0,10)):Promise<FundamentalSnapshot|null>{
 if(!/^[A-Z0-9][A-Z0-9.\-]{0,15}$/.test(symbol))return null;
 if(!hasSECContact())throw new Error("SEC_USER_AGENT is not configured.");
 const key=symbol+"|"+asOfDate;
 const cached=snapshots.get(key);
 if(cached&&cached.until>Date.now())return cached.value;
 const concurrent=pending.get(key);
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
  const rows=parseSECAnnualFinancials(raw,issuer.cik,asOfDate);
  if(!rows.length)return null;
  const latest=rows[0],m=latest.metrics;
  const recent=parseSECRecentData(raw,rows,asOfDate);
  // SEC companyfacts sometimes omit issuer-level shares for multi-class issuers.
  // Only fill a missing/stale number from the optional FMP outstanding-shares endpoint.
  const existing=recent.sharesOutstanding;
  const stale=!existing||(Date.parse(asOfDate)-Date.parse(existing.asOf))/86400000>220;
  if(stale){
   // Source order: SEC companyfacts → SEC official filing Inline XBRL (aggregate
   // class cover-page shares only if all class contexts share a date) → optional FMP.
   const official=await loadSECInlineOutstanding(issuer.cik,asOfDate);
   if(official&&(Date.parse(asOfDate)-Date.parse(official.asOf))/86400000<=220){
    recent.sharesOutstanding=official;
    recent.notes.push("SEC companyfacts shares unavailable; cover-page Inline XBRL safely reconciled share classes.");
   }else{
    const other=await loadFMPOutstandingShares(symbol,asOfDate);
    if(other&&(Date.parse(asOfDate)-Date.parse(other.asOf))/86400000<=220){
     recent.sharesOutstanding=other;
     recent.notes.push("SEC shares missing/old; FMP total outstanding shares are used as a separate secondary source.");
    }else if(!existing){
     recent.notes.push("SEC companyfacts and Inline XBRL did not yield a verified total share count; FMP alternative is missing, restricted or unconfigured.");
    }
   }
  }
  const notes=[
   "US-GAAP 10-K annual fiscal-year data; no quarterly/YTD figures or analyst estimates.",
   "Missing SEC tags are left unavailable rather than estimated.",
   "Individual fields may come from different filed 10-K versions; use filing links for verification.",
  ];
  const result:FundamentalSnapshot={
   symbol,cik:issuer.cik,companyName:issuer.name,currency:"USD",asOfDate,
   source:"SEC EDGAR · annual US GAAP 10-K",
   fiscalYears:rows,
   revenueYoYPct:revenueGrowthPct(rows),
   netMarginPct:ratioPercent(m.netIncome,m.revenue),
   operatingMarginPct:ratioPercent(m.operatingIncome,m.revenue),
   freeCashFlowUsd:freeCashFlow(m.operatingCashFlow,m.capitalExpenditure),
   latestFilingDate:latest.filedAt,dataUrl,notes,recent,
  };
  return result;
 })();
 pending.set(key,work);
 try{
  const value=await work;
  snapshots.set(key,{until:Date.now()+CACHE_MS,value});
  return value;
 }finally{pending.delete(key);}
}
