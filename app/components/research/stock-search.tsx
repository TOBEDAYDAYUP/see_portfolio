"use client";
import { useEffect, useState } from "react";
import type { ResearchAsset, ResearchResponse } from "../../../lib/research/types";

type Props={
  onOpen:(asset:ResearchAsset)=>void;
  onFollow:(asset:ResearchAsset)=>void;
  followedSymbols:Set<string>;
};
export default function StockSearch({onOpen,onFollow,followedSymbols}:Props){
  const [query,setQuery]=useState("");
  const [results,setResults]=useState<ResearchAsset[]>([]);
  const [status,setStatus]=useState<"idle"|"loading"|"ready"|"error">("idle");
  const [message,setMessage]=useState("");
  useEffect(()=>{
    const q=query.trim();
    if(!q){return;}
    const controller=new AbortController();
    const timer=window.setTimeout(()=>{
      void (async()=>{
        setStatus("loading");setMessage("");
        try{
          const res=await fetch("/api/research/search?q="+encodeURIComponent(q),{
            cache:"no-store",signal:controller.signal,
          });
          const payload=await res.json() as ResearchResponse<ResearchAsset[]>;
          if(controller.signal.aborted)return;
          if(payload.status==="ok"){
            setResults(Array.isArray(payload.data)?payload.data:[]);
            setStatus("ready");
          }else{
            setResults([]);setStatus("error");setMessage(payload.message);
          }
        }catch{
          if(!controller.signal.aborted){
            setResults([]);setStatus("error");setMessage("Could not reach Alpaca's stock directory.");
          }
        }
      })();
    },300);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[query]);
  return <section className="surface-panel rounded-2xl p-5 sm:p-7">
    <div>
      <h2 className="text-xl font-semibold">Stock Search</h2>
      <p className="mt-1 text-sm leading-6 text-slate-400">Search verified active US-listed equities and ETFs by ticker or company name.</p>
    </div>
    <label htmlFor="research-search" className="mt-6 block text-xs font-semibold text-slate-300">Ticker or company name</label>
    <div className="mt-2 flex gap-3">
      <input id="research-search" type="search" value={query} onChange={event=>{setQuery(event.target.value);setStatus("idle");setResults([]);}}
        autoComplete="off" placeholder="e.g. NVDA, Microsoft, Apple"
        className="surface-field min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm outline-none" maxLength={60}/>
    </div>
    <p className="mt-2 text-xs text-slate-500">Results are provided by Alpaca. Research does not place trades.</p>
    {query.trim().length===0&&<div className="mt-7 rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
      Enter a ticker or company name to explore a research report.
    </div>}
    {query.trim().length>0&&status==="loading"&&<p role="status" className="mt-6 text-sm text-slate-400">Searching Alpaca assets…</p>}
    {query.trim().length>0&&status==="error"&&<p role="alert" className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">{message}</p>}
    {query.trim().length>0&&status==="ready"&&results.length===0&&<p className="mt-6 text-sm text-slate-400">No active US equity matched that search.</p>}
    {results.length>0&&status==="ready"&&<div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
      {results.map(asset=><div key={asset.symbol} className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-100">{asset.symbol}</p>
          <p className="mt-0.5 text-sm text-slate-300">{asset.name}</p>
          <p className="mt-1 text-xs text-slate-500">{asset.exchange}{!asset.tradable?" · Data only":""}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={()=>onFollow(asset)} disabled={followedSymbols.has(asset.symbol)}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 disabled:cursor-default disabled:opacity-50">
            {followedSymbols.has(asset.symbol)?"Following":"+ Watchlist"}
          </button>
          <button type="button" onClick={()=>onOpen(asset)}
            className="rounded-xl bg-[#83e3cd] px-3 py-2 text-xs font-semibold text-[#102139]">View report</button>
        </div>
      </div>)}
    </div>}
  </section>;
}
