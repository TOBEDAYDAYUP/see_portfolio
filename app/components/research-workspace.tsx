import type { ResearchSection, Translator } from "../../types/app";

/**
 * Research workspace shell only.
 * Search, report data and a separate saved watchlist will be implemented next;
 * no demo tickers are presented as verified research results.
 */
const sections: Record<ResearchSection,{
  title:string; chinese:string; description:string; detail:string;
}> = {
  search: {
    title:"Stock Search", chinese:"股票搜索",
    description:"Explore publicly traded companies without adding them to your holdings.",
    detail:"Ticker and company-name lookup will be the next connected feature. Search results will be verified against a market-data source.",
  },
  watchlist: {
    title:"My Watchlist", chinese:"我的关注",
    description:"Follow companies you're researching, even if you don't own any shares.",
    detail:"Saved research tickers will remain separate from Alpaca Paper positions and will not affect your portfolio P/L or dividend estimates.",
  },
  reports: {
    title:"Stock Reports", chinese:"个股报告",
    description:"Read a focused report on each company you choose to research.",
    detail:"Upcoming sections include valuation, historical risk, expected dividends, growth scenarios and cited market news.",
  },
  news: {
    title:"News & Updates", chinese:"新闻动态",
    description:"See relevant news about the companies in your research watchlist.",
    detail:"News retrieval, source attribution, AI summaries and delivery preferences will be added in later research milestones.",
  },
};

export default function ResearchWorkspace({section,t}:{section:ResearchSection;t:Translator}){
  const current=sections[section];
  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#87e5d1]">RESEARCH WORKSPACE</p>
        <h1 className="text-3xl font-semibold sm:text-[38px]">{t("Research","研究")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("Analyze companies before you invest.","投资前，先研究公司。")}</p>
      </div>
      <span className="surface-pill rounded-full px-3 py-2 text-xs">{t("FOUNDATION · PREVIEW","基础架构 · 预览")}</span>
    </div>
    <section className="surface-panel rounded-2xl p-6 sm:p-8">
      <p className="mb-5 text-[11px] font-semibold tracking-[.16em] text-[#87e5d1]">{t("COMING NEXT","即将开发")}</p>
      <h2 className="text-2xl font-semibold">{t(current.title,current.chinese)}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{current.description}</p>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{current.detail}</p>
    </section>
    <p className="mt-5 text-xs leading-6 text-slate-500">
      {t("Research lists and reports will not alter Alpaca holdings, actual account returns, or portfolio dividends.",
      "研究列表与报告不会修改 Alpaca 持仓、真实账户收益或组合分红。")}
    </p>
  </div>;
}
