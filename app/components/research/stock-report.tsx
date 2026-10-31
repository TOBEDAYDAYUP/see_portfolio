"use client";
import { useEffect, useState } from "react";
import type { ResearchAsset, ResearchResponse, StockReport } from "../../../lib/research/types";
import ResearchNewsFeed from "./news-feed";
import AdvancedStockChart from "./advanced-stock-chart";
import FundamentalAnalysis from "./fundamental-analysis";
const money=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(v);
const pct=(v:number)=> (v>0?"+":"")+v.toFixed(2)+"%";
const riskPct=(v:number|null)=>v===null?"—":v.toFixed(2)+"%";

function RiskCard({label,value,description}:{label:string;value:string;description:string}){
  return <div className="rounded-xl border border-white/10 p-4">
    <p className="text-xs text-slate-400">{label}</p>
    <strong className="mt-2 block text-2xl font-semibold tabular-nums">{value}</strong>
    <p className="mt-2 text-[11px] leading-5 text-slate-500">{description}</p>
  </div>;
}
export default function StockReportView({symbol,asset:knownAsset,isFollowed,onFollow,onBack}:{
  symbol:string;asset:ResearchAsset|null;isFollowed:boolean;onFollow:(asset:ResearchAsset)=>void;onBack:()=>void;
}){
  const [payload,setPayload]=useState<ResearchResponse<StockReport>|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    void (async()=>{
      try{
        const res=await fetch("/api/research/report?symbol="+encodeURIComponent(symbol),{cache:"no-store",signal:controller.signal});
        const result=await res.json() as ResearchResponse<StockReport>;
        if(!controller.signal.aborted)setPayload(result);
      }catch{
        if(!controller.signal.aborted)setPayload({status:"error",message:"Could not load this company report."});
      }
    })();
    return ()=>controller.abort();
  },[symbol]);
  const report=payload?.status==="ok"?payload.data:null;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button onClick={onBack} className="text-xs font-semibold text-[#85dbc9] hover:underline">← Back to Research</button>
      <span className="text-xs text-slate-400">Company research · never counted as a holding</span>
    </div>
    <section className="surface-panel rounded-2xl p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-bold tracking-widest text-[#85dbc9]">STOCK REPORT</p>
          <h2 className="mt-2 text-3xl font-semibold">{report?.asset.symbol??symbol}</h2>
          <p className="mt-1 text-sm text-slate-300">{report?.asset.name??knownAsset?.name??"Loading verified company data…"}</p>
          {report&&<p className="mt-1 text-xs text-slate-500">{report.asset.exchange} · USD · price reference: historical Alpaca IEX</p>}
        </div>
        {report&&<button type="button" disabled={isFollowed} onClick={()=>onFollow(report.asset)}
          className="rounded-xl border border-[#85dbc9]/40 px-4 py-2 text-xs font-semibold text-[#9cebd6] disabled:opacity-60">
          {isFollowed?"✓ Following":"+ Add to Watchlist"}
        </button>}
      </div>
      {!payload&&<p role="status" className="mt-6 text-sm text-slate-400">Loading Alpaca market history and news…</p>}
      {payload&&payload.status!=="ok"&&<p role="alert" className="mt-6 rounded-xl border border-amber-400/20 p-4 text-sm text-amber-200">{payload.message}</p>}
      {report&&<div className="mt-6">
        <div className="flex flex-wrap items-baseline gap-4 border-t border-white/10 pt-5">
          <strong className="text-3xl font-semibold tabular-nums">{report.latestClose===null?"—":money(report.latestClose)}</strong>
          <span className={"text-sm font-semibold "+(report.changePct!==null&&report.changePct<0?"text-rose-300":"text-emerald-300")}>
            {report.changePct===null?"—":pct(report.changePct)} vs previous close
          </span>
          <span className="text-xs text-slate-500">Last completed IEX historical daily bar · {report.asOf} · not a live quote</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">The valuation and price above use the same IEX daily close; the interactive intraday chart may use delayed SIP consolidated bars and therefore show a different time or price. This is not a live consolidated quote.</p>
        <AdvancedStockChart symbol={report.asset.symbol}/>
      </div>}
    </section>
    {report&&<>
      {report.warnings.map(w=><p key={w} role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-200">{w}</p>)}
      <section className="surface-panel rounded-2xl p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Historical Risk Analysis</h2>
        <p className="mt-1 text-xs text-slate-400">Individual stock only · no assumed shares owned · historical model</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <RiskCard label="Annualized volatility" value={riskPct(report.risk?.annualizedVolatilityPct??null)}
            description="Sample standard deviation of daily returns × √252."/>
          <RiskCard label="Maximum drawdown" value={riskPct(report.risk?.maxDrawdownPct??null)}
            description="Worst peak-to-trough decline over available daily closes."/>
          <RiskCard label="1-Day Historical VaR 95%" value={riskPct(report.risk?.var95Pct??null)}
            description="Threshold of worst 5% of historical one-day modeled losses."/>
          <RiskCard label="1-Day Expected Shortfall 95%" value={riskPct(report.risk?.expectedShortfall95Pct??null)}
            description="Average loss among the worst 5% of modeled one-day outcomes."/>
        </div>
        <p className="mt-4 text-[11px] leading-5 text-slate-500">
          {report.risk?.observations??0} valid daily returns. VaR / ES require at least 200. These are in-sample,
          not forward-looking probability guarantees. No position value or portfolio P/L is assumed.
        </p>
      </section>
      <FundamentalAnalysis key={report.asset.symbol} symbol={report.asset.symbol} price={report.latestClose} priceAsOf={report.asOf} priceSource={report.priceSource}/>
      <details className="surface-panel rounded-2xl p-5">
        <summary className="cursor-pointer text-sm font-medium">Upcoming research models</summary>
        <p className="mt-2 text-xs leading-6 text-slate-400">
          12-month growth forecasts and verified dividend predictions are not yet available.
          We will not invent price targets, payouts or assumed holdings.
        </p>
      </details>
      <section className="surface-panel rounded-2xl p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Recent Company News</h2>
        <p className="mb-5 mt-1 text-xs text-slate-400">Alpaca-supplied article titles and summaries, not AI-generated analysis.</p>
        <ResearchNewsFeed articles={report.news}/>
      </section>
    </>}
  </div>;
}
