"use client";
import {useState} from "react";

export type PortfolioSection = "holdings"|"analysis"|"valuations"|"dividends"|"returns"|"updates";
type Holding={ticker:string,name:string,price:number,fair:number,day:number,gain:number,value:number,cost:number};
const holdings:Holding[]=[
{ticker:"NVDA",name:"NVIDIA",price:184.25,fair:201.4,day:2.34,gain:155.6,value:53780,cost:21040},
{ticker:"MSFT",name:"Microsoft",price:519.36,fair:568.5,day:1.18,gain:82.9,value:48120,cost:26310},
{ticker:"AAPL",name:"Apple",price:251.8,fair:262.3,day:-0.71,gain:48.5,value:38640,cost:26020},
{ticker:"META",name:"Meta Platforms",price:641.19,fair:715.8,day:2.0,gain:270.7,value:53084,cost:14336},
{ticker:"GOOGL",name:"Alphabet",price:205.62,fair:224.1,day:0.86,gain:93.4,value:46780,cost:24188},
{ticker:"AMZN",name:"Amazon",price:232.15,fair:243.9,day:0.39,gain:62.8,value:43210,cost:26542},
{ticker:"TSLA",name:"Tesla",price:326.14,fair:310,day:-1.42,gain:-12.3,value:32475,cost:37030},
];
const labels:Record<PortfolioSection,string>={
holdings:"",
analysis:"Risk, concentration and diversification",
valuations:"Fair-value scenarios and assumptions",
dividends:"Distribution history and future income",
returns:"Performance, contribution and benchmarks",
updates:"Research events that affect your holdings",
};
const money=(v:number,currency:"USD"|"CNY")=>(currency==="CNY"?"¥":"US$")+Math.round(Math.abs(v)*(currency==="CNY"?7.20:1)).toLocaleString("en-US");
const pct=(v:number)=>(v>0?"+":"")+v.toFixed(1)+"%";
const ranges=["1M","3M","YTD","1Y","2Y","All"];
function DemoChart({range,combined,currency}:{range:string,combined:boolean,currency:"USD"|"CNY"}){
 const factor=({ "1M":.28,"3M":.43,"YTD":.55,"1Y":.68,"2Y":.85,"All":1 } as Record<string,number>)[range]||1;
 const count=52;
 const values=Array.from({length:count},(_,i)=>{
   const t=i/(count-1);
   const v=14+factor*(Math.pow(t,2.3)*164-24*Math.exp(-Math.pow((t-.67)/.08,2))+(Math.sin(i*1.7)*5+Math.sin(i*.63)*4)*(.2+t));
   return {x:52+t*700,y:237-Math.max(5,v)};
 });
 const top=(scale:number)=>values.map((p,i)=>(i?"L ":"M ")+p.x.toFixed(1)+" "+(237-(237-p.y)*scale).toFixed(1)).join(" ");
 const shape=(upper:number,lower:number)=>top(upper)+" "+values.slice().reverse().map(p=>"L "+p.x.toFixed(1)+" "+(237-(237-p.y)*lower).toFixed(1)).join(" ")+" Z";
 return <div className="mt-3 overflow-x-auto"><svg viewBox="0 0 800 285" className="min-w-[450px] w-full" role="img" aria-label="Fictional portfolio performance chart">
  <defs><linearGradient id="seeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#66dada" stopOpacity=".4"/><stop offset="100%" stopColor="#66dada" stopOpacity=".02"/></linearGradient></defs>
  {[55,101,146,192,237].map((y,i)=><g key={i}><line x1="52" x2="752" y1={y} y2={y} stroke="#53637a" strokeOpacity=".28" strokeDasharray="4 5"/><text x="44" y={y+4} textAnchor="end" fill="#8793a7" fontSize="11">{(currency==="CNY"?["¥2.88m","¥2.16m","¥1.44m","¥720k","¥0"]:["$400k","$300k","$200k","$100k","$0"])[i]}</text></g>)}
  {combined?<><path d={shape(1,0)} fill="url(#seeFill)"/><path d={top(1)} stroke="#72dcda" fill="none" strokeWidth="3"/></>:<><path d={shape(.44,0)} fill="#a98b5c"/><path d={shape(.67,.44)} fill="#b387c7"/><path d={shape(.84,.67)} fill="#5fcfb6"/><path d={shape(1,.84)} fill="#55a6db"/></>}
  {["2016","2018","2020","2022","2024","2026"].map((y,i)=><text key={y} x={82+i*132} y="275" textAnchor="middle" fill="#8d9aac" fontSize="12">{range==="All"?y:i===0?"Earlier":i===5?"Now":""}</text>)}
 </svg></div>;
}
function Soon({section}:{section:PortfolioSection}){
 return <><section className="rounded-2xl border border-[#395765] bg-[linear-gradient(130deg,#1a3647,#172338)] glass-feature glass-refract p-8">
 <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 glass-pill px-3 py-1 text-xs font-semibold text-emerald-200">UNDER DEVELOPMENT</span>
 <h2 className="mt-5 text-2xl font-semibold">{section.charAt(0).toUpperCase()+section.slice(1)}</h2>
 <p className="mt-3 text-sm text-slate-300">{labels[section]}. This research section will receive data and analysis models later.</p></section>
 <div className="mt-5 grid gap-4 md:grid-cols-3">{["Summary","Visual analysis","Research detail"].map((t,i)=><div key={t} className="rounded-2xl border border-white/10 bg-[#172338] glass-panel p-6"><h3 className="font-semibold">{t}</h3><div className="mt-7 h-3 w-4/5 rounded-full bg-[#293c52]"/><div className="mt-3 h-3 w-1/2 rounded-full bg-[#293c52]"/><div className="mt-5 h-24 rounded-xl border border-dashed border-[#40516b] bg-[#122035]"/><p className="mt-4 text-xs text-slate-500">Module {i+1} · Planned</p></div>)}</div></>;
}
export default function PortfolioDashboard({section,currency="USD"}:{section:PortfolioSection,currency?:"USD"|"CNY"}){
 const [range,setRange]=useState("All");
 const [combined,setCombined]=useState(false);
 const [selected,setSelected]=useState("META");
 const [tab,setTab]=useState("Overview");
 const [notice,setNotice]=useState("");
 const active=holdings.find(h=>h.ticker===selected)||holdings[0];
 const format=(value:number)=>money(value,currency);
 const price=(value:number)=>(currency==="CNY"?"¥":"$")+(value*(currency==="CNY"?7.20:1)).toFixed(2);
 return <div>
  <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#87e5d1]">PORTFOLIO WORKSPACE</p><h1 className="text-3xl font-semibold sm:text-[38px]">My Portfolio</h1>{section !== "holdings" && <p className="mt-2 text-sm text-slate-400">{labels[section]}</p>}</div><span className="rounded-full border border-white/10 bg-[#253449] glass-pill px-3 py-2 text-xs text-slate-300">{currency==="CNY"?"Sample FX: 1 USD = 7.20 CNY":"Simulated data only"}</span></div>
  {section!=="holdings"?<Soon section={section}/>:<>
   <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Holdings overview</h2><p className="mt-1 text-xs text-slate-500">Your investments, simply organized</p></div><div className="flex gap-2"><button onClick={()=>setNotice("Transaction entry is under development.")} className="rounded-xl bg-[#83e3cd] px-4 py-2.5 text-xs font-bold text-[#122239]">＋ Add transaction</button><button onClick={()=>setNotice("Holdings editing is under development.")} className="rounded-xl border border-white/10 bg-[#28384d] px-3 py-2.5 text-xs text-slate-200">Edit holdings</button></div></div>
   {notice&&<div role="status" className="mb-4 flex justify-between rounded-xl bg-[#1e423f] px-4 py-3 text-sm text-emerald-100"><span>{notice}</span><button aria-label="Dismiss notice" onClick={()=>setNotice("")}>×</button></div>}
   <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(275px,1fr)]">
    <section className="min-w-0 rounded-2xl border border-white/10 bg-[#172338] glass-panel glass-refract p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Portfolio value over time</h2><p className="mt-1 text-xs text-slate-500">Illustrative historical performance</p></div><span className="rounded-full bg-emerald-300/10 glass-pill px-3 py-1 text-[11px] font-semibold text-emerald-200">SAMPLE</span></div>
    <div className="mt-5 grid grid-cols-2 gap-4 border-b border-white/10 pb-5 sm:grid-cols-4">{[["Total value",format(374575),"7 holdings"],["Today's return","-"+format(1024),"-0.3%"],["Total returns",format(285626),"+129.6%"],["Annualized","22.6%","Illustrative IRR"]].map(row=><div key={row[0]}><p className="text-xs text-slate-500">{row[0]}</p><strong className="mt-1 block text-lg">{row[1]}</strong><small className="text-slate-400">{row[2]}</small></div>)}</div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-3 text-[11px] text-slate-400"><span>● Portfolio value</span><span>● Cost basis</span></div><div className="flex gap-1">{ranges.map(r=><button key={r} aria-pressed={range===r} onClick={()=>setRange(r)} className={"rounded-md px-2 py-1.5 text-xs "+(range===r?"bg-[#34485d] text-emerald-200":"text-slate-400 hover:bg-white/5")}>{r}</button>)}</div></div>
    <DemoChart range={range} combined={combined} currency={currency}/><div className="mt-2 flex gap-2 border-t border-white/10 pt-4">{["Stacked","Combined"].map(m=><button key={m} onClick={()=>setCombined(m==="Combined")} className={"rounded-lg px-3 py-2 text-xs "+(combined===(m==="Combined")?"bg-[#34485d] text-slate-100":"text-slate-400 hover:bg-white/5")}>{m}</button>)}<span className="ml-auto self-center text-[11px] text-slate-500">Sample chart</span></div>
    </section>
    <section className="flex min-h-[385px] flex-col rounded-2xl border border-white/10 bg-[#172338] glass-panel glass-refract p-5 sm:p-6"><h2 className="font-semibold">Portfolio health analysis</h2><p className="mt-1 text-xs text-slate-500">Reserved visualization</p><div className="relative mx-auto my-auto w-full max-w-[235px]"><svg viewBox="0 0 240 240" className="w-full" role="img" aria-label="Empty five-axis chart placeholder"><g transform="translate(120 120)" fill="none" stroke="#455b70">{[35,58,80].map(r=><polygon key={r} points={Array.from({length:5},(_,i)=>{const a=(-90+i*72)*Math.PI/180;return (Math.cos(a)*r).toFixed(1)+","+(Math.sin(a)*r).toFixed(1)}).join(" ")}/>)}{Array.from({length:5},(_,i)=>{const a=(-90+i*72)*Math.PI/180;return <line key={i} x1="0" y1="0" x2={Math.cos(a)*80} y2={Math.sin(a)*80}/>})}</g></svg><div className="absolute inset-0 flex items-center justify-center"><span className="rounded-xl border border-[#4b7970] bg-[#1d3c44] px-4 py-2 text-center text-xs font-semibold text-emerald-100">UNDER DEVELOPMENT</span></div></div><p className="text-sm leading-6 text-slate-400">A simple fundamentals and risk visualization will go here. No scoring model is active.</p></section>
   </div>
   <div className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{[["Unrealized returns",format(217087),"+98.5%"],["Realized returns",format(52591),"+23.9%"],["Dividends received",format(16899),"+7.7%"],["Currency impact","-"+format(952),"-0.4%"],["Estimated dividends",format(5154)+"/yr","1.4% yield"]].map((m,i)=><div key={m[0]} className="glass-stat rounded-2xl border border-white/10 bg-[#172338] glass-panel p-4"><p className="text-xs text-slate-400">{m[0]}</p><strong className="mt-2 block whitespace-nowrap text-lg">{m[1]}</strong><span className={"mt-1 block text-xs "+(i===3?"text-rose-300":"text-emerald-300")}>{m[2]} · sample</span></div>)}</div>
   <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(275px,1fr)]">
    <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#172338] glass-panel"><div className="flex items-center justify-between border-b border-white/10 p-5"><div><h2 className="font-semibold">Holdings <span className="rounded-full bg-[#34465c] px-2 py-0.5 text-xs">{holdings.length}</span></h2><p className="mt-1 text-xs text-slate-500">Select a stock to inspect its details</p></div><span className="text-xs text-slate-500">Demo · {currency}</span></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-[#213148] glass-table-head text-slate-400"><tr>{["Symbol","Last price","Fair value","1D change","Total return","Value / Cost"].map((t,i)=><th key={t} className={"px-4 py-4 font-medium "+(i>0?"text-right":"")}>{t}</th>)}</tr></thead><tbody>{holdings.map(h=><tr key={h.ticker} onClick={()=>{setSelected(h.ticker);setTab("Overview");}} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"){setSelected(h.ticker);setTab("Overview");}}} className={"cursor-pointer border-t border-white/[.08] hover:bg-[#294054] focus-visible:bg-[#294054] "+(selected===h.ticker?"bg-[#263d51]":"")}><td className="px-4 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#354c62] font-bold text-emerald-100">{h.ticker.slice(0,2)}</span><span><strong className="block text-sm">{h.ticker}</strong><small className="text-slate-500">{h.name}</small></span></div></td><td className="px-4 py-4 text-right">{price(h.price)}</td><td className="px-4 py-4 text-right">{price(h.fair)}</td><td className={"px-4 py-4 text-right "+(h.day>=0?"text-emerald-300":"text-rose-300")}>{pct(h.day)}</td><td className={"px-4 py-4 text-right font-semibold "+(h.gain>=0?"text-emerald-300":"text-rose-300")}>{pct(h.gain)}</td><td className="px-4 py-4 text-right"><strong>{format(h.value)}</strong><small className="block text-slate-500">{format(h.cost)} cost</small></td></tr>)}</tbody></table></div></section>
    <aside className="self-start rounded-2xl border border-white/10 bg-[#172338] glass-panel glass-refract p-5"><div className="flex items-start justify-between"><div><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#334a62] text-sm font-bold text-emerald-100">{active.ticker.slice(0,2)}</div><h3 className="mt-3 text-lg font-semibold">{active.name}</h3><p className="mt-1 text-xs text-slate-400">{active.ticker} · Demo holding</p></div><span className="rounded-full bg-[#30455a] px-2.5 py-1 text-[11px]">Selected</span></div><div className="mt-5 grid grid-cols-4 gap-1 border-b border-white/10 pb-2">{["Overview","Holding","Updates","Notes"].map(t=><button key={t} onClick={()=>setTab(t)} className={"rounded-lg px-1 py-2 text-[11px] "+(tab===t?"bg-[#31495f] font-semibold text-emerald-200":"text-slate-400 hover:bg-white/5")}>{t}</button>)}</div>{tab==="Overview"?<div className="mt-5 space-y-4 text-sm">{[["Last price",price(active.price)],["Fair value",price(active.fair)],["Total return",pct(active.gain)]].map(x=><div key={x[0]} className="flex justify-between gap-2"><span className="text-slate-400">{x[0]}</span><strong>{x[1]}</strong></div>)}</div>:tab==="Holding"?<div className="mt-5 space-y-4 text-sm">{[["Market value",format(active.value)],["Cost basis",format(active.cost)],["Return",pct(active.gain)]].map(x=><div key={x[0]} className="flex justify-between gap-2"><span className="text-slate-400">{x[0]}</span><strong>{x[1]}</strong></div>)}</div>:<div className="mt-5 rounded-xl border border-dashed border-[#405970] p-5 text-center text-xs"><strong className="text-emerald-200">UNDER DEVELOPMENT</strong><p className="mt-3 text-slate-400">{tab==="Updates"?"Company updates will appear here.":"Personal research notes will appear here."}</p></div>}<p className="mt-6 border-t border-white/10 pt-4 text-[11px] leading-5 text-slate-500">All numbers are fictional placeholders.</p></aside>
   </div>
  </>}
 </div>;
}
