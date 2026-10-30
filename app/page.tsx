"use client";

import { useState } from "react";
import PortfolioDashboard from "./components/portfolio-dashboard";
import { SiteHeader, Sidebar, ResearchSidebar, MobileNavigation } from "./components/layout/navigation";
import ResearchWorkspace from "./components/research-workspace";
import DailyBrief from "./components/brief/daily-brief";
import SettingsPanel from "./components/settings/settings-panel";
import { usePreferences } from "../hooks/use-preferences";
import { stories } from "../lib/demo/market";
import { portfolioLinks } from "../lib/navigation";
import type { Page, PortfolioSection, ResearchSection, Workspace } from "../types/app";

/** Thin UI composition layer; actual features live in their own modules. */
export default function Home() {
  const [page,setPage] = useState<Page>("holdings");
  const [workspace,setWorkspace] = useState<Workspace>("portfolio");
  const [researchPage,setResearchPage] = useState<ResearchSection>("search");
  const prefs = usePreferences();
  const {watchlist,minimumScore,briefTone,briefTicker,notifications,delivery,currency,theme,t} = prefs;
  const related=stories.filter(s=>watchlist.includes(s.ticker)).sort((a,b)=>b.score-a.score);
  const important=related.filter(s=>s.score>=minimumScore);
  const briefItems=important.filter(s=>(briefTone==="All"||s.tone===briefTone)&&(briefTicker==="All"||s.ticker===briefTicker));
  const notificationCount=!notifications||delivery==="digest"?0:related.filter(s=>s.score>=(delivery==="major"?Math.max(80,minimumScore):minimumScore)).length;
  const go=(next:Page)=>{setWorkspace("portfolio");setPage(next);window.scrollTo({top:0,behavior:"smooth"});};
  const goResearch=(next:ResearchSection)=>{setWorkspace("research");setResearchPage(next);window.scrollTo({top:0,behavior:"smooth"});};
  const chooseWorkspace=(next:Workspace)=>{setWorkspace(next);window.scrollTo({top:0,behavior:"smooth"});};

  return <div data-theme={theme} className="see-shell min-h-screen bg-[#0b1424] text-slate-100">
    <SiteHeader go={go} workspace={workspace} onWorkspaceChange={chooseWorkspace}/>
    <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[1600px]">
      {workspace==="portfolio"
        ? <Sidebar page={page} go={go} t={t}/>
        : <ResearchSidebar page={researchPage} go={goResearch} t={t}/>}
      <main className="min-w-0 flex-1 px-5 pb-16 pt-7 sm:px-7 lg:px-7">
        <MobileNavigation page={page} go={go} t={t} workspace={workspace} researchPage={researchPage} goResearch={goResearch}/>
        {workspace==="portfolio"&&page!=="holdings"&&page!=="analysis"&&<div className="mb-7 rounded-xl border border-slate-500/30 bg-[#1c2a40] surface-panel px-4 py-3 text-xs leading-5 text-slate-300"><strong className="text-[#a4f1df]">{t("Prototype preview.","原型预览。")}</strong> {t("Market figures and news are fictional placeholders. No live data, AI scores, or push notifications are connected yet.","行情与新闻目前为虚构演示数据。尚未连接实时数据、AI 评分或实际消息推送。")}</div>}
        {workspace==="portfolio"&&portfolioLinks.some(link=>link.id===page)&&<PortfolioDashboard section={page as PortfolioSection} currency={currency} onSettings={()=>go("settings")}/>}
        {workspace==="portfolio"&&page==="brief"&&<DailyBrief prefs={prefs} go={go} briefItems={briefItems} relatedCount={related.length}/>}
        {workspace==="portfolio"&&page==="settings"&&<SettingsPanel prefs={prefs} go={go} notificationCount={notificationCount}/>}
        {workspace==="research"&&<ResearchWorkspace section={researchPage} t={t} navigate={goResearch}/>}
        <footer className="mt-12 border-t border-white/10 pt-6 text-xs leading-6 text-slate-500">SEE Portfolio · {t("Paper trading is simulated. Other research modules remain prototypes; not investment advice.","模拟盘交易不涉及真实资金。其他研究模块仍为原型；不构成投资建议。")}</footer>
      </main>
    </div>
  </div>;
}
