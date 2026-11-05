"use client";

import { portfolioLinks, researchLinks } from "../../../lib/navigation";
import type { Page, ResearchSection, SettingsSection, Translator, Workspace } from "../../../types/app";
import type {AssistantThread} from "../../../lib/assistant/chat-history";

type Go = (next: Page) => void;
type ResearchGo = (next: ResearchSection) => void;

/** Global workspaces belong beside the brand, on the SAME header row. */
export function SiteHeader({go,workspace,onWorkspaceChange}:{
  go:Go;
  workspace:Workspace;
  onWorkspaceChange:(next:Workspace)=>void;
}) {
  const navClass=(active:boolean)=>
    "workspace-nav-button relative whitespace-nowrap bg-transparent px-1 py-2 text-xs font-medium transition-colors sm:text-sm lg:text-base "+
    (active?"text-[#9cebd6]":"text-slate-400 hover:text-white");

  return <header className="normal-topbar sticky top-0 z-40 border-b border-white/10 bg-[#101b2d]/95">
    <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-2 overflow-x-auto px-2 sm:gap-6 sm:px-9">
      <div className="flex min-w-max flex-1 items-center gap-3 sm:gap-8">
        <button type="button" aria-label="SEE Portfolio home" onClick={()=>go("holdings")}
          className="group flex shrink-0 items-center gap-2 rounded-xl px-1 py-2 text-left transition-colors duration-150 hover:bg-[#303744] active:bg-[#394354] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83e3cd] sm:gap-3 sm:px-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7be2ca] text-lg font-black text-[#102139] transition group-hover:bg-[#a5f4e2] sm:h-10 sm:w-10 sm:text-xl">S.</span>
          <span className="flex flex-col">
            <span className="whitespace-nowrap text-[13px] font-bold tracking-tight text-white sm:text-base">SEE Portfolio</span>
            <span className="hidden text-[10px] tracking-[.12em] text-slate-500 sm:block">INVESTMENT INTELLIGENCE</span>
          </span>
        </button>

        <nav aria-label="Workspaces" className="flex shrink-0 items-center gap-3 sm:gap-6">
          <button type="button" className={navClass(workspace==="portfolio")}
            aria-current={workspace==="portfolio"?"page":undefined}
            onClick={()=>onWorkspaceChange("portfolio")}>Portfolio</button>
          <button type="button" className={navClass(workspace==="research")}
            aria-current={workspace==="research"?"page":undefined}
            onClick={()=>onWorkspaceChange("research")}>Research</button>
          <button type="button" className={navClass(workspace==="assistant")}
            aria-current={workspace==="assistant"?"page":undefined}
            onClick={()=>onWorkspaceChange("assistant")}>AI Assistant</button>
          <button type="button" className={navClass(workspace==="settings")}
            aria-current={workspace==="settings"?"page":undefined}
            onClick={()=>onWorkspaceChange("settings")}>Settings</button>
        </nav>
      </div>
    </div>
  </header>;
}

/** Keep the Portfolio sidebar's existing content, behavior and frosted styling. */
export function Sidebar({page,go,t}:{page:Page;go:Go;t:Translator}) {
  const sidebarClass=(active:boolean)=>"glass-nav-item flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors "+(active?"bg-[#233b50] font-semibold text-[#9af0dc]":"text-slate-400 hover:bg-white/5 hover:text-white");
  return <aside className="glass-sidebar m-4 mr-0 hidden w-[216px] shrink-0 flex-col rounded-2xl border border-white/10 bg-[#101b2d] px-3 py-6 md:sticky md:top-[88px] md:flex md:h-[calc(100dvh-104px)] md:self-start md:overflow-y-auto md:overscroll-contain">
    <div className="mb-5 border-b border-white/10 px-4 pb-5 text-sm font-semibold tracking-wide text-slate-100">{t("Portfolio","投资组合")}</div>
    <nav aria-label="Portfolio navigation" className="space-y-1">
      {portfolioLinks.map(link=><button key={link.id} onClick={()=>go(link.id)} className={sidebarClass(page===link.id)} aria-current={page===link.id?"page":undefined}>
        <span className="w-5 text-lg">{link.symbol}</span>{t(link.label,link.zh)}
      </button>)}
    </nav>
    <div className="mt-auto space-y-1 border-t border-white/10 pt-5">
      <button onClick={()=>go("brief")} className={sidebarClass(page==="brief")} aria-current={page==="brief"?"page":undefined}><span className="w-5 text-lg">▤</span>{t("Daily Brief","每日简报")}</button>
    </div>
  </aside>;
}

export function ResearchSidebar({page,go,t}:{page:ResearchSection;go:ResearchGo;t:Translator}) {
  const sidebarClass=(active:boolean)=>"glass-nav-item flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors "+(active?"bg-[#233b50] font-semibold text-[#9af0dc]":"text-slate-400 hover:bg-white/5 hover:text-white");
  return <aside className="glass-sidebar research-sidebar m-4 mr-0 hidden w-[216px] shrink-0 flex-col rounded-2xl border border-white/10 bg-[#101b2d] px-3 py-6 md:sticky md:top-[88px] md:flex md:h-[calc(100dvh-104px)] md:self-start md:overflow-y-auto md:overscroll-contain">
    <div className="mb-5 border-b border-white/10 px-4 pb-5 text-sm font-semibold tracking-wide text-slate-100">{t("Research","研究")}</div>
    <nav aria-label="Research navigation" className="space-y-1">
      {researchLinks.map(link=><button key={link.id} onClick={()=>go(link.id)} className={sidebarClass(page===link.id)} aria-current={page===link.id?"page":undefined}>
        <span className="w-5 text-lg">{link.symbol}</span>{t(link.label,link.zh)}
      </button>)}
    </nav>
    <div className="mt-auto border-t border-white/10 pt-5 px-4 text-xs leading-5 text-slate-400">
      {t("Research watchlist and reports do not affect your paper positions.","研究关注列表与报告不会影响模拟盘持仓。")}
    </div>
  </aside>;
}

export function MobileNavigation({page,go,t,workspace="portfolio",researchPage="search",goResearch}:{
  page:Page;go:Go;t:Translator;
  workspace?:Workspace;researchPage?:ResearchSection;goResearch?:ResearchGo;
}) {
  if(workspace==="research") return <nav className="mb-5 flex gap-2 overflow-x-auto md:hidden" aria-label="Mobile research navigation">
    {researchLinks.map(link=><button key={link.id} onClick={()=>goResearch?.(link.id)}
      className={"shrink-0 rounded-full px-4 py-2 text-xs "+(researchPage===link.id?"bg-[#7be2ca] font-bold text-[#102139]":"border border-white/10 text-slate-300")}>{t(link.label,link.zh)}</button>)}
  </nav>;
  return <nav className="mb-5 flex gap-2 overflow-x-auto md:hidden" aria-label="Mobile navigation">
    {[...portfolioLinks,{id:"brief" as const,label:"Daily Brief",zh:"每日简报",symbol:"▤"}].map(link=><button key={link.id} onClick={()=>go(link.id)} className={"shrink-0 rounded-full px-4 py-2 text-xs "+(page===link.id?"bg-[#7be2ca] font-bold text-[#102139]":"border border-white/10 text-slate-300")}>{t(link.label,link.zh)}</button>)}
  </nav>;
}

const navItem=(active:boolean)=>"glass-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors "+
 (active?"bg-[#233b50] font-semibold text-[#9af0dc]":"text-slate-400 hover:bg-white/5 hover:text-white");
const sideShell="glass-sidebar m-4 mr-0 hidden w-[216px] shrink-0 flex-col rounded-2xl border border-white/10 bg-[#101b2d] px-3 py-6 md:sticky md:top-[88px] md:flex md:h-[calc(100dvh-104px)] md:self-start md:overflow-y-auto md:overscroll-contain";

export function AssistantSidebar({threads,activeId,onSelect,onNew,onDelete,t}:{
 threads:AssistantThread[];activeId:string;onSelect:(id:string)=>void;
 onNew:()=>void;onDelete:(id:string)=>void;t:Translator;
}){
 return <aside className={sideShell} aria-label="AI Assistant conversation history">
  <div className="mb-4 border-b border-white/10 px-3 pb-5 text-sm font-semibold tracking-wide text-slate-100">
   {t("AI Assistant","AI 助手")}
  </div>
  <button type="button" onClick={onNew}
   className="mb-4 rounded-xl bg-[#83e3cd] px-3 py-2.5 text-sm font-semibold text-[#102139]">
   + {t("New chat","新对话")}
  </button>
  <p className="px-2 pb-2 text-[11px] uppercase tracking-wide text-slate-400">{t("Recent chats","历史聊天")}</p>
  <nav aria-label="Saved assistant chats" className="min-h-0 flex-1 space-y-1 overflow-y-auto">
   {threads.map(item=><div key={item.id} className="group relative">
    <button type="button" onClick={()=>onSelect(item.id)} aria-current={item.id===activeId?"page":undefined}
     className={navItem(item.id===activeId)+" min-w-0 pr-8"}>
      <span aria-hidden>▤</span><span className="min-w-0 truncate">{item.title}</span>
    </button>
    <button type="button" onClick={()=>onDelete(item.id)}
     aria-label={t("Delete chat","删除对话")+": "+item.title}
     className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
     title={t("Delete chat","删除对话")}>×</button>
   </div>)}
  </nav>
  <p className="mt-4 border-t border-white/10 px-3 pt-4 text-[11px] leading-5 text-slate-400">
   {t("Chats are stored only in this browser. Delete sensitive threads on shared devices.",
      "聊天仅保存在当前浏览器。共用设备请删除敏感对话。")}
  </p>
 </aside>;
}

export const SETTINGS_NAV_ITEMS=[
 {id:"overview",label:"Overview",zh:"概览",symbol:"▦"},
 {id:"connection",label:"Connection",zh:"连接",symbol:"◈"},
 {id:"appearance",label:"Appearance",zh:"外观",symbol:"◐"},
 {id:"notifications",label:"Notifications",zh:"通知",symbol:"◉"},
 {id:"regional",label:"Region & language",zh:"语言与地区",symbol:"⌘"},
 {id:"brief",label:"Daily brief",zh:"每日简报",symbol:"▤"},
 {id:"watchlist",label:"Followed companies",zh:"关注公司",symbol:"☆"},
] as const satisfies ReadonlyArray<{id:SettingsSection;label:string;zh:string;symbol:string}>;
export function SettingsSidebar({section,onSectionChange,t}:{
 section:SettingsSection;onSectionChange:(v:SettingsSection)=>void;t:Translator;
}){
 return <aside className={sideShell} aria-label="Settings navigation">
  <div className="mb-5 border-b border-white/10 px-4 pb-5 text-sm font-semibold tracking-wide text-slate-100">
   {t("Settings","设置")}
  </div>
  <nav className="space-y-1">
   {SETTINGS_NAV_ITEMS.map(item=><button key={item.id} type="button"
    onClick={()=>onSectionChange(item.id)} aria-current={section===item.id?"page":undefined}
    className={navItem(section===item.id)}>
    <span className="w-4 text-base">{item.symbol}</span>{t(item.label,item.zh)}
   </button>)}
  </nav>
 </aside>;
}

export function AssistantAndSettingsMobileNav({mode,threads,activeId,onSelect,onNew,settingsSection,onSettingsSectionChange,t}:{
 mode:"assistant"|"settings";threads:AssistantThread[];activeId:string;onSelect:(id:string)=>void;onNew:()=>void;
 settingsSection:SettingsSection;onSettingsSectionChange:(v:SettingsSection)=>void;t:Translator;
}){
 return <nav className="mb-5 flex gap-2 overflow-x-auto md:hidden" aria-label={mode==="assistant"?"Conversation history":"Settings categories"}>
  {mode==="assistant"?<>
   <button type="button" onClick={onNew} className="shrink-0 rounded-full bg-[#7be2ca] px-4 py-2 text-xs font-semibold text-[#102139]">+ {t("New chat","新对话")}</button>
   {threads.map(thread=><button key={thread.id} type="button" onClick={()=>onSelect(thread.id)}
     aria-current={thread.id===activeId?"page":undefined}
     className={"max-w-44 shrink-0 truncate rounded-full border px-3 py-2 text-xs "+
      (thread.id===activeId?"border-[#7be2ca] bg-[#244d4b] text-emerald-100":"border-white/10 text-slate-400")}>{thread.title}</button>)}
  </>:SETTINGS_NAV_ITEMS.map(item=><button key={item.id} type="button"
    onClick={()=>onSettingsSectionChange(item.id)} aria-current={settingsSection===item.id?"page":undefined}
    className={"shrink-0 rounded-full px-4 py-2 text-xs "+(settingsSection===item.id?"bg-[#7be2ca] font-semibold text-[#102139]":"border border-white/10 text-slate-300")}>
     {t(item.label,item.zh)}
   </button>)}
 </nav>;
}
