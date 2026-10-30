"use client";

import { useEffect, useState } from "react";

type Page = "overview" | "watchlist" | "brief";
type Stock = { ticker: string; name: string; sector: string; price: number; change: number; line: string };
type Story = { ticker: string; type: string; title: string; detail: string; score: number; tone: "Positive" | "Mixed" | "Negative" };

const catalogue: Stock[] = [
  { ticker:"NVDA", name:"NVIDIA", sector:"Semiconductors", price:184.25, change:2.34, line:"0,33 14,30 28,34 42,22 56,25 70,18 84,20 98,8" },
  { ticker:"AAPL", name:"Apple", sector:"Technology", price:251.80, change:-0.71, line:"0,10 14,13 28,9 42,21 56,17 70,23 84,28 98,32" },
  { ticker:"MSFT", name:"Microsoft", sector:"Cloud & Software", price:519.36, change:1.18, line:"0,32 14,28 28,30 42,22 56,25 70,17 84,16 98,7" },
  { ticker:"TSLA", name:"Tesla", sector:"Automotive", price:326.14, change:-1.42, line:"0,7 14,13 28,12 42,21 56,24 70,19 84,30 98,35" },
  { ticker:"GOOGL", name:"Alphabet", sector:"Internet", price:205.62, change:0.86, line:"0,30 14,28 28,31 42,24 56,19 70,22 84,13 98,10" },
  { ticker:"AMZN", name:"Amazon", sector:"E-commerce & Cloud", price:232.15, change:0.39, line:"0,30 14,27 28,28 42,21 56,22 70,16 84,14 98,10" },
  { ticker:"AMD", name:"AMD", sector:"Semiconductors", price:176.48, change:-0.54, line:"0,11 14,8 28,15 42,20 56,18 70,26 84,24 98,33" },
  { ticker:"SHOP", name:"Shopify", sector:"Commerce software", price:148.76, change:1.27, line:"0,33 14,31 28,26 42,29 56,19 70,21 84,13 98,7" },
  { ticker:"META", name:"Meta", sector:"Digital advertising", price:641.19, change:0.68, line:"0,32 14,28 28,30 42,24 56,20 70,18 84,15 98,8" },
  { ticker:"TSM", name:"TSMC", sector:"Semiconductors", price:284.38, change:1.85, line:"0,34 14,27 28,25 42,29 56,17 70,15 84,10 98,5" },
];
const stories: Story[] = [
  { ticker:"NVDA", type:"Earnings", title:"Hypothetical earnings-guidance revision", detail:"An illustrative change in guidance could influence future valuation assumptions. Check source filings before interpreting any impact.", score:92, tone:"Mixed" },
  { ticker:"TSLA", type:"Margins", title:"Hypothetical pricing-pressure scenario", detail:"Sample scenario: pricing changes may affect profit margins depending on volumes and production costs.", score:85, tone:"Negative" },
  { ticker:"AAPL", type:"Operations", title:"Hypothetical supply-chain development", detail:"Sample scenario: changes in supplier capacity may influence expected deliveries, but the magnitude remains uncertain.", score:78, tone:"Mixed" },
  { ticker:"MSFT", type:"Growth", title:"Hypothetical cloud-demand update", detail:"Sample scenario: stronger customer demand may support growth assumptions, subject to expenses and valuation.", score:74, tone:"Positive" },
  { ticker:"GOOGL", type:"Regulation", title:"Hypothetical regulatory development", detail:"A sample event demonstrating why context matters more than the headline alone.", score:68, tone:"Mixed" },
  { ticker:"AMZN", type:"Growth", title:"Hypothetical retail-demand change", detail:"A sample demand shift could affect revenue expectations; profitability would require separate analysis.", score:66, tone:"Positive" },
  { ticker:"AMD", type:"Industry", title:"Hypothetical chip-industry event", detail:"A fictional industry development used to test whether relevant news reaches your watchlist.", score:62, tone:"Mixed" },
  { ticker:"SHOP", type:"Operations", title:"Hypothetical merchant-growth update", detail:"A fictional business-momentum event for interface testing.", score:72, tone:"Positive" },
  { ticker:"META", type:"Industry", title:"Hypothetical advertising-market trend", detail:"An illustrative example of a changing advertising market.", score:64, tone:"Mixed" },
  { ticker:"TSM", type:"Operations", title:"Hypothetical foundry-capacity change", detail:"A fictional supply-chain update that might matter across the semiconductor industry.", score:81, tone:"Mixed" },
];

function Movement({ stock }: { stock: Stock }) {
  return <svg className="h-10 w-24 shrink-0" viewBox="0 0 100 40" aria-label="Sample price trend" role="img"><polyline points={stock.line} stroke={stock.change >= 0 ? "#79e3c6" : "#f1a4af"} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function StoryCard({ story }: { story: Story }) {
  const toneClass = story.tone === "Positive" ? "bg-emerald-500/10 text-emerald-300" : story.tone === "Negative" ? "bg-rose-500/10 text-rose-300" : "bg-amber-500/10 text-amber-300";
  return <article className="rounded-2xl border border-white/10 bg-[#172338] p-5">
    <div className="mb-4 flex items-center gap-2 text-xs"><span className="rounded-md bg-[#283950] px-2.5 py-1 font-semibold">{story.ticker}</span><span className="text-slate-400">{story.type}</span><span className={"ml-auto rounded-full px-2.5 py-1 " + toneClass}>{story.tone}</span></div>
    <h3 className="mb-2 text-base font-semibold leading-snug text-slate-100">{story.title}</h3>
    <p className="min-h-20 text-sm leading-6 text-slate-400">{story.detail}</p>
    <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px] text-slate-500"><span>Example only · Not real news</span><span>Priority {story.score}/100</span></div>
  </article>;
}

export default function Home() {
  const [page,setPage] = useState<Page>("overview");
  const [watchlist,setWatchlist] = useState<string[]>(["NVDA","AAPL","MSFT","GOOGL","TSLA"]);
  const [loaded,setLoaded] = useState(false);
  const [open,setOpen] = useState(false);
  const [search,setSearch] = useState("");
  const [selected,setSelected] = useState("NVDA");
  const [alertMode,setAlertMode] = useState("Major updates");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("see-watchlist-v1");
      if (raw !== null) {
        const data: unknown = JSON.parse(raw);
        if (Array.isArray(data)) setWatchlist(data.filter((s): s is string => typeof s === "string" && catalogue.some((c) => c.ticker === s)));
      }
    } catch { /* Start with sample data if browser storage fails. */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem("see-watchlist-v1", JSON.stringify(watchlist)); } catch {} } }, [watchlist,loaded]);
  const followed = catalogue.filter(s => watchlist.includes(s.ticker));
  const related = stories.filter(s => watchlist.includes(s.ticker)).sort((a,b) => b.score - a.score);
  const suggestions = catalogue.filter(s => !watchlist.includes(s.ticker) && (s.ticker.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase())));
  const add = (ticker: string) => { setWatchlist(old => [...new Set([...old,ticker])]); setSelected(ticker); setOpen(false); setSearch(""); };
  const remove = (ticker: string) => setWatchlist(old => old.filter(s => s !== ticker));
  const tabs: {id:Page;label:string;symbol:string}[] = [{id:"overview",label:"Overview",symbol:"▦"},{id:"watchlist",label:"My Watchlist",symbol:"☆"},{id:"brief",label:"Daily Brief",symbol:"▤"}];
  const title = page === "overview" ? "Your market, clearly." : page === "watchlist" ? "Your watchlist." : "Your daily brief.";

  return <div className="min-h-screen bg-[#0b1424] text-slate-100">
    {/* Persistent, site-wide navigation: clicking the brand always returns home. */}
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#101b2d]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-9">
        <button
          type="button"
          aria-label="SEE Portfolio — return to Overview"
          title="Back to Overview"
          onClick={() => { setPage("overview"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="group flex shrink-0 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#83e3cd]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7be2ca] text-xl font-black text-[#102139] transition group-hover:bg-[#a5f4e2]">S.</span>
          <span className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white transition group-hover:text-[#baf6e9]">SEE Portfolio</span>
            <span className="hidden text-[10px] tracking-[.12em] text-slate-500 sm:block">INVESTMENT INTELLIGENCE</span>
          </span>
        </button>
        <div className="hidden text-xs text-slate-400 lg:block">
          Understand your investments. Without the noise.
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-emerald-200">DEMO MODE</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2c4058] text-xs font-bold" aria-label="Demo profile">SP</span>
        </div>
      </div>
    </header>
    <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[1600px]">
      <aside className="hidden w-[242px] shrink-0 flex-col border-r border-white/10 bg-[#101b2d] px-5 py-8 md:flex">
        <div className="mb-8 border-b border-white/10 pb-5 text-sm font-medium text-slate-300">Research workspace</div>
        <div className="mb-4 px-3 text-[10px] font-semibold tracking-[.2em] text-slate-500">WORKSPACE</div>
        <nav className="space-y-1">{tabs.map(t => <button key={t.id} onClick={() => setPage(t.id)} className={"flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition " + (page === t.id ? "bg-[#233b50] font-semibold text-[#9af0dc]" : "text-slate-400 hover:bg-white/5 hover:text-white")}><span className="w-5 text-lg">{t.symbol}</span>{t.label}</button>)}</nav>
        <div className="mt-auto rounded-2xl border border-emerald-300/10 bg-[#18333d] p-4"><div className="mb-2 text-sm font-semibold text-[#a4f1df]">◇ &nbsp; Private preview</div><p className="text-xs leading-5 text-slate-400">Your list is stored in this browser. No brokerage connection is needed.</p></div>
        <p className="mt-5 px-1 text-[11px] text-slate-600">SEE Portfolio · Prototype v0.1</p>
      </aside>
      <main className="min-w-0 flex-1 px-5 pb-16 pt-7 sm:px-9 lg:px-12">
        <div className="mb-6 flex items-center gap-2 text-xs text-slate-400"><span className="text-emerald-300">●</span> Personal research workspace</div>
        <nav className="mb-5 flex gap-2 overflow-x-auto md:hidden">{tabs.map(t => <button key={t.id} onClick={() => setPage(t.id)} className={"shrink-0 rounded-full px-4 py-2 text-xs " + (page === t.id ? "bg-[#7be2ca] font-bold text-[#102139]" : "border border-white/10 text-slate-300")}>{t.label}</button>)}</nav>
        <div className="mb-7 rounded-xl border border-slate-500/30 bg-[#1c2a40] px-4 py-3 text-xs leading-5 text-slate-300"><strong className="text-[#a4f1df]">Prototype preview.</strong> All prices, charts, percentage changes and news are fictional placeholders. No live market data or AI system is connected yet.</div>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 text-[11px] font-bold tracking-[.2em] text-[#85e6cf]">{page === "overview" ? "YOUR PERSONAL OVERVIEW" : page === "watchlist" ? "YOUR STOCKS" : "CURATED FOR YOU"}</div><h1 className="text-3xl font-semibold tracking-tight sm:text-[38px]">{title}</h1><p className="mt-2 text-sm text-slate-400">{page === "overview" ? "The signals that matter. None of the noise." : page === "watchlist" ? "Follow companies you care about, whether you own them or not." : "A focused digest, tailored to the stocks you follow."}</p></div><button onClick={() => {setPage("watchlist");setOpen(true);}} className="rounded-xl bg-[#83e3cd] px-4 py-3 text-sm font-bold text-[#112039] transition hover:bg-[#b5f4e5]">＋ Add stock</button></div>
        {page === "overview" && <>
          <div className="mb-7 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#172338] p-5"><div className="text-xs text-slate-400">☆ &nbsp; Following</div><div className="mt-3 text-3xl font-semibold">{watchlist.length} <span className="text-sm font-normal text-slate-400">stocks</span></div><p className="mt-3 text-xs text-slate-500">Your research universe</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#172338] p-5"><div className="text-xs text-slate-400">◉ &nbsp; High-priority samples</div><div className="mt-3 text-3xl font-semibold">{related.filter(s => s.score >= 80).length} <span className="text-sm font-normal text-slate-400">updates</span></div><p className="mt-3 text-xs text-slate-500">Illustrative importance 80+</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#172338] p-5"><div className="text-xs text-slate-400">✧ &nbsp; Daily briefing</div><div className="mt-3 text-2xl font-semibold text-[#8debd6]">Preview ready</div><p className="mt-3 text-xs text-slate-500">Personalized sample summary</p></div>
          </div>
          <div className="mb-8 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#172338]"><div className="flex items-center justify-between border-b border-white/10 px-5 py-5"><div><h2 className="font-semibold">My watchlist</h2><p className="mt-1 text-xs text-slate-500">Illustrative prices · Not live</p></div><button onClick={() => setPage("watchlist")} className="text-xs font-semibold text-[#8be7d2]">View all →</button></div>
              {followed.slice(0,5).map(s => <button key={s.ticker} onClick={() => {setSelected(s.ticker);setPage("watchlist");}} className="flex w-full items-center gap-3 border-b border-white/5 px-5 py-3.5 text-left hover:bg-white/[.035]"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#293d55] text-[11px] font-bold text-[#b7f4e5]">{s.ticker.slice(0,2)}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{s.ticker}</div><div className="truncate text-xs text-slate-500">{s.name}</div></div><div className="hidden sm:block"><Movement stock={s}/></div><div className="min-w-[86px] text-right"><div className="text-sm font-semibold">{"$" + s.price.toFixed(2)}</div><div className={"mt-1 text-xs " + (s.change >= 0 ? "text-emerald-300" : "text-rose-300")}>{s.change > 0 ? "+" : ""}{s.change.toFixed(2)}%</div></div></button>)}
              {followed.length === 0 && <p className="p-6 text-sm text-slate-400">Add some stocks to get started.</p>}
            </section>
            <section className="flex flex-col rounded-2xl border border-[#315857] bg-[linear-gradient(145deg,#183b43,#172338)] p-6"><div className="mb-8 flex items-center justify-between"><span className="text-sm font-semibold text-[#b1f6e6]">✧ &nbsp; Your daily brief</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs">Demo</span></div><h2 className="text-2xl font-semibold leading-snug">Less scrolling.<br/>More understanding.</h2><p className="mt-4 text-sm leading-7 text-slate-300">A curated research summary for the companies you follow — not just a wall of headlines.</p><button onClick={() => setPage("brief")} className="mt-auto pt-9 text-left text-sm font-semibold text-[#b5f5e6]">Open today&apos;s brief ↗</button></section>
          </div>
          <div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold">Worth your attention</h2><p className="mt-1 text-xs text-slate-500">Hypothetical events prioritized for your watchlist</p></div><button onClick={() => setPage("brief")} className="text-xs font-semibold text-[#8be7d2]">See all →</button></div>
          <div className="grid gap-4 lg:grid-cols-3">{related.slice(0,3).map(s => <StoryCard key={s.ticker} story={s}/>)}</div>
        </>}
        {page === "watchlist" && <>
          <section className="mb-6 rounded-2xl border border-white/10 bg-[#172338] p-5 sm:p-7"><div className="mb-4"><h2 className="text-lg font-semibold">Following {watchlist.length} companies</h2><p className="mt-1 text-xs text-slate-500">Watchlist entries do not mean these stocks are owned.</p></div>
            {followed.map(s => <div key={s.ticker} className="flex flex-wrap items-center gap-3 border-t border-white/10 py-4"><button onClick={() => setSelected(s.ticker)} className={"grid h-11 w-11 place-items-center rounded-xl text-xs font-bold " + (selected === s.ticker ? "bg-[#83e3cd] text-[#112039]" : "bg-[#293d55]")}>{s.ticker.slice(0,2)}</button><button onClick={() => setSelected(s.ticker)} className="min-w-[130px] flex-1 text-left"><div className="text-sm font-bold">{s.ticker} <span className="ml-2 font-normal text-slate-400">{s.name}</span></div><p className="mt-1 text-xs text-slate-500">{s.sector}</p></button><div className="hidden sm:block"><Movement stock={s}/></div><div className="min-w-[88px] text-right"><div className="text-sm font-semibold">{"$" + s.price.toFixed(2)}</div><div className={"text-xs " + (s.change >= 0 ? "text-emerald-300" : "text-rose-300")}>{s.change > 0 ? "+" : ""}{s.change.toFixed(2)}%</div></div><button onClick={() => remove(s.ticker)} aria-label={"Remove " + s.ticker} title="Remove stock" className="rounded-lg p-2 text-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-300">×</button></div>)}
            {followed.length === 0 && <p className="py-6 text-sm text-slate-400">Your list is empty. Add a stock to begin.</p>}
          </section>
          {followed.some(s => s.ticker === selected) && <div className="rounded-2xl border border-white/10 bg-[#172338] p-6"><div className="text-xs font-semibold tracking-widest text-[#8debd6]">SELECTED COMPANY</div><h3 className="mt-3 text-xl font-semibold">{catalogue.find(s => s.ticker === selected)?.name} <span className="text-sm font-normal text-slate-400">({selected})</span></h3><p className="mt-3 text-sm leading-6 text-slate-400">Verified fundamentals and company reports will be added later. Sample numbers shown here should never be used for investing.</p></div>}
        </>}
        {page === "brief" && <>
          <section className="mb-6 rounded-2xl border border-[#315857] bg-[linear-gradient(130deg,#193f42,#172338)] p-7"><div className="text-xs font-semibold tracking-widest text-[#aaf2e2]">✧ &nbsp; PERSONALIZED BRIEF · DEMO</div><h2 className="mt-4 text-2xl font-semibold leading-snug sm:text-3xl">The important things,<br/>in one place.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">These are fictional examples associated with your watchlist. News feeds, AI summaries and notifications will be integrated later.</p><div className="mt-5 flex gap-2 text-xs"><span className="rounded-full bg-white/10 px-3 py-1.5">{watchlist.length} stocks</span><span className="rounded-full bg-white/10 px-3 py-1.5">{related.length} sample events</span></div></section>
          <section className="mb-6 rounded-2xl border border-white/10 bg-[#172338] p-5"><h3 className="font-semibold">Notification preferences · Prototype</h3><p className="my-2 text-xs text-slate-500">These buttons only demonstrate the interface. No alerts are sent.</p><div className="mt-4 flex flex-wrap gap-2">{["All updates","Major updates","Daily digest only"].map(mode => <button key={mode} onClick={() => setAlertMode(mode)} className={"rounded-full border px-4 py-2 text-xs " + (alertMode === mode ? "border-emerald-300 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-slate-400")}>{mode}</button>)}</div></section>
          <h2 className="mb-4 text-lg font-semibold">Your sample updates</h2><div className="grid gap-4 lg:grid-cols-2">{related.map(s => <StoryCard key={s.ticker} story={s}/>)}</div>
        </>}
        <footer className="mt-12 border-t border-white/10 pt-6 text-xs leading-6 text-slate-500">SEE Portfolio · Prototype v0.1 · Financial figures and news are fictional placeholders, not investment advice.</footer>
      </main>
    </div>
    {open && <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#060c17]/85 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={e => {if (e.target === e.currentTarget) setOpen(false);}}><div role="dialog" aria-modal="true" aria-label="Add stock" className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#19263b] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Add to watchlist</h2><p className="mt-1 text-xs text-slate-400">Search the available sample tickers.</p></div><button onClick={() => setOpen(false)} aria-label="Close" className="text-2xl text-slate-400">×</button></div><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search symbol or company..." className="mb-3 w-full rounded-xl border border-white/15 bg-[#0d192a] px-4 py-3 text-sm outline-none focus:border-emerald-300"/><div className="max-h-72 overflow-y-auto">{suggestions.map(s => <button key={s.ticker} onClick={() => add(s.ticker)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-white/5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2a4057] text-xs font-bold text-emerald-200">{s.ticker.slice(0,2)}</span><span className="flex-1"><span className="block text-sm font-semibold">{s.ticker}</span><span className="text-xs text-slate-400">{s.name}</span></span><span className="text-emerald-200">＋</span></button>)}{suggestions.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No more matching sample stocks.</p>}</div></div></div>}
  </div>;
}
