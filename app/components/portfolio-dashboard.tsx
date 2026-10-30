"use client";

import { useState } from "react";
import type { Currency, PortfolioSection } from "../../types/app";
import { labels } from "../../lib/demo/portfolio";
import Soon from "./portfolio/section-placeholder";
import PortfolioOverview from "./portfolio/portfolio-overview";
import PortfolioMetrics from "./portfolio/portfolio-metrics";
import HoldingsPanel from "./portfolio/holdings-panel";

export type { PortfolioSection } from "../../types/app";

/** Coordinates portfolio screens without owning individual card implementation. */
export default function PortfolioDashboard({section,currency="USD"}:{section:PortfolioSection;currency?:Currency}) {
 const [notice,setNotice]=useState("");
 return <div>
  <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#87e5d1]">PORTFOLIO WORKSPACE</p><h1 className="text-3xl font-semibold sm:text-[38px]">My Portfolio</h1>{section !== "holdings" && <p className="mt-2 text-sm text-slate-400">{labels[section]}</p>}</div><span className="rounded-full border border-white/10 bg-[#253449] surface-pill px-3 py-2 text-xs text-slate-300">{currency==="CNY"?"Sample FX: 1 USD = 7.20 CNY":"Simulated data only"}</span></div>
  {section!=="holdings"?<Soon section={section}/>:<>
   <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Holdings overview</h2><p className="mt-1 text-xs text-slate-500">Your investments, simply organized</p></div><div className="flex gap-2"><button onClick={()=>setNotice("Transaction entry is under development.")} className="rounded-xl bg-[#83e3cd] px-4 py-2.5 text-xs font-bold text-[#122239]">＋ Add transaction</button><button onClick={()=>setNotice("Holdings editing is under development.")} className="rounded-xl border border-white/10 bg-[#28384d] px-3 py-2.5 text-xs text-slate-200">Edit holdings</button></div></div>
   {notice&&<div role="status" className="mb-4 flex justify-between rounded-xl bg-[#1e423f] px-4 py-3 text-sm text-emerald-100"><span>{notice}</span><button aria-label="Dismiss notice" onClick={()=>setNotice("")}>×</button></div>}
   <PortfolioOverview currency={currency}/>
   <PortfolioMetrics currency={currency}/>
   <HoldingsPanel currency={currency}/>
  </>}
 </div>;
}
