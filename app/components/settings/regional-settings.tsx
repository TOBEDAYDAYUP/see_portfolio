"use client";

import type { Preferences } from "../../../hooks/use-preferences";
import type { Currency, Language } from "../../../types/app";

/** Independently maintained Settings section. */
export default function RegionalSettings({prefs}:{prefs:Preferences}) {
  const { language,setLanguage,currency,setCurrency,t }=prefs;
  const fieldClass="surface-field w-full rounded-xl border border-white/15 bg-[#101c2e] px-3 py-3 text-sm text-slate-100 outline-none focus:border-[#88e1ce]";
  const labelClass="mb-2 block text-sm font-medium text-slate-200";
  return (
    <section className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">{t("Language & currency","语言与金额币种")}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{t("Personalize the interface and how sample financial amounts are displayed.","自定义界面语言和演示财务金额的显示方式。")}</p>
              <div className="mt-7"><label htmlFor="app-language" className={labelClass}>{t("Preferred language","首选语言")}</label><select id="app-language" value={language} onChange={e=>setLanguage(e.target.value as Language)} className={fieldClass}><option value="en">English</option><option value="zh">简体中文 (Simplified Chinese)</option></select><p className="mt-2 text-xs text-slate-500">{t("Sidebar, Settings and Daily Brief interface text switch languages. Example news and some financial labels remain in English.","侧边栏、设置页及每日简报界面会切换语言；新闻示例和部分财务标签仍使用英文。")}</p></div>
              <div className="mt-7"><label htmlFor="display-currency" className={labelClass}>{t("Display currency","金额显示币种")}</label><select id="display-currency" value={currency} onChange={e=>setCurrency(e.target.value as Currency)} className={fieldClass}><option value="USD">USD — US Dollar / 美元</option><option value="CNY">CNY — Chinese Yuan / 人民币</option></select><p className="mt-2 text-xs text-slate-500">{currency==="CNY"?t("Sample financial figures are converted using a fixed illustrative rate: 1 USD = 7.20 CNY.","演示金额按固定示例汇率换算：1 美元 = 7.20 人民币。"):t("Sample portfolio figures are displayed in US dollars.","演示组合的财务金额以美元显示。")}</p><div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-xs leading-6 text-amber-100/90">{t("Display currency is not brokerage settlement currency. This setting does not change an Alpaca account, execute currency conversion, or affect trades.","显示币种不等于券商实际结算币种。此设置不会修改 Alpaca 账户、实际换汇或影响交易。")}</div></div>
            </section>
  );
}
