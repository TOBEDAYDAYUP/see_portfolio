import "server-only";
import { planStockChart, parseStockChartBar, selectStockChartBars } from "./chart-utils";
import type { ChartPayload, ChartRange, ChartBar } from "./chart-utils";

const HOST="https://data.alpaca.markets/v2/stocks";
const MAX_PAGES=6;
const TIMEOUT_MS=12000;
type ApiResponse={bars?:unknown;next_page_token?:unknown};
export async function loadStockChart(symbol:string,range:ChartRange):Promise<ChartPayload>{
  const key=process.env.ALPACA_PAPER_KEY_ID?.trim();
  const secret=process.env.ALPACA_PAPER_SECRET_KEY?.trim();
  if(!key||!secret)throw new Error("Alpaca Paper market data not configured.");
  const plan=planStockChart(range);
  const params=new URLSearchParams({
    timeframe:plan.interval,start:plan.start,end:plan.end,
    feed:"iex",adjustment:"split",sort:"asc",limit:"10000",
  });
  let next:string|null=null,complete=false;
  const gathered:ChartBar[]=[];
  for(let page=0;page<MAX_PAGES;page++){
    if(next)params.set("page_token",next);
    const response=await fetch(HOST+"/"+encodeURIComponent(symbol)+"/bars?"+params.toString(),{
      method:"GET",
      headers:{"APCA-API-KEY-ID":key,"APCA-API-SECRET-KEY":secret,Accept:"application/json"},
      cache:"no-store",signal:AbortSignal.timeout(TIMEOUT_MS),
    });
    if(!response.ok)throw new Error("Historical OHLCV bars unavailable from Alpaca.");
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
  const bars=selectStockChartBars(gathered,range);
  return {
    symbol,range,interval:plan.interval,
    source:"Alpaca IEX",adjusted:"split",delayedMinutes:plan.intraday?20:0,
    bars,asOf:bars.at(-1)?.time??null,
  };
}
