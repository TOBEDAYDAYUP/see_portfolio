"use client";

import type { Currency, PortfolioSection } from "../../types/app";
import { labels } from "../../lib/demo/portfolio";
import Soon from "./portfolio/section-placeholder";
import AlpacaPortfolio from "./portfolio/alpaca-portfolio";

export type { PortfolioSection } from "../../types/app";

/** Portfolio entry point: read-only Alpaca Paper holdings, research sections upcoming. */
export default function PortfolioDashboard({section,currency="USD",onSettings}:{
  section:PortfolioSection;
  currency?:Currency;
  onSettings:()=>void;
}) {
  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#87e5d1]">PORTFOLIO WORKSPACE</p>
        <h1 className="text-3xl font-semibold sm:text-[38px]">My Portfolio</h1>
        {section!=="holdings"&&<p className="mt-2 text-sm text-slate-400">{labels[section]}</p>}
      </div>
      <span className="surface-pill rounded-full px-3 py-2 text-xs">{section==="holdings"?"ALPACA · PAPER": "RESEARCH · PREVIEW"}</span>
    </div>
    {section==="holdings"?<AlpacaPortfolio currency={currency} onSettings={onSettings}/>:<Soon section={section}/>}
  </div>;
}
