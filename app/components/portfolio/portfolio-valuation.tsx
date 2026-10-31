"use client";
import {useEffect,useState} from "react";
import type {PortfolioValuationResult} from "../../../lib/portfolio/valuation-server";
const money=(v:number|null)=>v===null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(v);
const multiple=(v:number|null)=>v===null?"—":v.toFixed(2)+"×";
const pct=(v:number|null)=>v===null?"—":v.toFixed(2)+"%";
function Stat({title,value,detail}:{title:string;value:string;detail:string}){
 return <div className="surface-panel rounded-2xl p-5">
  <div className="text-xs text-slate-400">{title}</div>
  <strong className="mt-2 block text-2xl font-semibold tabular-nums">{value}</strong>
  <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
 </div>;
}
export default function PortfolioValuation(){
 const [data,setData]=useState<PortfolioValuationResult|null>(null);
 const [loading,setLoading]=useState(false);
 useEffect(()=>{
  const c=new AbortController();
  void fetch("/api/alpaca/valuation",{cache:"no-store",signal:c.signal}).then(x=>x.json() as Promise<PortfolioValuationResult>)
   .then(x=>{if(!c.signal.aborted)setData(x);}).catch(()=>{if(!c.signal.aborted)setData({status:"error",message:"Local valuation API unavailable."});});
  return ()=>c.abort();
 },[]);
 function reload(){
  setLoading(true);
  void fetch("/api/alpaca/valuation",{cache:"no-store"}).then(x=>x.json() as Promise<PortfolioValuationResult>)
   .then(setData).catch(()=>setData({status:"error",message:"Local valuation API unavailable."}))
   .finally(()=>setLoading(false));
 }
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="text-xl font-semibold">Portfolio Valuation</h2>
    <p className="mt-1 text-xs text-slate-400">Alpaca Paper holdings · SEC filings · IEX reference close · optional FMP shares</p></div>
   <button onClick={reload} disabled={loading} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold">{loading?"Calculating…":"↻ Refresh Valuation"}</button>
  </div>
  {!data&&<p role="status" className="surface-panel rounded-xl p-6 text-sm">Loading read-only portfolio valuation…</p>}
  {data&&data.status!=="connected"&&<div role="status" className="surface-panel rounded-xl p-6 text-sm">{data.message}</div>}
  {data?.status==="connected"&&<>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <Stat title="Covered portfolio TTM P/E" value={multiple(data.summary.weightedPortfolioPE)}
     detail={"Earnings-yield weighted · "+pct(data.summary.peCoveragePct)+" of eligible invested value covered"}/>
    <Stat title="Covered TTM FCF Yield" value={pct(data.summary.weightedFCFYieldPct)}
     detail={"Value weighted · "+pct(data.summary.fcfCoveragePct)+" of eligible value covered"}/>
    <Stat title="Valuation Coverage · P/E" value={pct(data.summary.peCoveragePct)}
     detail="Profitable, valid TTM P/E positions only; excludes unknown and loss-making P/E"/>
    <Stat title="Eligible invested stocks" value={money(data.summary.eligibleInvestedUSD)}
     detail={data.summary.eligiblePositions+" long US equities · excludes cash, shorts and other asset types"}/>
   </div>
   <div className="surface-panel rounded-2xl p-5">
    <h3 className="text-lg font-semibold">Holdings Valuation</h3>
    <p className="mt-1 text-xs text-slate-400">Market-value weights from Alpaca Paper, valuation multiples from matching historical IEX prices</p>
    {data.summary.holdings.length===0?<p className="mt-5 text-sm text-slate-400">No eligible long US equity holdings.</p>:
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs">
     <thead><tr>{["Symbol","Weight","TTM P/E","TTM P/S","Latest P/B","FCF Yield","Sources / date"].map(x=><th key={x} className="border-b border-white/10 p-3 font-medium text-slate-400">{x}</th>)}</tr></thead>
     <tbody>{data.summary.holdings.map(h=><tr key={h.symbol} className="border-t border-white/10">
      <td className="p-3 font-semibold">{h.symbol}</td><td className="p-3 tabular-nums">{pct(h.weightPct)}</td>
      <td className="p-3 tabular-nums">{multiple(h.pe)}</td><td className="p-3 tabular-nums">{multiple(h.ps)}</td>
      <td className="p-3 tabular-nums">{multiple(h.pb)}</td><td className="p-3 tabular-nums">{pct(h.fcfYieldPct)}</td>
      <td className="p-3 text-slate-400">{h.sharesSource??"No verified shares"} · {h.priceAsOf??"—"}
       {h.reason&&<span className="block text-amber-300">{h.reason}</span>}</td>
     </tr>)}</tbody>
    </table></div>}
   </div>
   <details className="surface-panel rounded-2xl p-5"><summary className="cursor-pointer text-sm font-semibold">Coverage, accounting methods and limitations</summary>
    <div className="mt-3 space-y-2 text-xs leading-6 text-slate-400">{data.notes.map(x=><p key={x}>{x}</p>)}</div>
   </details>
  </>}
 </div>;
}
