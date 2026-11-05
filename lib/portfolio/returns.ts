import type {AlpacaPosition} from "../alpaca/types";

/**
 * Each point is sourced from matching timestamp/equity/profit_loss slots of
 * Alpaca's actual account history. We do not invent missed observations.
 */
export type ReturnsHistoryPoint={
 timestamp:number;
 equity:number;
 profitLossUsd:number;
};
function isRecord(value:unknown):value is Record<string,unknown>{
 return typeof value==="object"&&value!==null&&!Array.isArray(value);
}
function numeric(value:unknown):number|null{
 if(typeof value!=="number"&&typeof value!=="string")return null;
 if(typeof value==="string"&&value.trim()==="")return null;
 const parsed=Number(value);
 return Number.isFinite(parsed)?parsed:null;
}
export function parseReturnsHistory(
 raw:unknown,allowedTimestamps:ReadonlySet<number>,
):ReturnsHistoryPoint[]{
 if(!isRecord(raw)||!Array.isArray(raw.timestamp)||
    !Array.isArray(raw.equity)||!Array.isArray(raw.profit_loss))return [];
 const result=new Map<number,ReturnsHistoryPoint>();
 for(let i=0;i<raw.timestamp.length;i++){
  const timestamp=numeric(raw.timestamp[i]);
  const equity=numeric(raw.equity[i]);
  const profitLossUsd=numeric(raw.profit_loss[i]);
  if(timestamp===null||!Number.isSafeInteger(timestamp)||timestamp<=0||
     !allowedTimestamps.has(timestamp)||equity===null||equity<=0||
     profitLossUsd===null)continue;
  result.set(timestamp,{timestamp,equity,profitLossUsd});
 }
 return [...result.values()].sort((a,b)=>a.timestamp-b.timestamp);
}
/**
 * A change in broker-reported P/L between two observed account snapshots.
 * NOT time-weighted return, realized trading P/L, or cash-flow adjusted alpha.
 */
export function summarizeReportedPnlMovement(points:readonly ReturnsHistoryPoint[]){
 if(points.length<2)return null;
 const first=points[0],last=points[points.length-1];
 if(!first||!last||first.equity<=0||last.timestamp<=first.timestamp)return null;
 const changeUsd=last.profitLossUsd-first.profitLossUsd;
 const changePctOfOpeningEquity=100*changeUsd/first.equity;
 if(!Number.isFinite(changeUsd)||!Number.isFinite(changePctOfOpeningEquity))return null;
 return {changeUsd,changePctOfOpeningEquity,
  firstTimestamp:first.timestamp,lastTimestamp:last.timestamp,
  observations:points.length,
 };
}
export function summarizeOpenUnrealized(positions:readonly AlpacaPosition[]){
 if(!positions.length)return {openCount:0,unrealizedUsd:0,unrealizedPctOfCost:0};
 // Null is intentionally NOT treated as zero for held positions.
 if(positions.some(p=>p.unrealizedPl===null||p.costBasis===null))
  return {openCount:positions.length,unrealizedUsd:null,unrealizedPctOfCost:null};
 const pnl=positions.reduce((total,p)=>total+p.unrealizedPl!,0);
 const basis=positions.reduce((total,p)=>total+Math.abs(p.costBasis!),0);
 return {openCount:positions.length,
  unrealizedUsd:Number.isFinite(pnl)?pnl:null,
  unrealizedPctOfCost:basis>0&&Number.isFinite(basis)?100*pnl/basis:null,
 };
}
