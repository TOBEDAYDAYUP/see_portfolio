"use client";
import {useEffect,useState} from "react";
import type {PortfolioDividendsResult} from "../../../lib/portfolio/dividends-server";
const money=(v:number|null)=>v===null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(v);
const percent=(v:number)=>v.toFixed(1)+"%";
function Stat({name,value,detail}:{name:string;value:string;detail:string}){
 return <div className="surface-panel rounded-2xl p-5"><p className="text-xs text-slate-400">{name}</p>
  <strong className="mt-3 block text-2xl font-semibold tabular-nums">{value}</strong>
  <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></div>;
}
export default function PortfolioDividends(){
 const [result,setResult]=useState<PortfolioDividendsResult|null>(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  const c=new AbortController();
  void fetch("/api/alpaca/dividends",{signal:c.signal,cache:"no-store"})
   .then(r=>r.json() as Promise<PortfolioDividendsResult>)
   .then(x=>{if(!c.signal.aborted)setResult(x);})
   .catch(()=>{if(!c.signal.aborted)setResult({status:"error",message:"Local dividend API unavailable."});});
  return ()=>c.abort();
 },[]);
 function refresh(){
  setBusy(true);void fetch("/api/alpaca/dividends",{cache:"no-store"})
   .then(x=>x.json() as Promise<PortfolioDividendsResult>).then(setResult)
   .catch(()=>setResult({status:"error",message:"Local dividend API unavailable."}))
   .finally(()=>setBusy(false));
 }
 const data=result?.status==="connected"?result:null;
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="text-xl font-semibold">Portfolio Dividends</h2>
    <p className="mt-1 text-xs text-slate-400">Paper account dividend activity · provider-listed cash distributions · qualified estimates</p>
   </div>
   <button onClick={refresh} disabled={busy} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold">{busy?"Checking…":"↻ Refresh Dividends"}</button>
  </div>
  {!result&&<p className="surface-panel rounded-xl p-6 text-sm" role="status">Loading verified dividend sources…</p>}
  {result&&result.status!=="connected"&&<p className="surface-panel rounded-xl p-6 text-sm" role="status">{result.message}</p>}
  {data&&<>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <Stat name="DIV credits · last 365 days"
     value={data.providerStatus.accountActivities==="ok"&&data.summary.receivedCoverageComplete?money(data.summary.receivedUSD):"—"}
     detail={data.summary.receivedCount+" Alpaca Paper DIV records · incomplete history is withheld"}/>
    <Stat name="Announced next payments · indicative"
     value={data.providerStatus.corporateActions==="ok"&&data.eventsComplete?money(data.summary.announcedIndicativeUSD):"—"}
     detail="Current shares × provider-listed cash rate before future ex-date; NOT confirmed eligibility"/>
    <Stat name="Annualized regular run-rate" value={money(data.summary.annualizedRunRateUSD)}
     detail="Latest regular dividend × cadence; NOT an announced 12-month schedule"/>
    <Stat name="Run-rate coverage" value={percent(data.summary.projectedCoveragePct)}
     detail="Share of eligible invested value with sufficient quarterly payment history"/>
   </div>
   <section className="surface-panel rounded-2xl p-5">
    <h3 className="text-lg font-semibold">Holdings Dividend Schedule</h3>
    <p className="mt-1 text-xs text-slate-400">Ex-date is the eligibility cutoff; today&apos;s shares do not prove past entitlement.</p>
    <div className="mt-4 overflow-x-auto">
     <table className="w-full min-w-[800px] text-left text-xs">
      <thead><tr>{["Stock","Held shares","Next ex-date","Payment date","Declared / share","Indicative cash","Annual run-rate"].map(x=><th key={x} className="border-b border-white/10 p-3 font-medium text-slate-400">{x}</th>)}</tr></thead>
      <tbody>{data.summary.rows.map(r=><tr key={r.symbol} className="border-t border-white/10">
       <td className="p-3 font-semibold">{r.symbol}</td>
       <td className="p-3 tabular-nums">{r.qty.toLocaleString("en-US",{maximumFractionDigits:6})}</td>
       <td className="p-3">{r.nextExDate??"—"}</td><td className="p-3">{r.nextPayDate??"—"}</td>
       <td className="p-3 tabular-nums">{money(r.nextRateUSD)}</td>
       <td className="p-3 tabular-nums">{money(r.announcedIndicativeUSD)}</td>
       <td className="p-3 tabular-nums">{money(r.annualRunRateUSD)}</td>
      </tr>)}</tbody>
     </table>
     {data.summary.rows.length===0&&<p className="p-4 text-sm text-slate-400">No eligible long stock positions in the Paper portfolio.</p>}
    </div>
   </section>
   <details className="surface-panel rounded-2xl p-5">
    <summary className="cursor-pointer text-sm font-semibold">Alpaca Paper DIV activity · history</summary>
    <p className="mt-3 text-xs text-slate-400">Broker-reported net amounts; this is not an after-tax calculation performed by SEEPortfolio.</p>
    <div className="mt-3 max-h-[310px] overflow-y-auto">
     {data.summary.paid.map(x=><div key={x.id} className="flex justify-between gap-4 border-b border-white/10 py-2 text-xs">
      <span>{x.date} · {x.symbol}</span><strong className="tabular-nums">{money(x.netAmountUSD)}</strong>
     </div>)}
     {!data.summary.paid.length&&<p className="py-3 text-xs text-slate-400">No DIV records returned; if the source is incomplete, this does not imply zero dividends.</p>}
    </div>
   </details>
   <details className="surface-panel rounded-2xl p-5">
    <summary className="cursor-pointer text-sm font-semibold">Source coverage and forecast assumptions</summary>
    <div className="mt-3 space-y-2 text-xs leading-6 text-slate-400">
     <p>Received: Alpaca Paper account DIV activities ({data.providerStatus.accountActivities}). Schedules: Alpaca market-data corporate actions ({data.providerStatus.corporateActions}).</p>
     {data.summary.warnings.map(x=><p key={x}>{x}</p>)}
    </div>
   </details>
  </>}
 </div>;
}
