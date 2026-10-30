"use client";

import type { Preferences } from "../../../hooks/use-preferences";
import type { Page, Tone } from "../../../types/app";

/** Independently maintained Settings section. */
export default function BriefSettings({prefs,go}:{prefs:Preferences;go:(page:Page)=>void}) {
  const { briefTone,setBriefTone,briefTicker,setBriefTicker,watchlist,t }=prefs;
  const fieldClass="surface-field w-full rounded-xl border border-white/15 bg-[#101c2e] px-3 py-3 text-sm text-slate-100 outline-none focus:border-[#88e1ce]";
  const labelClass="mb-2 block text-sm font-medium text-slate-200";
  return (
    <section className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">{t("Daily Brief preferences","每日简报偏好")}</h2><p className="mt-2 text-xs text-slate-400">{t("These filters now control the Daily Brief feed.","以下设置会直接影响 Daily Brief 的显示内容。")}</p><div className="mt-7"><label htmlFor="brief-sentiment" className={labelClass}>{t("News sentiment","新闻情绪类别")}</label><select id="brief-sentiment" value={briefTone} onChange={e=>setBriefTone(e.target.value as "All"|Tone)} className={fieldClass}><option value="All">All / 全部</option><option value="Positive">Positive / 正面</option><option value="Mixed">Mixed / 综合</option><option value="Negative">Negative / 负面</option></select></div><div className="mt-6"><label htmlFor="brief-company" className={labelClass}>{t("Company filter","公司筛选")}</label><select id="brief-company" value={watchlist.includes(briefTicker)?briefTicker:"All"} onChange={e=>setBriefTicker(e.target.value)} className={fieldClass}><option value="All">All followed companies / 所有关注公司</option>{watchlist.map(ticker=><option key={ticker} value={ticker}>{ticker}</option>)}</select></div><button onClick={()=>go("brief")} className="mt-7 rounded-xl border border-emerald-300/20 bg-[#244d4b] px-4 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-[#31615c]">{t("Open Daily Brief →","查看每日简报 →")}</button></section>
  );
}
