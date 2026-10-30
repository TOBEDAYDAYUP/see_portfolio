"use client";

import { useState } from "react";
import type { Currency, PortfolioSection } from "../../types/app";
import { labels } from "../../lib/demo/portfolio";
import Soon from "./portfolio/section-placeholder";
import AlpacaPortfolio from "./portfolio/alpaca-portfolio";
import RiskAnalysis from "./portfolio/risk-analysis";

export type { PortfolioSection } from "../../types/app";

/** The original top chart/radar layout is now powered by Alpaca Paper data. */
export default function PortfolioDashboard({section,currency="USD",onSettings}:{
  section:PortfolioSection;
  currency?:Currency;
  onSettings:()=>void;
}) {
  const [notice,setNotice]=useState("");
  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#87e5d1]">PORTFOLIO WORKSPACE</p>
        <h1 className="text-3xl font-semibold sm:text-[38px]">My Portfolio</h1>
        {section!=="holdings"&&<p className="mt-2 text-sm text-slate-400">{section==="analysis"?"Risk analytics for your Alpaca Paper positions":labels[section]}</p>}
      </div>
      <span className="surface-pill rounded-full px-3 py-2 text-xs">{section==="holdings"||section==="analysis"?"ALPACA · PAPER":"RESEARCH · PREVIEW"}</span>
    </div>

    {section==="analysis" ? <RiskAnalysis onSettings={onSettings}/> : section!=="holdings" ? <Soon section={section}/> : <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Holdings overview</h2>
          <p className="mt-1 text-xs text-slate-400">Your Alpaca Paper account, simply organized</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={()=>setNotice("Transaction entry is under development.")} className="rounded-xl bg-[#83e3cd] px-4 py-2.5 text-xs font-bold text-[#122239]">＋ Add transaction</button>
          <button type="button" onClick={()=>setNotice("Holdings editing is under development.")} className="rounded-xl border border-white/10 bg-[#28384d] px-3 py-2.5 text-xs text-slate-200">Edit holdings</button>
        </div>
      </div>
      {notice&&<div role="status" className="mb-4 flex justify-between rounded-xl bg-[#1e423f] px-4 py-3 text-sm text-emerald-100"><span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={()=>setNotice("")}>×</button></div>}
      <AlpacaPortfolio currency={currency} onSettings={onSettings}/>
    </>}
  </div>;
}
