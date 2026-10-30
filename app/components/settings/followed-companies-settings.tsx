"use client";

import type { Preferences } from "../../../hooks/use-preferences";
import { companies } from "../../../lib/demo/market";

/** Independently maintained Settings section. */
export default function FollowedCompaniesSettings({prefs}:{prefs:Preferences}) {
  const { watchlist,setWatchlist,t }=prefs;
  return (
    <section className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">{t("Followed companies","关注的公司")}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{t("Choose the sample stocks used for your Daily Brief. These are not actual holdings.","选择每日简报关注的演示股票；这不代表你实际持有这些股票。")}</p><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">{companies.map(c=>{const active=watchlist.includes(c.ticker);return <button key={c.ticker} onClick={()=>setWatchlist(old=>active?old.filter(x=>x!==c.ticker):[...old,c.ticker])} aria-pressed={active} className={"rounded-xl border px-3 py-3 text-left transition-colors "+(active?"border-[#4c9280] bg-[#244a48] text-[#abf2df]":"border-white/10 bg-[#101d30] text-slate-300 hover:bg-[#26394e]")}><span className="block text-sm font-bold">{c.ticker}</span><span className="mt-1 block truncate text-[11px] text-slate-400">{c.name}</span><span className="mt-2 block text-[11px]">{active?t("✓ Following","✓ 已关注"):t("+ Follow","+ 关注")}</span></button>})}</div></section>
  );
}
