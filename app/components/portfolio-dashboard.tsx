"use client";

import { useState } from "react";
import type { Currency, PortfolioSection } from "../../types/app";
import { labels } from "../../lib/demo/portfolio";
import Soon from "./portfolio/section-placeholder";
import PortfolioOverview from "./portfolio/portfolio-overview";
import PortfolioMetrics from "./portfolio/portfolio-metrics";
import HoldingsPanel from "./portfolio/holdings-panel";
import AlpacaPortfolio from "./portfolio/alpaca-portfolio";

export type { PortfolioSection } from "../../types/app";

/** Preserve the existing overview and its demo research components while adding Alpaca below. */
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
        {section!=="holdings"&&<p className="mt-2 text-sm text-slate-400">{labels[section]}</p>}
      </div>
      <span className="surface-pill rounded-full px-3 py-2 text-xs">{section==="holdings"?"ALPACA PAPER + DEMO":"RESEARCH · PREVIEW"}</span>
    </div>

    {section!=="holdings" ? <Soon section={section}/> : <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Holdings overview</h2>
          <p className="mt-1 text-xs text-slate-400">Original visual prototype — retained while we develop live analytics.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={()=>setNotice("Transaction entry is under development.")} className="rounded-xl bg-[#83e3cd] px-4 py-2.5 text-xs font-bold text-[#122239]">＋ Add transaction</button>
          <button type="button" onClick={()=>setNotice("Holdings editing is under development.")} className="rounded-xl border border-white/10 bg-[#28384d] px-3 py-2.5 text-xs text-slate-200">Edit holdings</button>
        </div>
      </div>
      {notice&&<div role="status" className="mb-4 flex justify-between rounded-xl bg-[#1e423f] px-4 py-3 text-sm text-emerald-100"><span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={()=>setNotice("")}>×</button></div>}
      <div className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs leading-5 text-slate-300">
        <strong className="text-amber-200">DEMO VISUALIZATION</strong> · The stacked chart, displayed sample returns and radar placeholder below are illustrative only. Actual Alpaca Paper account balances, history and holdings appear in the separate section underneath.
      </div>

      {/* Keep the original side-by-side stacked chart and radar analysis placeholder. */}
      <PortfolioOverview currency={currency}/>

      <section className="mt-9" aria-label="Connected Alpaca Paper Trading data">
        <div className="mb-5 border-t border-white/10 pt-7">
          <p className="mb-2 text-[11px] font-semibold tracking-[.16em] text-[#87e5d1]">ALPACA PAPER TRADING</p>
          <h2 className="text-xl font-semibold">Your connected paper portfolio</h2>
          <p className="mt-2 text-sm text-slate-400">Current paper account equity, cash, positions and account-history snapshots — separate from the demo charts above.</p>
        </div>
        <AlpacaPortfolio currency={currency} onSettings={onSettings}/>
      </section>

      {/* Keep all previous metric cards and selected-stock interactions accessible.
          Their original sample data must never be mistaken for Alpaca positions. */}
      <details open className="mt-9 rounded-2xl border border-white/10 bg-[#172338] surface-panel">
        <summary className="cursor-pointer px-5 py-5 text-sm font-semibold marker:text-[#83e3cd] sm:px-6">
          Original demo metrics &amp; interactive stock preview
          <span className="ml-2 text-xs font-normal text-slate-400">(fictional data · expand / collapse)</span>
        </summary>
        <div className="border-t border-white/10 px-4 pb-6 pt-3 sm:px-6">
          <p className="mb-4 text-xs leading-5 text-slate-400">Preserved from the previous interface for design testing. These are fictional figures and stocks, not your Alpaca holdings.</p>
          <PortfolioMetrics currency={currency}/>
          <HoldingsPanel currency={currency}/>
        </div>
      </details>
    </>}
  </div>;
}
