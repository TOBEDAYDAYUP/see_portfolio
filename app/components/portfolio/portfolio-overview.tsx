"use client";

import {useEffect,useState} from "react";
import type { PaperAccountSummary, PortfolioHistoryPoint, PaperHistoryResponse } from "../../../lib/alpaca/types";
import {portfolioHistoryRanges,portfolioHistoryResolution,type PortfolioHistoryRange} from "../../../lib/alpaca/history-range";
import PaperEquityChart from "./paper-equity-chart";

type Props={
  account:PaperAccountSummary;
  history:PortfolioHistoryPoint[];
  historyAvailable:boolean;
  positionCount:number;
  fetchedAt:string;
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
export default function PortfolioOverview({account,history,historyAvailable,positionCount,fetchedAt}:Props) {
  const [range,setRange]=useState<PortfolioHistoryRange>("1M");
  const [retryVersion,setRetryVersion]=useState(0);
  const [remote,setRemote]=useState<{
    range:PortfolioHistoryRange;token:string;points:PortfolioHistoryPoint[];resolution:string;
  }|null>(null);
  const [remoteError,setRemoteError]=useState<{
    range:PortfolioHistoryRange;token:string;message:string;
  }|null>(null);
  useEffect(()=>{
    if(range==="1M")return;
    const controller=new AbortController();
    void (async()=>{
      try{
        const response=await fetch("/api/alpaca/portfolio/history?range="+encodeURIComponent(range),{
          cache:"no-store",signal:controller.signal,
        });
        // A development-server 404/500 may be HTML, not JSON. Distinguish
        // that failure from Alpaca returning no account history.
        const textBody=await response.text();
        let data:PaperHistoryResponse;
        try{
          data=JSON.parse(textBody) as PaperHistoryResponse;
        }catch{
          throw new Error(response.status===404
            ?"History API route not found (HTTP 404). Restart npm run dev after pulling the latest code."
            :"History API returned an invalid response (HTTP "+response.status+"). Check the local Next.js server console.");
        }
        if(controller.signal.aborted)return;
        if(response.ok&&data.status==="ok"&&data.range===range){
          setRemote({range,token:fetchedAt,points:data.points,resolution:data.resolution});
          setRemoteError(null);
        }else{
          setRemote(null);
          setRemoteError({range,token:fetchedAt,message:
            data.status==="error"||data.status==="not_configured"?data.message:"Account history unavailable."});
        }
      }catch(error){
        if(!controller.signal.aborted){
          const message=error instanceof Error
            ?(error instanceof TypeError
              ?"Could not reach the history API. Check that npm run dev is running."
              :error.message)
            :"The history API request failed.";
          setRemote(null);
          setRemoteError({range,token:fetchedAt,message});
        }
      }
    })();
    return ()=>controller.abort();
  },[range,fetchedAt,retryVersion]);
  const retryHistory=()=>{
    setRemote(null);
    setRemoteError(null);
    setRetryVersion(value=>value+1);
  };
  const selectRange=(next:PortfolioHistoryRange)=>{
    if(next===range)return;
    setRange(next);
    setRemote(null);
    setRemoteError(null);
  };
  const validRemote=remote!==null&&remote.range===range&&remote.token===fetchedAt;
  const validError=remoteError!==null&&remoteError.range===range&&remoteError.token===fetchedAt;
  const displayedPoints=range==="1M"?history:(validRemote?remote.points:[]);
  const loaded=range==="1M"||validRemote;
  const errorMessage=range==="1M"
    ?(historyAvailable?null:"Alpaca equity history is temporarily unavailable.")
    :(validError?remoteError.message:null);
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
          <p className="mt-1 text-xs text-slate-500">Actual Alpaca Paper account equity · select a time range</p>
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
        <div role="group" aria-label="Portfolio equity history time range" className="flex flex-wrap items-center gap-1">
          {portfolioHistoryRanges.map(item=><button key={item} type="button"
            aria-pressed={range===item} onClick={()=>selectRange(item)}
            className={"rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 "+
              (range===item?"bg-[#83e3cd] text-[#102139]":"text-slate-400 hover:bg-white/10 hover:text-slate-100")}>
            {item}
          </button>)}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500" aria-live="polite">{range} · {validRemote?remote.resolution:portfolioHistoryResolution[range]} · Alpaca Paper</p>
      {errorMessage
        ? <div role="status" className="grid min-h-[245px] place-items-center content-center gap-3 px-4 text-center text-sm text-amber-200">
            <p>{errorMessage}</p>
            {range!=="1M"&&<button type="button" onClick={retryHistory}
              className="rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-semibold hover:bg-amber-400/10">Retry history</button>}
          </div>
        : !loaded
          ? <div role="status" className="grid min-h-[245px] place-items-center text-center text-sm text-slate-400">Loading {range} Alpaca account history…</div>
          : <PaperEquityChart key={range+"-"+fetchedAt} points={displayedPoints} range={range}/>} 
      <p className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-5 text-slate-500">
        Changes in account equity may include deposits and withdrawals; they are not a time-weighted investment return. No fictional performance data is shown.
      </p>
    </section>
    <section className="flex min-h-[385px] flex-col rounded-2xl border border-white/10 bg-[#172338] surface-panel  p-5 sm:p-6"><h2 className="font-semibold">Portfolio health analysis</h2><p className="mt-1 text-xs text-slate-500">Reserved visualization</p><div className="relative mx-auto my-auto w-full max-w-[210px]"><svg viewBox="0 0 240 240" className="w-full" role="img" aria-label="Empty five-axis chart placeholder"><g transform="translate(120 120)" fill="none" stroke="#455b70">{[35,58,80].map(r=><polygon key={r} points={Array.from({length:5},(_,i)=>{const a=(-90+i*72)*Math.PI/180;return (Math.cos(a)*r).toFixed(1)+","+(Math.sin(a)*r).toFixed(1)}).join(" ")}/>)}{Array.from({length:5},(_,i)=>{const a=(-90+i*72)*Math.PI/180;return <line key={i} x1="0" y1="0" x2={Math.cos(a)*80} y2={Math.sin(a)*80}/>})}</g></svg><div className="absolute inset-0 flex items-center justify-center"><span className="rounded-xl border border-[#4b7970] bg-[#1d3c44] px-4 py-2 text-center text-xs font-semibold text-emerald-100">UNDER DEVELOPMENT</span></div></div><p className="text-sm leading-6 text-slate-400">A simple fundamentals and risk visualization will go here. No scoring model is active.</p></section>
  </div>;
}
