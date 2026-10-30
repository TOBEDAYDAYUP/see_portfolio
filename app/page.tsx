"use client";

import { useEffect, useState } from "react";
import PortfolioDashboard, { type PortfolioSection } from "./components/portfolio-dashboard";

type Page = PortfolioSection | "brief" | "settings";
type Currency = "USD" | "CNY";
type Theme = "dark" | "light";
type Language = "en" | "zh";
type Delivery = "all" | "major" | "digest";
type Tone = "Positive" | "Mixed" | "Negative";
type Company = { ticker: string; name: string };
type Story = { ticker: string; category: string; title: string; detail: string; score: number; tone: Tone };

const companies: Company[] = [
  {ticker:"NVDA",name:"NVIDIA"},{ticker:"AAPL",name:"Apple"},{ticker:"MSFT",name:"Microsoft"},
  {ticker:"GOOGL",name:"Alphabet"},{ticker:"TSLA",name:"Tesla"},{ticker:"AMD",name:"AMD"},
  {ticker:"AMZN",name:"Amazon"},{ticker:"SHOP",name:"Shopify"},{ticker:"META",name:"Meta"},
  {ticker:"TSM",name:"TSMC"},
];
const stories: Story[] = [
  {ticker:"NVDA",category:"Earnings",title:"Hypothetical earnings-guidance revision",detail:"An illustrative change in guidance could influence future valuation assumptions. Source filings would be needed to assess the impact.",score:92,tone:"Mixed"},
  {ticker:"TSLA",category:"Margins",title:"Hypothetical pricing-pressure scenario",detail:"Sample scenario: pricing changes may affect profit margins depending on volumes and production costs.",score:85,tone:"Negative"},
  {ticker:"AAPL",category:"Operations",title:"Hypothetical supply-chain development",detail:"An illustrative supplier-capacity event. Its financial impact remains unknown.",score:78,tone:"Mixed"},
  {ticker:"MSFT",category:"Growth",title:"Hypothetical cloud-demand update",detail:"Sample scenario: stronger customer demand may support growth, subject to expenses and valuation.",score:74,tone:"Positive"},
  {ticker:"GOOGL",category:"Regulation",title:"Hypothetical regulatory development",detail:"A fictional event demonstrating why context matters more than the headline alone.",score:68,tone:"Mixed"},
  {ticker:"AMZN",category:"Retail",title:"Hypothetical retail-demand change",detail:"A fictional demand shift for testing company-related summaries.",score:66,tone:"Positive"},
  {ticker:"AMD",category:"Industry",title:"Hypothetical chip-industry event",detail:"A fictional industry development used to test news relevance.",score:62,tone:"Mixed"},
  {ticker:"SHOP",category:"Growth",title:"Hypothetical merchant-growth update",detail:"A sample business-momentum event for interface testing.",score:72,tone:"Positive"},
  {ticker:"META",category:"Advertising",title:"Hypothetical advertising-market trend",detail:"An illustrative example of a changing advertising market.",score:64,tone:"Mixed"},
  {ticker:"TSM",category:"Operations",title:"Hypothetical foundry-capacity change",detail:"A fictional supply-chain update involving the semiconductor industry.",score:81,tone:"Mixed"},
];
const portfolioLinks: {id:PortfolioSection;label:string;zh:string;symbol:string}[] = [
  {id:"holdings",label:"Holdings",zh:"持仓",symbol:"▥"},
  {id:"analysis",label:"Analysis",zh:"分析",symbol:"◈"},
  {id:"valuations",label:"Valuations",zh:"估值",symbol:"◇"},
  {id:"dividends",label:"Dividends",zh:"分红",symbol:"↗"},
  {id:"returns",label:"Returns",zh:"收益",symbol:"⌁"},
  {id:"updates",label:"Updates",zh:"动态",symbol:"◉"},
];

export default function Home() {
  const [page,setPage] = useState<Page>("holdings");
  const [loaded,setLoaded] = useState(false);
  const [watchlist,setWatchlist] = useState<string[]>(["NVDA","AAPL","MSFT","GOOGL","TSLA"]);
  const [minimumScore,setMinimumScore] = useState(70);
  const [briefTone,setBriefTone] = useState<"All"|Tone>("All");
  const [briefTicker,setBriefTicker] = useState("All");
  const [notifications,setNotifications] = useState(false);
  const [delivery,setDelivery] = useState<Delivery>("major");
  const [language,setLanguage] = useState<Language>("en");
  const [currency,setCurrency] = useState<Currency>("USD");
  const [theme,setTheme] = useState<Theme>("dark");
  const t = (english:string,chinese:string) => language === "zh" ? chinese : english;

  useEffect(() => {
    try {
      const get = (key:string) => localStorage.getItem(key);
      const savedList = get("see-watchlist-v1");
      if(savedList !== null) {
        const data:unknown = JSON.parse(savedList);
        if(Array.isArray(data)) setWatchlist(data.filter((x):x is string => typeof x==="string" && companies.some(c=>c.ticker===x)));
      }
      const score=Number(get("see-minimum-score-v1"));
      if(get("see-minimum-score-v1")!==null && Number.isFinite(score) && score>=40 && score<=95) setMinimumScore(score);
      const tone=get("see-brief-tone-v1");
      if(tone==="All"||tone==="Positive"||tone==="Mixed"||tone==="Negative") setBriefTone(tone);
      const oldMode=get("see-alert-mode-v1");
      const mode=get("see-delivery-v1") ?? (oldMode==="All updates"?"all":oldMode==="Daily digest only"?"digest":"major");
      if(mode==="all"||mode==="major"||mode==="digest") setDelivery(mode);
      if(get("see-notifications-v1")==="true") setNotifications(true);
      if(get("see-language-v1")==="zh") setLanguage("zh");
      if(get("see-currency-v1")==="CNY") setCurrency("CNY");
      if(get("see-theme-v1")==="light") setTheme("light");
    } catch { /* Use safe defaults when storage is unavailable. */ }
    setLoaded(true);
  },[]);
  useEffect(() => {
    if(!loaded) return;
    try {
      localStorage.setItem("see-watchlist-v1",JSON.stringify(watchlist));
      localStorage.setItem("see-minimum-score-v1",String(minimumScore));
      localStorage.setItem("see-brief-tone-v1",briefTone);
      localStorage.setItem("see-delivery-v1",delivery);
      localStorage.setItem("see-notifications-v1",String(notifications));
      localStorage.setItem("see-language-v1",language);
      localStorage.setItem("see-currency-v1",currency);
      localStorage.setItem("see-theme-v1",theme);
    } catch { /* Settings work until the page is refreshed. */ }
  },[loaded,watchlist,minimumScore,briefTone,delivery,notifications,language,currency,theme]);

  const related=stories.filter(s=>watchlist.includes(s.ticker)).sort((a,b)=>b.score-a.score);
  const important=related.filter(s=>s.score>=minimumScore);
  const briefItems=important.filter(s=>(briefTone==="All"||s.tone===briefTone)&&(briefTicker==="All"||s.ticker===briefTicker));
  const notificationCount=!notifications||delivery==="digest"?0:related.filter(s=>s.score>=(delivery==="major"?Math.max(80,minimumScore):minimumScore)).length;
  const go=(next:Page)=>{setPage(next);window.scrollTo({top:0,behavior:"smooth"});};
  const sidebarClass=(active:boolean)=>"glass-nav-item flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors "+(active?"bg-[#233b50] font-semibold text-[#9af0dc]":"text-slate-400 hover:bg-white/5 hover:text-white");
  const fieldClass="glass-field w-full rounded-xl border border-white/15 bg-[#101c2e] px-3 py-3 text-sm text-slate-100 outline-none focus:border-[#88e1ce]";
  const labelClass="mb-2 block text-sm font-medium text-slate-200";

  return <div data-theme={theme} className="see-shell min-h-screen bg-[#0b1424] text-slate-100" onPointerMove={e => {
    if (e.pointerType !== "mouse" || !(e.target instanceof Element)) return;
    const panel = e.target.closest<HTMLElement>(".glass-panel, .glass-feature");
    if (!panel) return;
    const bounds = panel.getBoundingClientRect();
    panel.style.setProperty("--glass-x", (e.clientX - bounds.left).toFixed(0) + "px");
    panel.style.setProperty("--glass-y", (e.clientY - bounds.top).toFixed(0) + "px");
  }}>
    {/* Browser-native SVG displacement: only frosted surface pixels are refracted.
        Text and SVG charts stay sharp; unsupported browsers retain regular glass. */}
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{position:"absolute",overflow:"hidden",pointerEvents:"none"}}>
      <defs>
        <filter id="see-liquid-refraction" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.021" numOctaves="2" seed="7" result="glassNoise"/>
          <feGaussianBlur in="glassNoise" stdDeviation="1.1" result="softNoise"/>
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="28" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
    </svg>
    <header className="glass-topbar sticky top-0 z-40 border-b border-white/10 bg-[#101b2d]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-9">
        <button type="button" aria-label="SEE Portfolio home" onClick={()=>go("holdings")} className="group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-150 hover:bg-[#303744] active:bg-[#394354] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83e3cd]">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7be2ca] text-xl font-black text-[#102139] transition group-hover:bg-[#a5f4e2]">S.</span>
          <span className="flex flex-col"><span className="text-base font-bold tracking-tight text-white">SEE Portfolio</span><span className="hidden text-[10px] tracking-[.12em] text-slate-500 sm:block">INVESTMENT INTELLIGENCE</span></span>
        </button>
        <div className="hidden text-xs text-slate-400 lg:block">Understand your investments. Without the noise.</div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 glass-pill px-3 py-1.5 text-[11px] font-semibold tracking-wide text-emerald-200">DEMO MODE</span>
      </div>
    </header>
    <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[1600px]">
      <aside className="glass-sidebar hidden w-[238px] shrink-0 flex-col border-r border-white/10 bg-[#101b2d] px-4 py-7 md:flex">
        <div className="mb-5 border-b border-white/10 px-4 pb-5 text-sm font-semibold tracking-wide text-slate-100">{t("Portfolio","投资组合")}</div>
        <nav aria-label="Portfolio navigation" className="space-y-1">
          {portfolioLinks.map(link=><button key={link.id} onClick={()=>go(link.id)} className={sidebarClass(page===link.id)} aria-current={page===link.id?"page":undefined}><span className="w-5 text-lg">{link.symbol}</span>{t(link.label,link.zh)}</button>)}
        </nav>
        <div className="mt-auto space-y-1 border-t border-white/10 pt-5">
          <button onClick={()=>go("brief")} className={sidebarClass(page==="brief")} aria-current={page==="brief"?"page":undefined}><span className="w-5 text-lg">▤</span>{t("Daily Brief","每日简报")}</button>
          <button onClick={()=>go("settings")} className={sidebarClass(page==="settings")} aria-current={page==="settings"?"page":undefined}><span className="w-5 text-lg">⚙</span>{t("Settings","设置")}</button>
        </div>
      </aside>
      <main className="see-content min-w-0 flex-1 px-5 pb-16 pt-7 sm:px-9 lg:px-12">
        <nav className="mb-5 flex gap-2 overflow-x-auto md:hidden" aria-label="Mobile navigation">
          {[...portfolioLinks,{id:"brief" as const,label:"Daily Brief",zh:"每日简报",symbol:"▤"},{id:"settings" as const,label:"Settings",zh:"设置",symbol:"⚙"}].map(link=><button key={link.id} onClick={()=>go(link.id)} className={"shrink-0 rounded-full px-4 py-2 text-xs "+(page===link.id?"bg-[#7be2ca] font-bold text-[#102139]":"border border-white/10 text-slate-300")}>{t(link.label,link.zh)}</button>)}
        </nav>
        <div className="mb-7 rounded-xl border border-slate-500/30 bg-[#1c2a40] glass-panel px-4 py-3 text-xs leading-5 text-slate-300"><strong className="text-[#a4f1df]">{t("Prototype preview.","原型预览。")}</strong> {t("Market figures and news are fictional placeholders. No live data, AI scores, or push notifications are connected yet.","行情与新闻目前为虚构演示数据。尚未连接实时数据、AI 评分或实际消息推送。")}</div>
        {portfolioLinks.some(link=>link.id===page)&&<PortfolioDashboard section={page as PortfolioSection} currency={currency}/>}
        {page==="brief"&&<>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-[11px] font-semibold tracking-[.17em] text-[#8fe7d1]">DAILY BRIEF</p><h1 className="text-3xl font-semibold sm:text-[38px]">{t("Your Daily Brief","你的每日简报")}</h1><p className="mt-2 text-sm text-slate-400">{t("The most relevant sample events for the companies you follow.","与你关注的公司有关的演示事件摘要。")}</p></div><button onClick={()=>go("settings")} className="rounded-xl border border-white/15 bg-[#25364a] px-4 py-2.5 text-xs font-semibold text-emerald-100 hover:bg-[#344a60]">⚙ {t("Customize in Settings","前往设置调整")}</button></div>
          <section className="mb-6 rounded-2xl border border-[#315857] bg-[linear-gradient(130deg,#193f42,#172338)] glass-feature glass-refract p-6 sm:p-7"><span className="text-xs font-semibold tracking-[.15em] text-[#b0f2e2]">{t("PERSONALIZED · SAMPLE","个性化 · 演示")}</span><h2 className="mt-4 text-2xl font-semibold">{t("Less noise. More insight.","过滤噪音，聚焦重要信息。")}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{t("Your brief is filtered using the importance and company preferences in Settings. All stories are fictional examples.","这里依据设置中的重要性和公司偏好筛选新闻。所有新闻均为虚构示例。")}</p><div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/10 px-3 py-1.5">{watchlist.length} {t("followed stocks","只关注股票")}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{briefItems.length} {t("matching events","条符合条件的事件")}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{t("Importance","重要性")} ≥ {minimumScore}</span></div></section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("Relevant updates","相关动态")}</h2><span aria-live="polite" className="text-xs text-slate-400">{t("Showing","显示")} {briefItems.length} / {related.length}</span></div>
          <div className="grid gap-4 lg:grid-cols-2">{briefItems.map(story=><article key={story.ticker} className="rounded-2xl border border-white/10 bg-[#172338] glass-panel p-5"><div className="mb-4 flex items-center gap-2 text-xs"><span className="rounded-md bg-[#283950] px-2.5 py-1 font-semibold">{story.ticker}</span><span className="text-slate-400">{story.category}</span><span className={"ml-auto rounded-full px-2.5 py-1 "+(story.tone==="Positive"?"bg-emerald-500/10 text-emerald-300":story.tone==="Negative"?"bg-rose-500/10 text-rose-300":"bg-amber-500/10 text-amber-300")}>{story.tone}</span></div><h3 className="mb-3 font-semibold">{story.title}</h3><p className="text-sm leading-6 text-slate-400">{story.detail}</p><div className="mt-5 flex justify-between border-t border-white/10 pt-4 text-[11px] text-slate-500"><span>{t("Fictional news example","虚构新闻示例")}</span><span>{t("Priority","优先级")} {story.score}/100</span></div></article>)}</div>
          {briefItems.length===0&&<div className="rounded-2xl border border-white/10 bg-[#172338] glass-panel p-7 text-sm text-slate-400">{t("No sample stories match these preferences. Adjust followed companies or the importance threshold in Settings.","当前设置下没有符合条件的演示新闻。请在设置中调整关注公司或重要性阈值。")}</div>}
        </>}
        {page==="settings"&&<>
          <div className="mb-8"><p className="mb-2 text-[11px] font-semibold tracking-[.17em] text-[#8fe7d1]">PREFERENCES</p><h1 className="text-3xl font-semibold sm:text-[38px]">{t("Settings","设置")}</h1><p className="mt-2 text-sm text-slate-400">{t("Choose the information you receive and how you want to view it.","设置消息强度、通知、语言和金额显示方式。")}</p></div>
          <div className="grid gap-5 2xl:grid-cols-2">
            <section className="glass-panel glass-refract rounded-2xl border border-white/10 bg-[#172338] p-5 sm:p-6 2xl:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{t("Appearance","外观主题")}</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{t("Choose the look that suits your workspace. Changes apply immediately and are saved in this browser.","选择适合你的界面风格。切换立即生效，并自动保存在当前浏览器中。")}</p>
                </div>
                <span className="glass-pill rounded-full px-3 py-1.5 text-[11px] font-semibold">{theme==="light"?t("Light Glass","浅色玻璃"):t("Dark Glass","深色玻璃")}</span>
              </div>
              <div role="group" aria-label={t("Color theme","颜色主题")} className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={()=>setTheme("light")} aria-pressed={theme==="light"} className={"theme-choice rounded-2xl p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 "+(theme==="light"?"theme-choice-active":"")}>
                  <div className="theme-miniature theme-miniature-light" aria-hidden="true">
                    <div className="miniature-topbar"><span className="miniature-dot"/> SEE</div>
                    <div className="miniature-layout"><div className="miniature-sidebar"><span/><span/><span/></div><div className="miniature-content"><div className="miniature-chart"><span/><span/><span/><span/><span/></div><div className="miniature-cards"><span/><span/><span/></div></div></div>
                  </div>
                  <span className="mt-3 flex items-center justify-between gap-3">
                    <span><span className="block text-sm font-semibold">{t("☀ Light Glass","☀ 浅色玻璃")}</span><span className="mt-1 block text-xs text-slate-400">{t("Bright, airy, clear","明亮、通透、清晰")}</span></span>
                    <span className="theme-choice-indicator" aria-hidden="true">{theme==="light"?"✓":""}</span>
                  </span>
                </button>
                <button type="button" onClick={()=>setTheme("dark")} aria-pressed={theme==="dark"} className={"theme-choice rounded-2xl p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 "+(theme==="dark"?"theme-choice-active":"")}>
                  <div className="theme-miniature theme-miniature-dark" aria-hidden="true">
                    <div className="miniature-topbar"><span className="miniature-dot"/> SEE</div>
                    <div className="miniature-layout"><div className="miniature-sidebar"><span/><span/><span/></div><div className="miniature-content"><div className="miniature-chart"><span/><span/><span/><span/><span/></div><div className="miniature-cards"><span/><span/><span/></div></div></div>
                  </div>
                  <span className="mt-3 flex items-center justify-between gap-3">
                    <span><span className="block text-sm font-semibold">{t("☾ Dark Glass","☾ 深色玻璃")}</span><span className="mt-1 block text-xs text-slate-400">{t("Focused, calm, immersive","专注、沉稳、沉浸")}</span></span>
                    <span className="theme-choice-indicator" aria-hidden="true">{theme==="dark"?"✓":""}</span>
                  </span>
                </button>
              </div>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#172338] glass-panel p-5 sm:p-6"><div className="mb-6"><h2 className="text-lg font-semibold">{t("Notifications","通知设置")}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{t("Preferences are saved locally. No notifications are delivered in this prototype.","偏好保存在本机浏览器中。目前不会实际发送通知。")}</p></div>
              <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#102035] p-4"><div><div className="text-sm font-medium">{t("Enable notifications","启用消息通知")}</div><p className="mt-1 text-xs text-slate-400">{t("Allow alert delivery when supported","待推送服务接入后允许接收提醒")}</p></div><button role="switch" type="button" aria-checked={notifications} aria-label={t("Enable notifications","启用消息通知")} onClick={()=>setNotifications(v=>!v)} className={"relative h-7 w-12 shrink-0 rounded-full transition-colors "+(notifications?"bg-[#65d5b9]":"bg-[#46566b]")}><span className={"absolute top-1 h-5 w-5 rounded-full bg-white transition-all "+(notifications?"left-6":"left-1")}/></button></div>
              <label htmlFor="notification-intensity" className={labelClass}>{t("Importance threshold / intensity","重要性阈值 / 推送强度")}: <span className="text-[#a1ebdc]">{minimumScore}/100</span></label>
              <input id="notification-intensity" type="range" min={40} max={95} step={5} value={minimumScore} onChange={e=>setMinimumScore(Number(e.target.value))} className="w-full cursor-pointer accent-[#83e3cd]"/>
              <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{t("More updates","更多消息")}</span><span>{t("Only high-impact","仅重大消息")}</span></div>
              <div className="mt-6"><label htmlFor="delivery-frequency" className={labelClass}>{t("Notification frequency","通知频率")}</label><select id="delivery-frequency" value={delivery} onChange={e=>setDelivery(e.target.value as Delivery)} className={fieldClass}><option value="all">All qualifying updates / 所有符合条件的消息</option><option value="major">Major updates only / 仅重大消息</option><option value="digest">Daily digest only / 仅每日简报</option></select></div>
              <div aria-live="polite" className="mt-5 rounded-xl bg-[#102035] p-4 text-xs leading-6 text-slate-300">{notifications?t("If delivery were connected, ","如果已接入推送服务，") + notificationCount + t(" sample events would qualify for immediate alerts."," 条演示事件符合即时提醒条件。"):t("Notifications are off. No immediate alerts would be queued.","通知已关闭，不会安排即时提醒。")}</div>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#172338] glass-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">{t("Language & currency","语言与金额币种")}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{t("Personalize the interface and how sample financial amounts are displayed.","自定义界面语言和演示财务金额的显示方式。")}</p>
              <div className="mt-7"><label htmlFor="app-language" className={labelClass}>{t("Preferred language","首选语言")}</label><select id="app-language" value={language} onChange={e=>setLanguage(e.target.value as Language)} className={fieldClass}><option value="en">English</option><option value="zh">简体中文 (Simplified Chinese)</option></select><p className="mt-2 text-xs text-slate-500">{t("Sidebar, Settings and Daily Brief interface text switch languages. Example news and some financial labels remain in English.","侧边栏、设置页及每日简报界面会切换语言；新闻示例和部分财务标签仍使用英文。")}</p></div>
              <div className="mt-7"><label htmlFor="display-currency" className={labelClass}>{t("Display currency","金额显示币种")}</label><select id="display-currency" value={currency} onChange={e=>setCurrency(e.target.value as Currency)} className={fieldClass}><option value="USD">USD — US Dollar / 美元</option><option value="CNY">CNY — Chinese Yuan / 人民币</option></select><p className="mt-2 text-xs text-slate-500">{currency==="CNY"?t("Sample financial figures are converted using a fixed illustrative rate: 1 USD = 7.20 CNY.","演示金额按固定示例汇率换算：1 美元 = 7.20 人民币。"):t("Sample portfolio figures are displayed in US dollars.","演示组合的财务金额以美元显示。")}</p><div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-xs leading-6 text-amber-100/90">{t("Display currency is not brokerage settlement currency. This setting does not change an Alpaca account, execute currency conversion, or affect trades.","显示币种不等于券商实际结算币种。此设置不会修改 Alpaca 账户、实际换汇或影响交易。")}</div></div>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#172338] glass-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">{t("Daily Brief preferences","每日简报偏好")}</h2><p className="mt-2 text-xs text-slate-400">{t("These filters now control the Daily Brief feed.","以下设置会直接影响 Daily Brief 的显示内容。")}</p><div className="mt-7"><label htmlFor="brief-sentiment" className={labelClass}>{t("News sentiment","新闻情绪类别")}</label><select id="brief-sentiment" value={briefTone} onChange={e=>setBriefTone(e.target.value as "All"|Tone)} className={fieldClass}><option value="All">All / 全部</option><option value="Positive">Positive / 正面</option><option value="Mixed">Mixed / 综合</option><option value="Negative">Negative / 负面</option></select></div><div className="mt-6"><label htmlFor="brief-company" className={labelClass}>{t("Company filter","公司筛选")}</label><select id="brief-company" value={watchlist.includes(briefTicker)?briefTicker:"All"} onChange={e=>setBriefTicker(e.target.value)} className={fieldClass}><option value="All">All followed companies / 所有关注公司</option>{watchlist.map(ticker=><option key={ticker} value={ticker}>{ticker}</option>)}</select></div><button onClick={()=>go("brief")} className="mt-7 rounded-xl border border-emerald-300/20 bg-[#244d4b] px-4 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-[#31615c]">{t("Open Daily Brief →","查看每日简报 →")}</button></section>
            <section className="rounded-2xl border border-white/10 bg-[#172338] glass-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">{t("Followed companies","关注的公司")}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{t("Choose the sample stocks used for your Daily Brief. These are not actual holdings.","选择每日简报关注的演示股票；这不代表你实际持有这些股票。")}</p><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">{companies.map(c=>{const active=watchlist.includes(c.ticker);return <button key={c.ticker} onClick={()=>setWatchlist(old=>active?old.filter(x=>x!==c.ticker):[...old,c.ticker])} aria-pressed={active} className={"rounded-xl border px-3 py-3 text-left transition-colors "+(active?"border-[#4c9280] bg-[#244a48] text-[#abf2df]":"border-white/10 bg-[#101d30] text-slate-300 hover:bg-[#26394e]")}><span className="block text-sm font-bold">{c.ticker}</span><span className="mt-1 block truncate text-[11px] text-slate-400">{c.name}</span><span className="mt-2 block text-[11px]">{active?t("✓ Following","✓ 已关注"):t("+ Follow","+ 关注")}</span></button>})}</div></section>
          </div>
          <p className="mt-6 text-xs leading-6 text-slate-500">{t("Settings are saved in this browser only. Accounts and cross-device sync will be added later.","设置目前仅保存在当前浏览器中，未来再增加登录和跨设备同步。")}</p>
        </>}
        <footer className="mt-12 border-t border-white/10 pt-6 text-xs leading-6 text-slate-500">SEE Portfolio · {t("Prototype · Financial data and news are illustrative, not investment advice.","原型版本 · 财务数据和新闻仅作演示，不构成投资建议。")}</footer>
      </main>
    </div>
  </div>;
}
