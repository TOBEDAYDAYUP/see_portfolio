"use client";

import { useState } from "react";
import type { Currency } from "../../../types/app";
import { ranges, money } from "../../../lib/demo/portfolio";
import DemoChart from "./performance-chart";

/** Portfolio performance and placeholder health visualization. */
export default function PortfolioOverview({currency}:{currency:Currency}) {
 const [range,setRange]=useState("All");
 const [combined,setCombined]=useState(false);
 const format=(value:number)=>money(value,currency);
 return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(275px,1fr)]">
    <section className="min-w-0 rounded-2xl border border-white/10 bg-[#172338] surface-panel  p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Portfolio value over time</h2><p className="mt-1 text-xs text-slate-500">Illustrative historical performance</p></div><span className="rounded-full bg-emerald-300/10 surface-pill px-3 py-1 text-[11px] font-semibold text-emerald-200">SAMPLE</span></div>
    <div className="mt-5 grid grid-cols-2 gap-4 border-b border-white/10 pb-5 sm:grid-cols-4">{[["Total value",format(374575),"7 holdings"],["Today's return","-"+format(1024),"-0.3%"],["Total returns",format(285626),"+129.6%"],["Annualized","22.6%","Illustrative IRR"]].map(row=><div key={row[0]}><p className="text-xs text-slate-500">{row[0]}</p><strong className="mt-1 block text-lg">{row[1]}</strong><small className="text-slate-400">{row[2]}</small></div>)}</div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-3 text-[11px] text-slate-400"><span>● Portfolio value</span><span>● Cost basis</span></div><div className="flex gap-1">{ranges.map(r=><button key={r} aria-pressed={range===r} onClick={()=>setRange(r)} className={"rounded-md px-2 py-1.5 text-xs "+(range===r?"bg-[#34485d] text-emerald-200":"text-slate-400 hover:bg-white/5")}>{r}</button>)}</div></div>
    <DemoChart range={range} combined={combined} currency={currency}/><div className="mt-2 flex gap-2 border-t border-white/10 pt-4">{["Stacked","Combined"].map(m=><button key={m} onClick={()=>setCombined(m==="Combined")} className={"rounded-lg px-3 py-2 text-xs "+(combined===(m==="Combined")?"bg-[#34485d] text-slate-100":"text-slate-400 hover:bg-white/5")}>{m}</button>)}<span className="ml-auto self-center text-[11px] text-slate-500">Sample chart</span></div>
    </section>
    <section className="flex min-h-[385px] flex-col rounded-2xl border border-white/10 bg-[#172338] surface-panel  p-5 sm:p-6"><h2 className="font-semibold">Portfolio health analysis</h2><p className="mt-1 text-xs text-slate-500">Reserved visualization</p><div className="relative mx-auto my-auto w-full max-w-[235px]"><svg viewBox="0 0 240 240" className="w-full" role="img" aria-label="Empty five-axis chart placeholder"><g transform="translate(120 120)" fill="none" stroke="#455b70">{[35,58,80].map(r=><polygon key={r} points={Array.from({length:5},(_,i)=>{const a=(-90+i*72)*Math.PI/180;return (Math.cos(a)*r).toFixed(1)+","+(Math.sin(a)*r).toFixed(1)}).join(" ")}/>)}{Array.from({length:5},(_,i)=>{const a=(-90+i*72)*Math.PI/180;return <line key={i} x1="0" y1="0" x2={Math.cos(a)*80} y2={Math.sin(a)*80}/>})}</g></svg><div className="absolute inset-0 flex items-center justify-center"><span className="rounded-xl border border-[#4b7970] bg-[#1d3c44] px-4 py-2 text-center text-xs font-semibold text-emerald-100">UNDER DEVELOPMENT</span></div></div><p className="text-sm leading-6 text-slate-400">A simple fundamentals and risk visualization will go here. No scoring model is active.</p></section>
 </div>;
}
