/** Price-chart inputs and pure transformations; market prices remain provider-supplied. */
export type ChartRange = "1D"|"5D"|"1M"|"1Y"|"ALL";
export const CHART_RANGES:readonly ChartRange[]=["1D","5D","1M","1Y","ALL"];
export type ChartBar={
  time:string;
  open:number;high:number;low:number;close:number;volume:number;
};
export type ChartPayload={
  symbol:string;
  range:ChartRange;
  interval:"5Min"|"15Min"|"1Day"|"1Week";
  source:"Alpaca SIP"|"Alpaca IEX";
  quality:"sufficient"|"limited"|"insufficient";
  notice:string|null;
  adjusted:"split";
  delayedMinutes:number;
  bars:ChartBar[];
  asOf:string|null;
};
export type ChartRequest={
  interval:ChartPayload["interval"];start:string;end:string;range:ChartRange;
  intraday:boolean;
};
const isRecord=(v:unknown):v is Record<string,unknown>=>
  typeof v==="object" && v!==null && !Array.isArray(v);
function dateInNewYork(iso:string):string{
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(new Date(iso));
  const item=(type:string)=>parts.find(p=>p.type===type)?.value??"";
  return item("year")+"-"+item("month")+"-"+item("day");
}
export function marketDateNY(iso:string):string{return dateInNewYork(iso);}
const isoDaysBefore=(date:Date,days:number)=>new Date(date.getTime()-days*86400000).toISOString();
const tradingCalendarStart=(endNYDate:string,days:number)=>
  new Date(Date.parse(endNYDate+"T00:00:00.000Z")-days*86400000).toISOString().slice(0,10);
const previousNYDate=(now:Date)=>{
  const [year,month,day]=dateInNewYork(now.toISOString()).split("-").map(Number);
  return new Date(Date.UTC(year,month-1,day-1)).toISOString().slice(0,10);
};
/**
 * Intraday windows exclude the latest 20 minutes, avoiding unfinished bars
 * and subscription restrictions. Daily/weekly ranges exclude today's
 * potentially incomplete session (date relative to New York).
 */
export function planStockChart(range:ChartRange,now=new Date()):ChartRequest{
  const endDate=previousNYDate(now);
  const safeNow=new Date(now.getTime()-20*60000);
  switch(range){
    case "1D":return {range,interval:"5Min",start:isoDaysBefore(safeNow,8),end:safeNow.toISOString(),intraday:true};
    case "5D":return {range,interval:"15Min",start:isoDaysBefore(safeNow,16),end:safeNow.toISOString(),intraday:true};
    case "1M":return {range,interval:"1Day",start:tradingCalendarStart(endDate,30),end:endDate,intraday:false};
    case "1Y":return {range,interval:"1Day",start:tradingCalendarStart(endDate,365),end:endDate,intraday:false};
    case "ALL":return {range,interval:"1Week",start:"2016-01-01",end:endDate,intraday:false};
  }
}
export function parseStockChartBar(raw:unknown):ChartBar|null{
  if(!isRecord(raw))return null;
  const time=typeof raw.t==="string"?raw.t:"";
  if(!time || !Number.isFinite(Date.parse(time)))return null;
  const fields=["o","h","l","c","v"] as const;
  if(fields.some(k=>typeof raw[k]!=="number"||!Number.isFinite(raw[k])))return null;
  const [open,high,low,close,volume]=fields.map(k=>raw[k] as number);
  if(open<=0||high<=0||low<=0||close<=0||volume<0||high<Math.max(open,close)||
    low>Math.min(open,close)||high<low)return null;
  return {time,open,high,low,close,volume};
}
/** Sort/deduplicate; restrict intraday 1D/5D to latest available trading sessions. */
export function selectStockChartBars(rows:ChartBar[],range:ChartRange):ChartBar[]{
  const sorted=[...new Map(rows.map(row=>[row.time,row])).values()]
    .sort((a,b)=>a.time.localeCompare(b.time));
  if(!sorted.length||range==="ALL"||range==="1M"||range==="1Y")return sorted;
  const days=[...new Set(sorted.map(b=>dateInNewYork(b.time)))].sort();
  const selected=new Set(days.slice(range==="1D"?-1:-5));
  return sorted.filter(b=>selected.has(dateInNewYork(b.time)));
}

/** Honest coverage signals; volume comes from a real feed, never interpolated. */
export function assessChartCoverage(range:ChartRange,bars:ChartBar[]):ChartPayload["quality"]{
  if(bars.length<2 || bars.every(b=>b.volume===0))return "insufficient";
  if(bars.filter(b=>b.volume===0).length/bars.length>=0.5)return "limited";
  const min:Record<ChartRange,number>={"1D":12,"5D":50,"1M":12,"1Y":100,"ALL":40};
  return bars.length<min[range]?"limited":"sufficient";
}
