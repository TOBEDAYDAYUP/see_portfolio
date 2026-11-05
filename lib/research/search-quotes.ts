import type { ResearchSearchQuote } from "./types";

/** Alpaca multi-symbol snapshots provide dailyBar and prevDailyBar per ticker. */
type RecordValue=Record<string,unknown>;
const object=(x:unknown):x is RecordValue=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const validDate=(x:string)=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+"T00:00:00.000Z"))&&
 new Date(x+"T00:00:00.000Z").toISOString().slice(0,10)===x;

/** Return the actual New York trading-session date, including DST transitions. */
function newYorkDate(iso:string):string{
 const parts=new Intl.DateTimeFormat("en-US",{
  timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",
 }).formatToParts(new Date(iso));
 const part=(key:string)=>parts.find(item=>item.type===key)?.value??"";
 return part("year")+"-"+part("month")+"-"+part("day");
}
function dailyBar(x:unknown):{close:number;date:string}|null{
 if(!object(x)||typeof x.c!=="number"||!Number.isFinite(x.c)||x.c<=0||
    typeof x.t!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(x.t)||
    !Number.isFinite(Date.parse(x.t)))return null;
 const date=newYorkDate(x.t);
 return validDate(date)?{close:x.c,date}:null;
}
const days=(a:string,b:string)=>
 (Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000;

/** Return only verified, recent, distinct trading sessions.
 * The percent/dollar change is OUR calculation from two Alpaca IEX daily bars.
 * This avoids treating potentially stale, extended-hours latest trades as a
 * current regular-session close, and never fabricates quotes when missing.
 */
export function parseAlpacaSearchSnapshots(raw:unknown,symbols:string[],
 today=newYorkDate(new Date().toISOString())):Record<string,ResearchSearchQuote>{
 const out:Record<string,ResearchSearchQuote>={};
 if(!object(raw)||!validDate(today))return out;
 for(const symbol of symbols){
  const snapshot=raw[symbol];
  if(!object(snapshot))continue;
  const current=dailyBar(snapshot.dailyBar),previous=dailyBar(snapshot.prevDailyBar);
  if(!current||!previous||current.date<=previous.date)continue;
  const age=days(current.date,today);
  // Do not show obsolete/delisted symbols as the price today.
  if(age<0||age>10||days(previous.date,current.date)>10)continue;
  const changeUSD=current.close-previous.close;
  const changePct=(changeUSD/previous.close)*100;
  if(!Number.isFinite(changeUSD)||!Number.isFinite(changePct))continue;
  out[symbol]={
   symbol,priceUSD:current.close,changeUSD,changePct,
   sessionDate:current.date,previousSessionDate:previous.date,source:"Alpaca IEX",
  };
 }
 return out;
}
