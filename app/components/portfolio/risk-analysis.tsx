"use client";

import { useEffect, useState } from "react";
import type { RiskApiResult } from "../../../lib/alpaca/risk-types";
import type { RiskMetrics } from "../../../lib/analytics/risk";
import TailRiskSection from "./tail-risk";

type View = RiskApiResult | null;
const pct=(value:number)=>value.toFixed(2)+"%";
const money=(value:number)=>new Intl.NumberFormat("en-US",{
  style:"currency", currency:"USD", maximumFractionDigits:2,
}).format(value);

async function loadRisk(signal?:AbortSignal):Promise<RiskApiResult>{
  try{
    const response=await fetch("/api/alpaca/risk",{cache:"no-store",signal});
    const data:unknown=await response.json();
    if(data && typeof data==="object" && "status" in data &&
      ["empty","connected","not_configured","unsupported","error"].includes(String(data.status))){
      return data as RiskApiResult;
    }
  }catch{
    // Failed connection, stale dev server or temporarily unresponsive API.
  }
  return {status:"error",message:"Unable to load risk analytics from the local Alpaca API."};
}
function InfoCard({title,value,caption}:{title:string;value:string;caption:string}){
  return <div className="surface-panel flex min-h-[130px] flex-col rounded-2xl p-5">
    <p className="text-xs font-medium text-slate-400">{title}</p>
    <strong className="mt-2 block text-2xl font-semibold tabular-nums">{value}</strong>
    <p className="mt-auto pt-2 text-xs leading-5 text-slate-500">{caption}</p>
  </div>;
}
function DrawdownChart({path}:{path:RiskMetrics["path"]}){
  if(path.length<2)return null;
  const w=760,h=180,l=59,r=16,t=14,b=31;
  const lower=Math.min(-0.1,...path.map(p=>p.drawdownPct));
  const point=path.map((p,i)=>{
    const x=l+i/(path.length-1)*(w-l-r);
    const y=t+(0-p.drawdownPct)/(0-lower)*(h-t-b);
    return x.toFixed(1)+","+y.toFixed(1);
  }).join(" ");
  return <svg viewBox={"0 0 "+w+" "+h} role="img" aria-label="Hypothetical portfolio historical drawdown over aligned daily closes" className="w-full">
    <line x1={l} y1={t} x2={w-r} y2={t} stroke="#70879c" strokeDasharray="3 5" opacity=".5"/>
    <line x1={l} y1={h-b} x2={w-r} y2={h-b} stroke="#70879c" strokeDasharray="3 5" opacity=".5"/>
    <text x={l-10} y={t+4} fill="#8da5b5" textAnchor="end" fontSize="11">0%</text>
    <text x={l-10} y={h-b+4} fill="#8da5b5" textAnchor="end" fontSize="11">{pct(lower)}</text>
    <polyline fill="none" stroke="#e4a362" strokeWidth="2.5" strokeLinejoin="round" points={point}/>
    <text x={l} y={h-7} fill="#8da5b5" fontSize="11">{path[0].date}</text>
    <text x={w-r} y={h-7} fill="#8da5b5" fontSize="11" textAnchor="end">{path[path.length-1].date}</text>
  </svg>;
}
function ConnectedAnalysis({data}:{data:Extract<RiskApiResult,{status:"connected"}>}){
  const m=data.metrics;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><span className="surface-pill rounded-full px-3 py-1.5 text-xs font-semibold">● Alpaca Paper · risk snapshot</span>
      <p className="mt-2 text-xs text-slate-500">Long US equities · positions as of {new Date(data.fetchedAt).toLocaleString("en-CA")}</p></div>
      <span className="text-xs text-slate-400">Market history: IEX · USD</span>
    </div>
    {data.dataWarning&&<p className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm leading-6 text-amber-200" role="status">{data.dataWarning}</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <InfoCard title="Largest position" value={pct(m.topPositionPct)} caption="Share of invested equity value"/>
      <InfoCard title="Effective positions" value={m.effectivePositions.toFixed(2)} caption={"HHI "+m.hhi.toFixed(3)+" · concentration-adjusted count"}/>
      <InfoCard title="Annualized volatility" value={m.annualizedVolatilityPct===null?"—":pct(m.annualizedVolatilityPct)} caption="Daily hypothetical portfolio returns · × √252"/>
      <InfoCard title="Maximum drawdown" value={m.maxDrawdownPct===null?"—":pct(m.maxDrawdownPct)} caption="Worst historical peak-to-trough loss in model"/>
    </div>
    <TailRiskSection metrics={m}/>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,1fr)]">
      <section className="surface-panel rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Portfolio allocation</h2>
        <p className="mt-1 text-xs text-slate-400">Current weights among invested equity holdings · excludes cash</p>
        <div className="mt-6 space-y-5">
          {m.allocations.map((stock)=><div key={stock.symbol}>
            <div className="mb-2 flex justify-between gap-2 text-sm">
              <span className="font-semibold">{stock.symbol}</span>
              <span className="tabular-nums text-slate-300">{pct(stock.weightPct)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#273a50]" role="meter"
              aria-label={stock.symbol+" weight"} aria-valuemin={0} aria-valuemax={100}
              aria-valuenow={stock.weightPct}>
              <div className="h-full rounded-full bg-[#63cbbb]" style={{width:Math.min(100,stock.weightPct)+"%"}}/>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{money(stock.marketValue)} paper market value</p>
          </div>)}
        </div>
        <div className="mt-7 border-t border-white/10 pt-4 text-xs text-slate-400">
          Top 3 positions: <strong className="font-semibold text-slate-200">{pct(m.topThreePct)}</strong>
          <span className="mx-2">·</span>
          Invested value: <strong className="font-semibold text-slate-200">{money(m.investedValue)}</strong>
        </div>
      </section>
      <section className="surface-panel rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Drawdown analysis</h2>
        <p className="mt-1 text-xs text-slate-400">Historical simulation, NOT realized account performance</p>
        {m.historySufficient
          ? <><div className="mt-5"><DrawdownChart path={m.path}/></div>
              <p className="mt-4 text-xs leading-5 text-slate-400">{m.dailyReturnObservations} aligned daily returns · {m.firstDate} to {m.lastDate}</p></>
          : <div className="mt-8 grid min-h-[140px] place-items-center rounded-xl border border-dashed border-white/15 px-4 text-center text-sm text-slate-400">
              Historical drawdown unavailable until enough common closing prices are available.
            </div>}
        <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-slate-400">
          Model assumes a buy-and-hold basket initialized at today&apos;s invested stock weights.
          It does not reconstruct trades, historical holdings, funding flows or cash exposure.
        </div>
      </section>
    </div>
    <div className="rounded-xl border border-white/10 bg-[#172338] p-4 text-xs leading-6 text-slate-400">
      <strong className="text-slate-200">Methodology · v0.2</strong> — Uses split-adjusted IEX daily closing prices, aligned by common trading dates.
      Sample standard deviation of daily portfolio returns × √252; maximum drawdown from the normalized buy-and-hold index.
      IEX is one exchange, not the consolidated US market. Stock-only risk excludes cash, bonds, derivatives, shorts and FX.
      VaR95 uses the threshold of the worst 5% of modeled daily losses; ES95 averages those tail losses when at least 200 daily returns exist.
      Historical sample estimates are not backtested or guaranteed; actual losses can be higher.
    </div>
  </div>;
}
/** Live-only UI. An empty Alpaca portfolio never receives fabricated risk scores. */
export default function RiskAnalysis({onSettings}:{onSettings:()=>void}){
  const [data,setData]=useState<View>(null);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    void loadRisk(controller.signal).then(value=>{if(!controller.signal.aborted)setData(value);});
    return ()=>controller.abort();
  },[]);
  const reload=()=>{
    setLoading(true);
    void loadRisk().then(setData).finally(()=>setLoading(false));
  };
  return <div>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Portfolio Risk Analysis</h2>
        <p className="mt-1 text-sm text-slate-400">Exposure, concentration, historical VaR & ES · read-only</p></div>
      <button type="button" disabled={loading} onClick={reload}
        className="rounded-xl border border-white/15 bg-[#28384d] px-4 py-2.5 text-xs font-semibold text-slate-200">
        {loading?"Calculating…":"↻ Refresh analysis"}
      </button>
    </div>
    {!data&&<div className="surface-panel rounded-2xl p-7 text-sm text-slate-400" role="status">Loading paper risk analysis…</div>}
    {data?.status==="connected"&&<ConnectedAnalysis data={data}/>}
    {data?.status==="empty"&&<div className="surface-panel rounded-2xl px-7 py-12 text-center">
      <h3 className="text-xl font-semibold">No open paper positions</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
        Your Alpaca Paper portfolio currently has no holdings. Weight, concentration, volatility, VaR, ES and drawdown
        will be calculated when qualifying US stock positions are present. No substitute risk figures are displayed.
      </p>
      <span className="mt-5 inline-block rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400">Alpaca Paper · connected</span>
    </div>}
    {data?.status==="not_configured"&&<div className="surface-panel rounded-2xl p-7">
      <h3 className="text-lg font-semibold">Connect Alpaca Paper to analyze risk</h3>
      <p className="mt-2 text-sm text-slate-400">Add your credentials in the local .env.local file and restart the server.</p>
      <button onClick={onSettings} className="mt-4 rounded-xl bg-[#83e3cd] px-4 py-2 text-xs font-bold text-[#122239]">Connection settings</button>
    </div>}
    {(data?.status==="unsupported"||data?.status==="error")&&<div className="surface-panel rounded-2xl p-7">
      <h3 className="text-lg font-semibold">Risk analysis unavailable</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{data.status==="unsupported"?data.reason:data.message}</p>
      <p className="mt-2 text-xs text-slate-500">No partial or unverified risk scores will be shown as complete results.</p>
    </div>}
  </div>;
}
