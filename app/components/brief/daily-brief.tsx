"use client";

import type { Preferences } from "../../../hooks/use-preferences";
import type { Page, Story } from "../../../types/app";

type Props={prefs:Preferences;go:(page:Page)=>void;briefItems:Story[];relatedCount:number};
/** The presentation-only daily digest. Sample news remains clearly labeled. */
export default function DailyBrief({prefs,go,briefItems,relatedCount}:Props) {
  const {watchlist,minimumScore,t}=prefs;
  const related={length:relatedCount};
  return <>

          <div className="mb-8 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-[11px] font-semibold tracking-[.17em] text-[#8fe7d1]">DAILY BRIEF</p><h1 className="text-3xl font-semibold sm:text-[38px]">{t("Your Daily Brief","你的每日简报")}</h1><p className="mt-2 text-sm text-slate-400">{t("The most relevant sample events for the companies you follow.","与你关注的公司有关的演示事件摘要。")}</p></div><button onClick={()=>go("settings")} className="rounded-xl border border-white/15 bg-[#25364a] px-4 py-2.5 text-xs font-semibold text-emerald-100 hover:bg-[#344a60]">⚙ {t("Customize in Settings","前往设置调整")}</button></div>
          <section className="mb-6 rounded-2xl border border-[#315857] bg-[linear-gradient(130deg,#193f42,#172338)] surface-feature  p-6 sm:p-7"><span className="text-xs font-semibold tracking-[.15em] text-[#b0f2e2]">{t("PERSONALIZED · SAMPLE","个性化 · 演示")}</span><h2 className="mt-4 text-2xl font-semibold">{t("Less noise. More insight.","过滤噪音，聚焦重要信息。")}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{t("Your brief is filtered using the importance and company preferences in Settings. All stories are fictional examples.","这里依据设置中的重要性和公司偏好筛选新闻。所有新闻均为虚构示例。")}</p><div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/10 px-3 py-1.5">{watchlist.length} {t("followed stocks","只关注股票")}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{briefItems.length} {t("matching events","条符合条件的事件")}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{t("Importance","重要性")} ≥ {minimumScore}</span></div></section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("Relevant updates","相关动态")}</h2><span aria-live="polite" className="text-xs text-slate-400">{t("Showing","显示")} {briefItems.length} / {related.length}</span></div>
          <div className="grid gap-4 lg:grid-cols-2">{briefItems.map(story=><article key={story.ticker} className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-5"><div className="mb-4 flex items-center gap-2 text-xs"><span className="rounded-md bg-[#283950] px-2.5 py-1 font-semibold">{story.ticker}</span><span className="text-slate-400">{story.category}</span><span className={"ml-auto rounded-full px-2.5 py-1 "+(story.tone==="Positive"?"bg-emerald-500/10 text-emerald-300":story.tone==="Negative"?"bg-rose-500/10 text-rose-300":"bg-amber-500/10 text-amber-300")}>{story.tone}</span></div><h3 className="mb-3 font-semibold">{story.title}</h3><p className="text-sm leading-6 text-slate-400">{story.detail}</p><div className="mt-5 flex justify-between border-t border-white/10 pt-4 text-[11px] text-slate-500"><span>{t("Fictional news example","虚构新闻示例")}</span><span>{t("Priority","优先级")} {story.score}/100</span></div></article>)}</div>
          {briefItems.length===0&&<div className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-7 text-sm text-slate-400">{t("No sample stories match these preferences. Adjust followed companies or the importance threshold in Settings.","当前设置下没有符合条件的演示新闻。请在设置中调整关注公司或重要性阈值。")}</div>}

  </>;
}
