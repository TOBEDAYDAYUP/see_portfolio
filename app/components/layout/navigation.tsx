"use client";

import { portfolioLinks } from "../../../lib/navigation";
import type { Page, Translator } from "../../../types/app";

type Go = (next: Page) => void;

export function SiteHeader({go}:{go:Go}) {
  return <>
    <header className="normal-topbar sticky top-0 z-40 border-b border-white/10 bg-[#101b2d]/95">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-9">
        <button type="button" aria-label="SEE Portfolio home" onClick={()=>go("holdings")} className="group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-150 hover:bg-[#303744] active:bg-[#394354] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83e3cd]">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7be2ca] text-xl font-black text-[#102139] transition group-hover:bg-[#a5f4e2]">S.</span>
          <span className="flex flex-col"><span className="text-base font-bold tracking-tight text-white">SEE Portfolio</span><span className="hidden text-[10px] tracking-[.12em] text-slate-500 sm:block">INVESTMENT INTELLIGENCE</span></span>
        </button>
        <div className="hidden text-xs text-slate-400 lg:block">Understand your investments. Without the noise.</div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 surface-pill px-3 py-1.5 text-[11px] font-semibold tracking-wide text-emerald-200">PAPER + DEMO</span>
      </div>
    </header>
  </>;
}

export function Sidebar({page,go,t}:{page:Page;go:Go;t:Translator}) {
  const sidebarClass=(active:boolean)=>"glass-nav-item flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors "+(active?"bg-[#233b50] font-semibold text-[#9af0dc]":"text-slate-400 hover:bg-white/5 hover:text-white");
  return <>
      <aside className="glass-sidebar hidden w-[216px] shrink-0 flex-col border-r border-white/10 bg-[#101b2d] px-3 py-7 md:sticky md:top-[72px] md:flex md:h-[calc(100dvh-72px)] md:self-start md:overflow-y-auto md:overscroll-contain">
        <div className="mb-5 border-b border-white/10 px-4 pb-5 text-sm font-semibold tracking-wide text-slate-100">{t("Portfolio","投资组合")}</div>
        <nav aria-label="Portfolio navigation" className="space-y-1">
          {portfolioLinks.map(link=><button key={link.id} onClick={()=>go(link.id)} className={sidebarClass(page===link.id)} aria-current={page===link.id?"page":undefined}><span className="w-5 text-lg">{link.symbol}</span>{t(link.label,link.zh)}</button>)}
        </nav>
        <div className="mt-auto space-y-1 border-t border-white/10 pt-5">
          <button onClick={()=>go("brief")} className={sidebarClass(page==="brief")} aria-current={page==="brief"?"page":undefined}><span className="w-5 text-lg">▤</span>{t("Daily Brief","每日简报")}</button>
          <button onClick={()=>go("settings")} className={sidebarClass(page==="settings")} aria-current={page==="settings"?"page":undefined}><span className="w-5 text-lg">⚙</span>{t("Settings","设置")}</button>
        </div>
      </aside>
  </>;
}

export function MobileNavigation({page,go,t}:{page:Page;go:Go;t:Translator}) {
  return <>
        <nav className="mb-5 flex gap-2 overflow-x-auto md:hidden" aria-label="Mobile navigation">
          {[...portfolioLinks,{id:"brief" as const,label:"Daily Brief",zh:"每日简报",symbol:"▤"},{id:"settings" as const,label:"Settings",zh:"设置",symbol:"⚙"}].map(link=><button key={link.id} onClick={()=>go(link.id)} className={"shrink-0 rounded-full px-4 py-2 text-xs "+(page===link.id?"bg-[#7be2ca] font-bold text-[#102139]":"border border-white/10 text-slate-300")}>{t(link.label,link.zh)}</button>)}
        </nav>
  </>;
}
