import "server-only";
import { planStockChart, parseStockChartBar, selectStockChartBars, assessChartCoverage, marketDateNY } from "./chart-utils";
import type { ChartPayload, ChartRange, ChartBar, ChartRequest } from "./chart-utils";
import { parseAlpacaTradingCalendar, selectRegularTradingBars } from "./chart-session";
import type { TradingSession } from "./chart-session";

const HOST="https://data.alpaca.markets/v2/stocks";
const MAX_PAGES=6;
const TIMEOUT_MS=12000;
type Feed="sip"|"iex";
type ApiResponse={bars?:unknown;next_page_token?:unknown};
class FeedAccessError extends Error {
  constructor(readonly status:number){super("Alpaca feed is not accessible.");}
}
async function fetchBars(symbol:string,range:ChartRange,feed:Feed,
  credentials:{"APCA-API-KEY-ID":string;"APCA-API-SECRET-KEY":string;Accept:string}):Promise<ChartBar[]>{
  const plan=planStockChart(range);
  const params=new URLSearchParams({
    timeframe:plan.interval,start:plan.start,end:plan.end,
    feed,adjustment:"split",sort:"asc",limit:"10000",
  });
  let next:string|null=null,complete=false;
  const gathered:ChartBar[]=[];
  for(let page=0;page<MAX_PAGES;page++){
    if(next)params.set("page_token",next);
    const response=await fetch(HOST+"/"+encodeURIComponent(symbol)+"/bars?"+params.toString(),{
      method:"GET",headers:credentials,
      cache:"no-store",signal:AbortSignal.timeout(TIMEOUT_MS),
    });
    if(response.status===403||response.status===422)throw new FeedAccessError(response.status);
    if(!response.ok)throw new Error("Alpaca historical OHLCV API failed.");
    const result:unknown=await response.json();
    if(!result||typeof result!=="object"||Array.isArray(result))throw new Error("Malformed Alpaca bars response.");
    const parsed=result as ApiResponse;
    if(!Array.isArray(parsed.bars))throw new Error("Malformed Alpaca single-symbol bars response.");
    for(const item of parsed.bars){
      const row=parseStockChartBar(item);
      if(row)gathered.push(row);
    }
    next=typeof parsed.next_page_token==="string"&&parsed.next_page_token?parsed.next_page_token:null;
    if(!next){complete=true;break;}
  }
  if(!complete)throw new Error("Incomplete paginated OHLCV history; refusing partial chart.");
  return gathered;
}
const CALENDAR="https://paper-api.alpaca.markets/v2/calendar";
async function fetchRegularCalendar(
  plan:ChartRequest,
  credentials:{"APCA-API-KEY-ID":string;"APCA-API-SECRET-KEY":string;Accept:string},
):Promise<Map<string,TradingSession>>{
  const params=new URLSearchParams({
    start:plan.start.slice(0,10),
    end:plan.end.slice(0,10),
  });
  const response=await fetch(CALENDAR+"?"+params.toString(),{
    method:"GET",headers:credentials,cache:"no-store",
    signal:AbortSignal.timeout(TIMEOUT_MS),
  });
  if(!response.ok)throw new Error("Alpaca exchange calendar unavailable.");
  return parseAlpacaTradingCalendar(await response.json() as unknown);
}
/**
 * Delayed SIP historical quotes (end >=20 minutes old) are available to Alpaca
 * Basic Trading API accounts. Explicitly fall back to IEX on access denial,
 * never silently label exchange-only data as whole-market data.
 */
export async function loadStockChart(symbol:string,range:ChartRange):Promise<ChartPayload>{
  const key=process.env.ALPACA_PAPER_KEY_ID?.trim();
  const secret=process.env.ALPACA_PAPER_SECRET_KEY?.trim();
  if(!key||!secret)throw new Error("Alpaca Paper market data not configured.");
  const auth={"APCA-API-KEY-ID":key,"APCA-API-SECRET-KEY":secret,Accept:"application/json"};
  let feed:Feed="sip",notice:string|null=null;
  let bars:ChartBar[];
  try{
    bars=await fetchBars(symbol,range,"sip",auth);
  }catch(error){
    // Only explicit access/subscription denial is a valid reason to change feeds.
    if(!(error instanceof FeedAccessError))throw error;
    feed="iex";
    notice="SIP historical access was denied; displaying IEX-only volume and prices instead.";
    bars=await fetchBars(symbol,range,"iex",auth);
  }
  const plan=planStockChart(range);
  if(plan.intraday){
    let calendar:Map<string,TradingSession>|null=null;
    try{
      calendar=await fetchRegularCalendar(plan,auth);
    }catch{
      notice=(notice?notice+" ":"")+"Exchange calendar unavailable: using standard "+
        "9:30 AM–4:00 PM ET session limits; early-closing holidays may not be fully accounted for.";
    }
    bars=selectRegularTradingBars(bars,range,calendar);
  }
  // Pick the latest FULL regular session(s) after filtering, not the
  // latest after-hours-only trading date.
  bars=selectStockChartBars(bars,range);
  const quality=assessChartCoverage(range,bars);
  const latest=bars.at(-1)?.time;
  if(quality!=="sufficient"){
    const detail=bars.length===1
      ?"Only one price bar was returned; this is NOT a complete interval chart."
      : bars.length===0
        ?"No historical trades were returned for this interval."
        : "Limited price bars were returned; this chart may not represent the whole session or interval.";
    notice=(notice?notice+" ":"")+detail;
  }
  // Report actual latest session, never treat a three-days-old bar as today's.
  if(latest && (range==="1D"||range==="5D")){
    const latestMarketDate=marketDateNY(latest);
    const currentMarketDate=marketDateNY(new Date().toISOString());
    if(latestMarketDate!==currentMarketDate){
      notice=(notice?notice+" ":"")+"Latest available intraday trading date: "+latestMarketDate+
        " (New York); not today's session.";
    }
  }
  return {
    symbol,range,interval:plan.interval,
    source:feed==="sip"?"Alpaca SIP":"Alpaca IEX",
    adjusted:"split",delayedMinutes:plan.intraday?20:0,
    quality,notice,bars,asOf:latest??null,
  };
}
