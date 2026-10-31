import type { ChartBar, ChartRange } from "./chart-utils";

export type TradingSession = { date: string; open: string; close: string };
const isRecord=(value:unknown):value is Record<string,unknown> =>
  typeof value==="object"&&value!==null&&!Array.isArray(value);
const hhmm=/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;
const isoDay=/^\d{4}-\d{2}-\d{2}$/;

export function parseAlpacaTradingCalendar(payload:unknown):Map<string,TradingSession>{
 if(!Array.isArray(payload))throw new Error("Unexpected Alpaca trading calendar response.");
 const sessions=new Map<string,TradingSession>();
 for(const item of payload){
  if(!isRecord(item)||typeof item.date!=="string"||
    typeof item.open!=="string"||typeof item.close!=="string"||
    !isoDay.test(item.date)||!hhmm.test(item.open)||!hhmm.test(item.close)||
    item.open>=item.close)throw new Error("Malformed Alpaca trading calendar entry.");
  sessions.set(item.date,{date:item.date,open:item.open,close:item.close});
 }
 return sessions;
}

/** Date/time in America/New_York, not UTC; handles Eastern DST transitions. */
export function easternBarClock(timestamp:string):{date:string;time:string}{
 const parts=new Intl.DateTimeFormat("en-GB",{
  timeZone:"America/New_York",
  year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",hourCycle:"h23",
 }).formatToParts(new Date(timestamp));
 const read=(type:string)=>parts.find(x=>x.type===type)?.value??"";
 return {date:read("year")+"-"+read("month")+"-"+read("day"),
   time:read("hour")+":"+read("minute")};
}

/**
 * 1D, 5D, 1M use intraday source bars only within US equity regular sessions.
 * Times are bar START timestamps; 09:30 included, 16:00 excluded.
 * Exchange calendar specifies early closes and market holidays when available.
 * A missing calendar means standard 09:30-16:00, with explicit UI warning.
 * Daily/weekly provider aggregates are untouched: their intraday components
 * cannot be identified from a single aggregated OHLCV value.
 */
export function selectRegularTradingBars(
 bars:readonly ChartBar[],range:ChartRange,
 sessions:ReadonlyMap<string,TradingSession>|null,
):ChartBar[]{
 if(range==="1Y"||range==="ALL")return [...bars];
 return bars.filter(bar=>{
  const clock=easternBarClock(bar.time);
  const session=sessions
    ? sessions.get(clock.date)
    : {open:"09:30",close:"16:00"};
  if(!session)return false;
  return clock.time>=session.open && clock.time<session.close;
 });
}
