"use client";

import { useEffect, useMemo, useState } from "react";
import type { ResearchSection, Translator } from "../../types/app";
import type { ResearchArticle, ResearchAsset, ResearchResponse } from "../../lib/research/types";
import { MAX_RESEARCH_WATCHLIST } from "../../lib/research/types";
import { parseSavedResearchAssets } from "../../lib/research/storage";
import StockSearch from "./research/stock-search";
import StockReportView from "./research/stock-report";
import ResearchNewsFeed from "./research/news-feed";

const STORAGE_KEY="see-research-watchlist-v1";
type Props={section:ResearchSection;t:Translator;navigate:(next:ResearchSection)=>void};
export default function ResearchWorkspace({section,t,navigate}:Props){
  const [watchlist,setWatchlist]=useState<ResearchAsset[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [selected,setSelected]=useState<ResearchAsset|null>(null);
  const [alert,setAlert]=useState("");
  const [news,setNews]=useState<ResearchResponse<ResearchArticle[]>|null>(null);
  const symbols=useMemo(()=>new Set(watchlist.map(a=>a.symbol)),[watchlist]);
  const symbolsKey=watchlist.map(a=>a.symbol).join(",");

  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      try{
        const stored=localStorage.getItem(STORAGE_KEY);
        if(stored)setWatchlist(parseSavedResearchAssets(JSON.parse(stored) as unknown));
      }catch{/* Browser storage might be disabled. */}
      setLoaded(true);
    });
    return ()=>cancelAnimationFrame(frame);
  },[]);
  useEffect(()=>{
    if(!loaded)return;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(watchlist));}
    catch{/* The in-memory list remains usable. */}
  },[loaded,watchlist]);

  useEffect(()=>{
    if(section!=="news"||!loaded||!symbolsKey){return;}
    const controller=new AbortController();
    void (async()=>{
      try{
        const response=await fetch("/api/research/news?symbols="+encodeURIComponent(symbolsKey),{
          signal:controller.signal,cache:"no-store",
        });
        const data=await response.json() as ResearchResponse<ResearchArticle[]>;
        if(!controller.signal.aborted)setNews(data);
      }catch{
        if(!controller.signal.aborted)setNews({status:"error",message:"Research news could not be loaded."});
      }
    })();
    return ()=>controller.abort();
  },[section,loaded,symbolsKey]);

  const openReport=(asset:ResearchAsset)=>{
    setSelected(asset);navigate("reports");
  };
  const follow=(asset:ResearchAsset)=>{
    if(symbols.has(asset.symbol))return;
    if(watchlist.length>=MAX_RESEARCH_WATCHLIST){
      setAlert("You can follow up to "+MAX_RESEARCH_WATCHLIST+" stocks in this local version.");
      return;
    }
    setWatchlist(prev=>prev.some(a=>a.symbol===asset.symbol)?prev:[...prev,asset]);
    setAlert(asset.symbol+" added to your Research Watchlist (not your holdings).");
  };
  const remove=(symbol:string)=>{
    setWatchlist(prev=>prev.filter(a=>a.symbol!==symbol));
    setAlert(symbol+" removed from the research watchlist.");
  };

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#87e5d1]">RESEARCH WORKSPACE</p>
        <h1 className="text-3xl font-semibold sm:text-[38px]">{t("Research","研究")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("Research stocks before you invest.","投资前先研究股票。")}</p>
      </div>
      <span className="surface-pill rounded-full px-3 py-2 text-xs">{loaded?watchlist.length:0} / {MAX_RESEARCH_WATCHLIST} · Watchlist</span>
    </div>
    {alert&&<div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#35746c] bg-[#1a3b3a] p-3 text-xs text-emerald-100">
      {alert}<button type="button" onClick={()=>setAlert("")} aria-label="Dismiss" className="px-2">×</button>
    </div>}

    {section==="search"&&<StockSearch onOpen={openReport} onFollow={follow} followedSymbols={symbols}/>}
    {section==="watchlist"&&<section className="surface-panel rounded-2xl p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">My Watchlist</h2>
          <p className="mt-1 text-sm text-slate-400">Research-only list, saved in this browser. No simulated trades or portfolio returns.</p></div>
        <button type="button" onClick={()=>navigate("search")}
          className="rounded-xl bg-[#83e3cd] px-4 py-2.5 text-xs font-semibold text-[#102139]">+ Find stocks</button>
      </div>
      {!loaded&&<p className="mt-6 text-sm text-slate-400">Loading your saved stocks…</p>}
      {loaded&&!watchlist.length&&<div className="mt-7 rounded-xl border border-dashed border-white/15 p-9 text-center text-sm text-slate-400">
        No research stocks followed yet. Use Stock Search to add your first company.
      </div>}
      {watchlist.length>0&&<div className="mt-6 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
        {watchlist.map(asset=><div key={asset.symbol} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <strong className="text-sm">{asset.symbol}</strong>
            <p className="mt-1 text-sm text-slate-300">{asset.name}</p>
            <p className="mt-1 text-xs text-slate-500">{asset.exchange}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={()=>remove(asset.symbol)}
              className="rounded-xl border border-white/15 px-3 py-2 text-xs text-slate-300 hover:text-white">Remove</button>
            <button type="button" onClick={()=>openReport(asset)}
              className="rounded-xl bg-[#83e3cd] px-3 py-2 text-xs font-semibold text-[#102139]">Read report</button>
          </div>
        </div>)}
      </div>}
    </section>}
    {section==="reports"&&(selected
      ? <StockReportView key={selected.symbol} symbol={selected.symbol} asset={selected}
          isFollowed={symbols.has(selected.symbol)} onFollow={follow}
          onBack={()=>setSelected(null)}/>
      : <section className="surface-panel rounded-2xl p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Stock Reports</h2>
          <p className="mt-2 text-sm text-slate-400">Open any followed company or search for a new stock to view price history, historical risk and recent articles.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {watchlist.map(asset=><button type="button" key={asset.symbol} onClick={()=>openReport(asset)}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 hover:border-[#85dbc9]">
              {asset.symbol} <span className="ml-1 text-slate-500">↗</span>
            </button>)}
          </div>
          <button type="button" onClick={()=>navigate("search")}
            className="mt-5 rounded-xl bg-[#83e3cd] px-4 py-2.5 text-xs font-semibold text-[#102139]">Search for a company</button>
        </section>)}
    {section==="news"&&<section className="surface-panel rounded-2xl p-5 sm:p-7">
      <h2 className="text-xl font-semibold">News &amp; Updates</h2>
      <p className="mt-1 text-sm text-slate-400">Verified Alpaca news for companies in your independent research watchlist.</p>
      {!loaded&&<p className="mt-6 text-sm text-slate-400">Loading saved research interests…</p>}
      {loaded&&!watchlist.length&&<div className="mt-6 rounded-xl border border-dashed border-white/15 p-7 text-sm text-slate-400">
        Add a stock to My Watchlist to see recent company news here.
        <button type="button" className="ml-3 text-[#9cebd6] underline" onClick={()=>navigate("search")}>Find stocks</button>
      </div>}
      {loaded&&watchlist.length>0&&<>
        <p className="mb-5 mt-4 text-xs text-slate-500">Tracking: {symbolsKey} · Source: Alpaca News · Last 30 days</p>
        {!news&&<p role="status" className="text-sm text-slate-400">Loading news…</p>}
        {news?.status==="ok"&&<ResearchNewsFeed articles={news.data}/>}
        {news&&news.status!=="ok"&&<p role="alert" className="rounded-xl border border-amber-400/20 p-4 text-sm text-amber-200">{news.message}</p>}
      </>}
      <p className="mt-5 text-[11px] leading-5 text-slate-500">These are sourced article headlines and supplier summaries, not AI-generated sentiment analysis or push notifications.</p>
    </section>}
    <p className="mt-6 text-xs leading-6 text-slate-500">
      Research is separate from Alpaca Paper positions. Followed tickers never enter Holdings, Portfolio VaR, P/L or dividend estimates.
      No trades are placed. Research currently works only in local development until user authentication is available.
    </p>
  </div>;
}
