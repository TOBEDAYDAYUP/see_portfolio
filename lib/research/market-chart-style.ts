import type {ChartBar} from "./chart-utils.ts";

/** UI choices map to six distinct, source-backed price renderers. */
export const MARKET_CHART_STYLES=[
 {value:"bars",label:"Bars"},
 {value:"candles",label:"Candles"},
 {value:"hollow-candles",label:"Hollow Candles"},
 {value:"hlc",label:"HLC"},
 {value:"line",label:"Line"},
 {value:"area",label:"Line with Market Area"},
] as const;
export type MarketChartStyle=typeof MARKET_CHART_STYLES[number]["value"];

export function isMarketChartStyle(value:string):value is MarketChartStyle{
 return MARKET_CHART_STYLES.some(option=>option.value===value);
}

/** A hollow body means the close is >= that bar's own open. */
export function isHollowCandle(bar:Pick<ChartBar,"open"|"close">):boolean{
 return bar.close>=bar.open;
}
/**
 * Traditional hollow candle coloring considers change vs previous close,
 * independently of body fill (which reflects current open vs current close).
 * For the first available bar, fallback to its intrabar direction.
 */
export function marketCandleIsUp(
 bar:Pick<ChartBar,"open"|"close">,previousClose:number|null,
):boolean{
 return previousClose===null||!Number.isFinite(previousClose)
  ?bar.close>=bar.open:bar.close>=previousClose;
}
/** Exactly one existing source timestamp, never a manufactured range midpoint. */
export function inspectionBarTimestamp(bucket:{lastTime:string}):string{
 return bucket.lastTime;
}
/** Real source buckets only, sensible evenly distributed time-axis ticks. */
export function marketTimeTickIndices(count:number,maximum=7):number[]{
 if(!Number.isSafeInteger(count)||count<=0)return [];
 const slots=Math.min(Math.max(1,Math.trunc(maximum)),count);
 if(slots===1)return [0];
 return Array.from({length:slots},(_,i)=>Math.round(i*(count-1)/(slots-1)));
}

/** Cursor Y-axis level, not a quoted transaction or an OHLC close. */
export function chartCursorPrice(y:number,low:number,high:number,top:number,bottom:number):number|null{
 if(![y,low,high,top,bottom].every(Number.isFinite)||high<=low||bottom<=top)return null;
 const position=Math.max(top,Math.min(bottom,y));
 return high-(position-top)/(bottom-top)*(high-low);
}
