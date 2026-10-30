"use client";

import type { PaperAccountSummary, PortfolioHistoryPoint } from "../../../lib/alpaca/types";
import PaperEquityChart from "./paper-equity-chart";

type Props={
  account:PaperAccountSummary;
  history:PortfolioHistoryPoint[];
  historyAvailable:boolean;
  positionCount:number;
};
const usd=(v:number|null|undefined)=> v===null||v===undefined ? "—" :
  new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(v);
const signedUsd=(v:number|null)=>{
  if(v===null)return "—";
  return (v>0?"+":"")+usd(v);
};
const signedPct=(v:number|null)=>{
  if(v===null)return "—";
  return (v>0?"+":"")+v.toFixed(2)+"%";
};

/** Original two-column chart/radar layout, now driven by REAL Alpaca paper equity data. */
export default function PortfolioOverview({account,history,historyAvailable,positionCount}:Props) {
  const previous=account.lastEquity;
  const changeToday=account.equity!==null&&previous!==null?account.equity-previous:null;
  const dailyPct=changeToday!==null&&previous!==null&&previous!==0?100*changeToday/previous:null;
  const first=history.length>1?history[0].equity:null;
  const last=history.length>1?history[history.length-1].equity:null;
  const historyChange=first!==null&&last!==null?last-first:null;
  const monthPct=historyChange!==null&&first!==null&&first!==0?100*historyChange/first:null;
  const stats=[
    {name:"Account equity",value:usd(account.equity),detail:"Paper account · USD"},
    {name:"Today's equity change",value:signedUsd(changeToday),detail:signedPct(dailyPct)},
    {name:"1M equity change",value:signedUsd(historyChange),detail:signedPct(monthPct)+" · includes cash flows"},
    {name:"Open positions",value:String(positionCount),detail:"Alpaca Paper"},
  ];
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,2.15fr)_minmax(235px,0.85fr)]">
    <section className="min-w-0 rounded-2xl border border-white/10 bg-[#172338] surface-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Portfolio value over time</h2>
          <p className="mt-1 text-xs text-slate-500">Actual Alpaca Paper account equity · last month</p>
        </div>
        <span className="rounded-full bg-emerald-300/10 surface-pill px-3 py-1 text-[11px] font-semibold text-emerald-200">ALPACA · PAPER</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-b border-white/10 pb-3 sm:grid-cols-4">
        {stats.map(stat=><div key={stat.name}>
          <p className="text-[11px] leading-4 text-slate-500">{stat.name}</p>
          <strong className="mt-0.5 block text-base font-semibold tabular-nums sm:text-[17px]">{stat.value}</strong>
          <small className="block text-[11px] leading-4 text-slate-400">{stat.detail}</small>
        </div>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">● Portfolio equity (USD)</span>
        <span className="rounded-md bg-[#34485d] px-2 py-1.5 text-xs text-slate-200">1M · Daily snapshots</span>
      </div>
      {historyAvailable
        ? <PaperEquityChart points={history}/>
        : <div className="grid min-h-[245px] place-items-center text-center text-sm text-slate-400">Alpaca equity history is temporarily unavailable.</div>}
      <p className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-5 text-slate-500">
        Changes in account equity may include deposits and withdrawals; they are not a time-weighted investment return. No fictional performance data is shown.
      </p>
    </section>
    <section className="flex min-h-[385px] flex-col rounded-2xl border border-white/10 bg-[#172338] surface-panel  p-5 sm:p-6"><h2 className="font-semibold">Portfolio health analysis</h2><p className="mt-1 text-xs text-slate-500">Reserved visualization</p><div className="relative mx-auto my-auto w-full max-w-[210px]"><svg viewBox="0 0 240 240" className="w-full" role="img" aria-label="Empty five-axis chart placeholder"><g transform="translate(120 120)" fill="none" stroke="#455b70">{[35,58,80].map(r=><polygon key={r} points={Array.from({length:5},(_,i)=>{const a=(-90+i*72)*Math.PI/180;return (Math.cos(a)*r).toFixed(1)+","+(Math.sin(a)*r).toFixed(1)}).join(" ")}/>)}{Array.from({length:5},(_,i)=>{const a=(-90+i*72)*Math.PI/180;return <line key={i} x1="0" y1="0" x2={Math.cos(a)*80} y2={Math.sin(a)*80}/>})}</g></svg><div className="absolute inset-0 flex items-center justify-center"><span className="rounded-xl border border-[#4b7970] bg-[#1d3c44] px-4 py-2 text-center text-xs font-semibold text-emerald-100">UNDER DEVELOPMENT</span></div></div><p className="text-sm leading-6 text-slate-400">A simple fundamentals and risk visualization will go here. No scoring model is active.</p></section>
  </div>;
}
