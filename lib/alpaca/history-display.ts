import type {PortfolioHistoryPoint} from "./types.ts";
import type {PortfolioHistoryRange} from "./history-range.ts";

// Always derive trading sessions from the *timestamps Alpaca returned*.
// Weekends, holidays and absent observations are never interpolated.
const nyDateFormatter=new Intl.DateTimeFormat("en-US",{
 timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",
});
export function newYorkSessionDate(timestampSeconds:number):string|null{
 if(!Number.isFinite(timestampSeconds))return null;
 const date=new Date(timestampSeconds*1000);
 if(!Number.isFinite(date.getTime()))return null;
 const parts=nyDateFormatter.formatToParts(date);
 const field=(name:string)=>parts.find(part=>part.type===name)?.value;
 const year=field("year"),month=field("month"),day=field("day");
 return year&&month&&day?`${year}-${month}-${day}`:null;
}
function isWeekday(key:string){
 const weekday=new Date(key+"T12:00:00Z").getUTCDay();
 return weekday!==0&&weekday!==6;
}
/** Recent five distinct NY weekday sessions, not five calendar days. */
export function lastFiveMarketSessions(points:PortfolioHistoryPoint[]):PortfolioHistoryPoint[]{
 const sorted=points.filter(p=>Number.isFinite(p.timestamp)&&Number.isFinite(p.equity)&&p.equity>=0)
  .sort((a,b)=>a.timestamp-b.timestamp);
 const sessionDates=[...new Set(sorted.map(p=>newYorkSessionDate(p.timestamp))
  .filter((key):key is string=>key!==null&&isWeekday(key)))];
 const chosen=new Set(sessionDates.slice(-5));
 return sorted.filter(p=>{
  const key=newYorkSessionDate(p.timestamp);
  return key!==null&&chosen.has(key);
 });
}
/**
 * 5 equally spaced REAL observations for a normal range. In 5D, choose
 * one label from each of the five actual trading sessions instead.
 * With fewer observations/sessions, show fewer labels, never fake dates.
 */
export function historyXAxisTickIndices(points:PortfolioHistoryPoint[],range:PortfolioHistoryRange):number[]{
 const count=points.length;
 if(count===0)return [];
 if(count===1)return [0];
 if(range==="5D"){
  const groups=new Map<string,{first:number;last:number}>();
  points.forEach((p,i)=>{
   const key=newYorkSessionDate(p.timestamp);
   if(!key)return;
   const previous=groups.get(key);
   if(previous)previous.last=i;
   else groups.set(key,{first:i,last:i});
  });
  const sessions=[...groups.values()].slice(-5);
  if(sessions.length===1)return [sessions[0].first];
  if(sessions.length>=2){
   return sessions.map((s,i)=>i===0?s.first:i===sessions.length-1?s.last:Math.round((s.first+s.last)/2));
  }
 }
 const slots=Math.min(5,count);
 return Array.from({length:slots},(_,i)=>Math.round(i*(count-1)/(slots-1)));
}
