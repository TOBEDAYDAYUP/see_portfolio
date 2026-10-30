"use client";

import { companies } from "../../../lib/demo/market";
import type { Preferences } from "../../../hooks/use-preferences";
import type { Currency, Delivery, Language, Page, Tone } from "../../../types/app";

type Props={prefs:Preferences;go:(page:Page)=>void;notificationCount:number};
/** Appearance, notifications, news filters and followed companies. */
export default function SettingsPanel({prefs,go,notificationCount}:Props) {
  const { theme,setTheme,notifications,setNotifications,minimumScore,setMinimumScore,delivery,setDelivery,language,setLanguage,currency,setCurrency,briefTone,setBriefTone,briefTicker,setBriefTicker,watchlist,setWatchlist,t }=prefs;
  const fieldClass="surface-field w-full rounded-xl border border-white/15 bg-[#101c2e] px-3 py-3 text-sm text-slate-100 outline-none focus:border-[#88e1ce]";
  const labelClass="mb-2 block text-sm font-medium text-slate-200";
  return <>

          <div className="mb-8"><p className="mb-2 text-[11px] font-semibold tracking-[.17em] text-[#8fe7d1]">PREFERENCES</p><h1 className="text-3xl font-semibold sm:text-[38px]">{t("Settings","设置")}</h1><p className="mt-2 text-sm text-slate-400">{t("Choose the information you receive and how you want to view it.","设置消息强度、通知、语言和金额显示方式。")}</p></div>
          <div className="grid gap-5 2xl:grid-cols-2">
            <section className="surface-panel  rounded-2xl border border-white/10 bg-[#172338] p-5 sm:p-6 2xl:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{t("Appearance","外观主题")}</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{t("Choose the look that suits your workspace. Changes apply immediately and are saved in this browser.","选择适合你的界面风格。切换立即生效，并自动保存在当前浏览器中。")}</p>
                </div>
                <span className="surface-pill rounded-full px-3 py-1.5 text-[11px] font-semibold">{theme==="light"?t("Light","浅色主题"):t("Dark","深色主题")}</span>
              </div>
              <div role="group" aria-label={t("Color theme","颜色主题")} className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={()=>setTheme("light")} aria-pressed={theme==="light"} className={"theme-choice rounded-2xl p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 "+(theme==="light"?"theme-choice-active":"")}>
                  <div className="theme-miniature theme-miniature-light" aria-hidden="true">
                    <div className="miniature-topbar"><span className="miniature-dot"/> SEE</div>
                    <div className="miniature-layout"><div className="miniature-sidebar"><span/><span/><span/></div><div className="miniature-content"><div className="miniature-chart"><span/><span/><span/><span/><span/></div><div className="miniature-cards"><span/><span/><span/></div></div></div>
                  </div>
                  <span className="mt-3 flex items-center justify-between gap-3">
                    <span><span className="block text-sm font-semibold">{t("☀ Light","☀ 浅色主题")}</span><span className="mt-1 block text-xs text-slate-400">{t("Bright, airy, clear","明亮、通透、清晰")}</span></span>
                    <span className="theme-choice-indicator" aria-hidden="true">{theme==="light"?"✓":""}</span>
                  </span>
                </button>
                <button type="button" onClick={()=>setTheme("dark")} aria-pressed={theme==="dark"} className={"theme-choice rounded-2xl p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 "+(theme==="dark"?"theme-choice-active":"")}>
                  <div className="theme-miniature theme-miniature-dark" aria-hidden="true">
                    <div className="miniature-topbar"><span className="miniature-dot"/> SEE</div>
                    <div className="miniature-layout"><div className="miniature-sidebar"><span/><span/><span/></div><div className="miniature-content"><div className="miniature-chart"><span/><span/><span/><span/><span/></div><div className="miniature-cards"><span/><span/><span/></div></div></div>
                  </div>
                  <span className="mt-3 flex items-center justify-between gap-3">
                    <span><span className="block text-sm font-semibold">{t("☾ Dark","☾ 深色主题")}</span><span className="mt-1 block text-xs text-slate-400">{t("Focused, calm, immersive","专注、沉稳、沉浸")}</span></span>
                    <span className="theme-choice-indicator" aria-hidden="true">{theme==="dark"?"✓":""}</span>
                  </span>
                </button>
              </div>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-5 sm:p-6"><div className="mb-6"><h2 className="text-lg font-semibold">{t("Notifications","通知设置")}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{t("Preferences are saved locally. No notifications are delivered in this prototype.","偏好保存在本机浏览器中。目前不会实际发送通知。")}</p></div>
              <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#102035] p-4"><div><div className="text-sm font-medium">{t("Enable notifications","启用消息通知")}</div><p className="mt-1 text-xs text-slate-400">{t("Allow alert delivery when supported","待推送服务接入后允许接收提醒")}</p></div><button role="switch" type="button" aria-checked={notifications} aria-label={t("Enable notifications","启用消息通知")} onClick={()=>setNotifications(v=>!v)} className={"relative h-7 w-12 shrink-0 rounded-full transition-colors "+(notifications?"bg-[#65d5b9]":"bg-[#46566b]")}><span className={"absolute top-1 h-5 w-5 rounded-full bg-white transition-all "+(notifications?"left-6":"left-1")}/></button></div>
              <label htmlFor="notification-intensity" className={labelClass}>{t("Importance threshold / intensity","重要性阈值 / 推送强度")}: <span className="text-[#a1ebdc]">{minimumScore}/100</span></label>
              <input id="notification-intensity" type="range" min={40} max={95} step={5} value={minimumScore} onChange={e=>setMinimumScore(Number(e.target.value))} className="w-full cursor-pointer accent-[#83e3cd]"/>
              <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{t("More updates","更多消息")}</span><span>{t("Only high-impact","仅重大消息")}</span></div>
              <div className="mt-6"><label htmlFor="delivery-frequency" className={labelClass}>{t("Notification frequency","通知频率")}</label><select id="delivery-frequency" value={delivery} onChange={e=>setDelivery(e.target.value as Delivery)} className={fieldClass}><option value="all">All qualifying updates / 所有符合条件的消息</option><option value="major">Major updates only / 仅重大消息</option><option value="digest">Daily digest only / 仅每日简报</option></select></div>
              <div aria-live="polite" className="mt-5 rounded-xl bg-[#102035] p-4 text-xs leading-6 text-slate-300">{notifications?t("If delivery were connected, ","如果已接入推送服务，") + notificationCount + t(" sample events would qualify for immediate alerts."," 条演示事件符合即时提醒条件。"):t("Notifications are off. No immediate alerts would be queued.","通知已关闭，不会安排即时提醒。")}</div>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">{t("Language & currency","语言与金额币种")}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{t("Personalize the interface and how sample financial amounts are displayed.","自定义界面语言和演示财务金额的显示方式。")}</p>
              <div className="mt-7"><label htmlFor="app-language" className={labelClass}>{t("Preferred language","首选语言")}</label><select id="app-language" value={language} onChange={e=>setLanguage(e.target.value as Language)} className={fieldClass}><option value="en">English</option><option value="zh">简体中文 (Simplified Chinese)</option></select><p className="mt-2 text-xs text-slate-500">{t("Sidebar, Settings and Daily Brief interface text switch languages. Example news and some financial labels remain in English.","侧边栏、设置页及每日简报界面会切换语言；新闻示例和部分财务标签仍使用英文。")}</p></div>
              <div className="mt-7"><label htmlFor="display-currency" className={labelClass}>{t("Display currency","金额显示币种")}</label><select id="display-currency" value={currency} onChange={e=>setCurrency(e.target.value as Currency)} className={fieldClass}><option value="USD">USD — US Dollar / 美元</option><option value="CNY">CNY — Chinese Yuan / 人民币</option></select><p className="mt-2 text-xs text-slate-500">{currency==="CNY"?t("Sample financial figures are converted using a fixed illustrative rate: 1 USD = 7.20 CNY.","演示金额按固定示例汇率换算：1 美元 = 7.20 人民币。"):t("Sample portfolio figures are displayed in US dollars.","演示组合的财务金额以美元显示。")}</p><div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-xs leading-6 text-amber-100/90">{t("Display currency is not brokerage settlement currency. This setting does not change an Alpaca account, execute currency conversion, or affect trades.","显示币种不等于券商实际结算币种。此设置不会修改 Alpaca 账户、实际换汇或影响交易。")}</div></div>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">{t("Daily Brief preferences","每日简报偏好")}</h2><p className="mt-2 text-xs text-slate-400">{t("These filters now control the Daily Brief feed.","以下设置会直接影响 Daily Brief 的显示内容。")}</p><div className="mt-7"><label htmlFor="brief-sentiment" className={labelClass}>{t("News sentiment","新闻情绪类别")}</label><select id="brief-sentiment" value={briefTone} onChange={e=>setBriefTone(e.target.value as "All"|Tone)} className={fieldClass}><option value="All">All / 全部</option><option value="Positive">Positive / 正面</option><option value="Mixed">Mixed / 综合</option><option value="Negative">Negative / 负面</option></select></div><div className="mt-6"><label htmlFor="brief-company" className={labelClass}>{t("Company filter","公司筛选")}</label><select id="brief-company" value={watchlist.includes(briefTicker)?briefTicker:"All"} onChange={e=>setBriefTicker(e.target.value)} className={fieldClass}><option value="All">All followed companies / 所有关注公司</option>{watchlist.map(ticker=><option key={ticker} value={ticker}>{ticker}</option>)}</select></div><button onClick={()=>go("brief")} className="mt-7 rounded-xl border border-emerald-300/20 bg-[#244d4b] px-4 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-[#31615c]">{t("Open Daily Brief →","查看每日简报 →")}</button></section>
            <section className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">{t("Followed companies","关注的公司")}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{t("Choose the sample stocks used for your Daily Brief. These are not actual holdings.","选择每日简报关注的演示股票；这不代表你实际持有这些股票。")}</p><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">{companies.map(c=>{const active=watchlist.includes(c.ticker);return <button key={c.ticker} onClick={()=>setWatchlist(old=>active?old.filter(x=>x!==c.ticker):[...old,c.ticker])} aria-pressed={active} className={"rounded-xl border px-3 py-3 text-left transition-colors "+(active?"border-[#4c9280] bg-[#244a48] text-[#abf2df]":"border-white/10 bg-[#101d30] text-slate-300 hover:bg-[#26394e]")}><span className="block text-sm font-bold">{c.ticker}</span><span className="mt-1 block truncate text-[11px] text-slate-400">{c.name}</span><span className="mt-2 block text-[11px]">{active?t("✓ Following","✓ 已关注"):t("+ Follow","+ 关注")}</span></button>})}</div></section>
          </div>
          <p className="mt-6 text-xs leading-6 text-slate-500">{t("Settings are saved in this browser only. Accounts and cross-device sync will be added later.","设置目前仅保存在当前浏览器中，未来再增加登录和跨设备同步。")}</p>

  </>;
}
