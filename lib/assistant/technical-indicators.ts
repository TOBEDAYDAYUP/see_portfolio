import type {ResearchClose} from "../research/types";

export type AssistantTechnicalIndicators={
  observations:number; asOf:string|null;
  sma5:number|null;sma10:number|null;sma20:number|null;
  rsi14:number|null;macdLine:number|null;macdSignal:number|null;macdHistogram:number|null;
  return5Pct:number|null;return20Pct:number|null;
};
const round=(n:number)=>Number.isFinite(n)?n:null;
const sma=(values:number[],length:number)=>values.length<length?null:
 round(values.slice(-length).reduce((a,b)=>a+b,0)/length);
function rsi(values:number[],period=14):number|null{
 if(values.length<period+1)return null;
 let gain=0,loss=0;
 for(let i=1;i<=period;i++){
  const diff=values[i]-values[i-1];
  gain+=Math.max(0,diff);loss+=Math.max(0,-diff);
 }
 gain/=period;loss/=period;
 for(let i=period+1;i<values.length;i++){
  const diff=values[i]-values[i-1];
  gain=(gain*(period-1)+Math.max(0,diff))/period;
  loss=(loss*(period-1)+Math.max(0,-diff))/period;
 }
 if(gain===0&&loss===0)return 50;
 if(loss===0)return 100;
 if(gain===0)return 0;
 return round(100-100/(1+gain/loss));
}
function emaSeries(values:number[],period:number):Array<number|null>{
 const result:Array<number|null>=values.map(()=>null);
 if(values.length<period)return result;
 let ema=values.slice(0,period).reduce((a,b)=>a+b,0)/period;
 result[period-1]=ema;
 const a=2/(period+1);
 for(let i=period;i<values.length;i++){
  ema=values[i]*a+ema*(1-a);
  result[i]=ema;
 }
 return result;
}
/** Deterministic market indicators from actual, completed IEX daily CLOSES.
 * MACD(12,26,9): EMA12-EMA26 and its 9-point EMA signal.
 * No full-market volume, intraday signals, live prices or future indicators. */
export function calculateAssistantTechnicals(points:readonly ResearchClose[]):AssistantTechnicalIndicators{
 const chronological=[...new Map(points.filter(p=>
  /^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isFinite(p.close)&&p.close>0)
  .map(p=>[p.date,p.close] as const)).entries()]
  .sort((a,b)=>a[0].localeCompare(b[0]));
 const values=chronological.map(x=>x[1]);
 const n=values.length;
 const change=(period:number)=>n>period?round((values[n-1]/values[n-1-period]-1)*100):null;
 const short=emaSeries(values,12),long=emaSeries(values,26);
 const macd=values.map((_,i)=>short[i]!==null&&long[i]!==null
  ?short[i]!-long[i]!:null);
 const available=macd.filter((v):v is number=>v!==null);
 const signal=emaSeries(available,9).at(-1)??null;
 const line=macd.at(-1)??null;
 return {
  observations:n,asOf:chronological.at(-1)?.[0]??null,
  sma5:sma(values,5),sma10:sma(values,10),sma20:sma(values,20),
  rsi14:rsi(values),
  macdLine:line,macdSignal:signal,
  macdHistogram:line!==null&&signal!==null?round(line-signal):null,
  return5Pct:change(5),return20Pct:change(20),
 };
}
