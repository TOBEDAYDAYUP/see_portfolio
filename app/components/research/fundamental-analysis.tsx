"use client";
import { useEffect,useState } from "react";
import type { FundamentalSnapshot,FundamentalsApiResponse } from "../../../lib/research/fundamentals-types";
import ValuationAnalysis from "./valuation-analysis";

const compactUSD=(num:number|null)=>{
 if(num===null||!Number.isFinite(num))return "—";
 const abs=Math.abs(num);
 if(abs>=1e12)return (num/1e12).toFixed(2)+"T";
 if(abs>=1e9)return (num/1e9).toFixed(2)+"B";
 if(abs>=1e6)return (num/1e6).toFixed(1)+"M";
 return new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(num);
};
const percent=(v:number|null)=>v===null?"—":(v>0?"+":"")+v.toFixed(2)+"%";
function Metric({label,value,detail}:{label:string;value:string;detail:string}){
 return <div className="rounded-xl border border-white/10 p-4">
  <p className="text-xs text-slate-400">{label}</p>
  <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
  <p className="mt-2 text-[11px] leading-5 text-slate-500">{detail}</p>
 </div>;
}
function AnnualFundamentals({data}:{data:FundamentalSnapshot}){
 const latest=data.fiscalYears[0];
 return <div className="space-y-5">
  <div className="flex flex-wrap justify-between gap-3 text-xs text-slate-400">
   <div>Fiscal year ended <strong className="font-medium text-slate-200">{latest.fiscalYearEnd}</strong> · filed {data.latestFilingDate}</div>
   <a className="font-semibold text-[#75d6c6] hover:underline" rel="noopener noreferrer"
     target="_blank" href={data.dataUrl}>Original SEC XBRL source ↗</a>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Metric label="Annual Revenue" value={compactUSD(latest.metrics.revenue)}
     detail={"USD · "+percent(data.revenueYoYPct)+" vs prior fiscal year"}/>
   <Metric label="Net Income" value={compactUSD(latest.metrics.netIncome)}
     detail={"USD · Net margin "+percent(data.netMarginPct)}/>
   <Metric label="Operating Cash Flow" value={compactUSD(latest.metrics.operatingCashFlow)}
     detail="USD · as reported on cash-flow statement"/>
   <Metric label="Free Cash Flow" value={compactUSD(data.freeCashFlowUsd)}
     detail="Operating cash flow − PP&E purchases; not available if either input is missing"/>
   <Metric label="Operating Margin" value={percent(data.operatingMarginPct)}
     detail="Annual GAAP operating income / revenue"/>
   <Metric label="Total Assets" value={compactUSD(latest.metrics.totalAssets)}
     detail="USD · balance sheet at fiscal-year end"/>
   <Metric label="Total Liabilities" value={compactUSD(latest.metrics.totalLiabilities)}
     detail="USD · balance sheet at fiscal-year end"/>
   <Metric label="Cash & Equivalents" value={compactUSD(latest.metrics.cash)}
     detail="USD · latest annual statement cash tag"/>
  </div>
  <div className="overflow-x-auto rounded-xl border border-white/10">
   <table className="w-full min-w-[630px] text-left text-xs">
    <thead className="bg-[#1c2a40] text-slate-300">
     <tr><th className="px-4 py-3">Fiscal year end</th>
      <th className="px-4 py-3 text-right">Revenue</th>
      <th className="px-4 py-3 text-right">Net income</th>
      <th className="px-4 py-3 text-right">Operating cash flow</th>
      <th className="px-4 py-3 text-right">Capital spending</th>
     </tr>
    </thead>
    <tbody className="divide-y divide-white/10">
     {data.fiscalYears.map(row=><tr key={row.fiscalYearEnd}>
      <td className="whitespace-nowrap px-4 py-3 font-semibold">{row.fiscalYearEnd}</td>
      <td className="px-4 py-3 text-right tabular-nums">{compactUSD(row.metrics.revenue)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{compactUSD(row.metrics.netIncome)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{compactUSD(row.metrics.operatingCashFlow)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{compactUSD(row.metrics.capitalExpenditure)}</td>
     </tr>)}
    </tbody>
   </table>
  </div>
  <p className="text-xs leading-6 text-slate-500">
   Values shown in USD, abbreviated (B=billion, T=trillion). Fiscal-year 10-K US-GAAP data only,
   not latest quarter, real-time fundamentals, forward estimates or valuation.
   Year-end calendar dates may differ from the company&apos;s fiscal-year labels.
   Some figures may be unavailable or restated. Source: SEC EDGAR.
  </p>
 </div>;
}
export default function FundamentalAnalysis({symbol,price,priceAsOf}:{symbol:string;price:number|null;priceAsOf:string}){
 const [result,setResult]=useState<FundamentalsApiResponse|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  void (async()=>{
   try{
    const response=await fetch("/api/research/fundamentals?symbol="+encodeURIComponent(symbol),
      {cache:"no-store",signal:controller.signal});
    const data=await response.json() as FundamentalsApiResponse;
    if(!controller.signal.aborted)setResult(data);
   }catch{
    if(!controller.signal.aborted)setResult({status:"error",
     message:"SEC annual financials could not be loaded from the local server."});
   }
  })();
  return ()=>controller.abort();
 },[symbol]);
 return <><section className="surface-panel rounded-2xl p-5 sm:p-7">
  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="text-lg font-semibold">Company Fundamentals</h2>
    <p className="mt-1 text-xs text-slate-400">Financial statements · 10-K annual · SEC EDGAR</p></div>
   <span className="surface-pill rounded-full px-3 py-1.5 text-[11px] font-semibold">ACTUAL FILINGS · NOT FORECAST</span>
  </div>
  {!result&&<p role="status" className="text-sm text-slate-400">Checking official SEC financial reports…</p>}
  {result?.status==="ok"&&<AnnualFundamentals data={result.data}/>}
  {result&&result.status!=="ok"&&<div role="status" className="rounded-xl border border-white/10 p-5">
   <p className="text-sm font-semibold">{result.status==="not_configured"?"SEC data setup required":
     result.status==="not_available"?"No compatible annual SEC financials":"Financial statements unavailable"}</p>
   <p className="mt-2 text-xs leading-6 text-slate-400">{result.message}</p>
   {result.status==="not_configured"&&<p className="mt-3 text-xs leading-6 text-slate-500">
    This is a public-data contact identifier, not an API key. Add it only to your ignored local .env.local.
    The rest of Research and your Portfolio will continue working without this optional integration.
   </p>}
  </div>}
 </section>
 {result?.status==="ok"&&<ValuationAnalysis data={result.data} price={price} priceAsOf={priceAsOf}/>}
 </>;
}
