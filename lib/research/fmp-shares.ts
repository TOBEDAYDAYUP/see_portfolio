/** Optional secondary provider: never substitutes share float for total outstanding shares. */
export type OutstandingSharesSource = {
 value:number; asOf:string; filedAt:string; tag:string;
 source:"FMP shares-float"; sourceUrl:string;
};
const dateOnly=(x:string)=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+"T00:00:00Z"));
export function parseFMPOutstandingShares(raw:unknown,symbol:string,
  quoteDate:string):OutstandingSharesSource|null{
 if(!Array.isArray(raw))return null;
 const rows=raw.filter((x):x is Record<string,unknown>=>typeof x==="object"&&x!==null&&!Array.isArray(x));
 const qualified=rows.flatMap(row=>{
  const stamp=typeof row.date==="string"?row.date.slice(0,10):"";
  // FMP fields "floatShares" and "freeFloat" must NEVER be used as all shares.
  if(row.symbol!==symbol||!dateOnly(stamp)||stamp>quoteDate||
     typeof row.outstandingShares!=="number"||!Number.isSafeInteger(row.outstandingShares)||
     row.outstandingShares<=0)return [];
  return [{stamp,row}];
 }).sort((a,b)=>b.stamp.localeCompare(a.stamp));
 const pick=qualified[0];
 return pick?{value:pick.row.outstandingShares as number,asOf:pick.stamp,
  filedAt:pick.stamp,tag:"outstandingShares",source:"FMP shares-float",
  sourceUrl:"https://site.financialmodelingprep.com/developer/docs/stable/shares-float"}:null;
}
export async function loadFMPOutstandingShares(symbol:string,asOf:string)
 :Promise<OutstandingSharesSource|null>{
 const key=process.env.FMP_API_KEY?.trim();
 if(!key)return null;
 try{
  const params=new URLSearchParams({symbol,apikey:key});
  const resp=await fetch("https://financialmodelingprep.com/stable/shares-float?"+params.toString(),{
   cache:"no-store",signal:AbortSignal.timeout(9000),headers:{Accept:"application/json"}});
  if(!resp.ok)return null;
  return parseFMPOutstandingShares(await resp.json() as unknown,symbol,asOf);
 }catch{return null;}
}
