import type { RiskMetrics } from "../analytics/risk";

/** Diagnostic visual indices (0–100), NOT calibrated investment recommendations.
 * High = lower exposure or lower observed risk against explicitly chosen guides.
 * Missing/stale inputs remain null, never neutral scores of 50 or zeros.
 */
export type HealthAxisKey="diversification"|"weightBalance"|"volatility"|"drawdown"|"tailLoss";
export type HealthAxis={
 key:HealthAxisKey;label:string;score:number|null;raw:string;method:string;
};
export type HealthProfile={
 axes:HealthAxis[];available:number;complete:boolean;
 isHistoryFresh:boolean;latestDate:string|null;observations:number;
};
const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
const safeDate=(v:string|null):number|null=>{
 if(typeof v!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v))return null;
 const t=Date.parse(v+"T00:00:00Z");
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===v?t:null;
};
const pct=(n:number)=>n.toFixed(1)+"%";
const number=(v:unknown,lower=0,upper=Infinity):v is number=>
 finite(v)&&v>=lower&&v<=upper;
/** Benchmark guides: 8 effective positions, largest <=20%, annual vol 60%,
 * historical peak drawdown 50%, one-day ES95 8%. They are illustrative and
 * shown alongside actual underlying figures; not a validated health model.
 */
export function buildPortfolioHealthProfile(metrics:RiskMetrics,today=new Date().toISOString().slice(0,10)):HealthProfile{
 const latest=safeDate(metrics.lastDate),now=safeDate(today);
 const age=latest!==null&&now!==null?(now-latest)/86400000:null;
 const fresh=metrics.historySufficient===true&&metrics.dailyReturnObservations>=30&&
  age!==null&&age>=0&&age<=14;
 const tail=fresh&&metrics.tailRiskSufficient===true&&metrics.dailyReturnObservations>=200;
 const diversification=number(metrics.effectivePositions,1)?
  clamp(100*(metrics.effectivePositions-1)/7):null;
 const balance=number(metrics.topPositionPct,0,100)?
  clamp(100*(75-metrics.topPositionPct)/55):null;
 const vol=fresh&&number(metrics.annualizedVolatilityPct)?
  clamp(100*(60-metrics.annualizedVolatilityPct)/60):null;
 const drawdown=fresh&&number(metrics.maxDrawdownPct,-100,0)?
  clamp(100*(50+metrics.maxDrawdownPct)/50):null;
 const es=tail&&number(metrics.expectedShortfall95Pct,0,100)?
  clamp(100*(8-metrics.expectedShortfall95Pct)/8):null;
 const axes:HealthAxis[]=[
  {key:"diversification",label:"Diversification",score:diversification,
   raw:number(metrics.effectivePositions,1)?metrics.effectivePositions.toFixed(2)+" effective positions":"Unavailable",
   method:"HHI effective positions: 1 = 0, 8+ = 100."},
  {key:"weightBalance",label:"Weight balance",score:balance,
   raw:number(metrics.topPositionPct,0,100)?pct(metrics.topPositionPct)+" in largest holding":"Unavailable",
   method:"Largest holding: 75%+ = 0, 20% or less = 100."},
  {key:"volatility",label:"Volatility control",score:vol,
   raw:fresh&&number(metrics.annualizedVolatilityPct)?pct(metrics.annualizedVolatilityPct)+" annualized":"Unavailable",
   method:"Annualized volatility: 60%+ = 0, 0% = 100."},
  {key:"drawdown",label:"Drawdown control",score:drawdown,
   raw:fresh&&number(metrics.maxDrawdownPct,-100,0)?pct(metrics.maxDrawdownPct)+" historical":"Unavailable",
   method:"Historical maximum drawdown: -50% or worse = 0, 0% = 100."},
  {key:"tailLoss",label:"Tail-loss control",score:es,
   raw:tail&&number(metrics.expectedShortfall95Pct,0,100)?pct(metrics.expectedShortfall95Pct)+" daily ES95":"Unavailable",
   method:"Historical one-day ES95: 8%+ = 0, 0% = 100. Requires at least 200 returns."},
 ];
 const available=axes.filter(a=>a.score!==null).length;
 return {axes,available,complete:available===5,isHistoryFresh:fresh,
  latestDate:metrics.lastDate,observations:metrics.dailyReturnObservations};
}
