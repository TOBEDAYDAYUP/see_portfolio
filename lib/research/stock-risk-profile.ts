import type {StockRiskSummary} from "../research/types";

/** These are illustrative control indices, not a buy/sell signal or calibrated
 * probability. A single stock has no portfolio diversification score. */
export type StockRiskAxis={
 key:"volatility"|"drawdown"|"var"|"es"|"history";
 label:string;score:number|null;raw:string;method:string;
};
const cap=(v:number)=>Math.max(0,Math.min(100,v));
const value=(x:number|null)=>typeof x==="number"&&Number.isFinite(x)?x:null;
const control=(x:number|null,reference:number)=>x===null||x<0?null:cap(100*(1-x/reference));
const pct=(x:number|null)=>x===null?"Unavailable":x.toFixed(2)+"%";
export function buildStockRiskProfile(risk:StockRiskSummary|null):StockRiskAxis[]{
 const n=risk?.observations??0;
 const enough=n>=30;
 const tail=n>=200;
 const volatility=enough?value(risk?.annualizedVolatilityPct??null):null;
 const drawdown=enough?value(risk?.maxDrawdownPct??null):null;
 const var95=tail?value(risk?.var95Pct??null):null;
 const es=tail?value(risk?.expectedShortfall95Pct??null):null;
 return [
  {key:"volatility",label:"Volatility",score:control(volatility,65),
   raw:pct(volatility),
   method:"Annualized volatility; illustrative reference: 0% → 100, 65%+ → 0."},
  {key:"drawdown",label:"Drawdown",score:drawdown===null||drawdown>0?null:control(Math.abs(drawdown),60),
   raw:pct(drawdown),
   method:"Historical maximum drawdown; reference: 0% → 100, −60% or worse → 0."},
  {key:"var",label:"1-day VaR",score:control(var95,6),
   raw:pct(var95),
   method:"Historical 1-day VaR95 loss; reference: 0% → 100, 6%+ → 0. Requires 200 returns."},
  {key:"es",label:"1-day ES",score:control(es,10),
   raw:pct(es),
   method:"Historical 1-day ES95; reference: 0% → 100, 10%+ → 0. Requires 200 returns."},
  {key:"history",label:"Sample depth",score:n>=30?cap(n/300*100):null,
   raw:n>=30?n+" daily returns":"Unavailable",
   method:"Data coverage, not investment quality: 30 returns → 10, 300+ → 100."},
 ];
}
