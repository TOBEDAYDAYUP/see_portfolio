"use client";

import { useEffect, useState } from "react";
import type { AlpacaPortfolioResult, AlpacaPosition, PortfolioHistoryPoint } from "../../../lib/alpaca/types";
import type { Currency, Page } from "../../../types/app";

type Props = { currency: Currency; onSettings: () => void };
type Result = AlpacaPortfolioResult | null;
const dollar = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" :
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const decimal = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" :
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : (value > 0 ? "+" : "") + (value * 100).toFixed(2) + "%";

async function readPaperPortfolio(signal?: AbortSignal): Promise<AlpacaPortfolioResult> {
  try {
    const response = await fetch("/api/alpaca/portfolio", { cache: "no-store", signal });
    const result: unknown = await response.json();
    if (result && typeof result === "object" && "status" in result &&
        (result.status === "connected" || result.status === "not_configured" || result.status === "error")) {
      return result as AlpacaPortfolioResult;
    }
    return { status: "error", code: "unavailable", message: "Unexpected response from local Alpaca API." };
  } catch {
    return { status: "error", code: "unavailable", message: "Could not reach the local Alpaca API." };
  }
}

function HistoryChart({points}:{points:PortfolioHistoryPoint[]}) {
  if (points.length < 2) return <p className="py-10 text-center text-sm text-slate-400">Not enough account history is available to draw a chart.</p>;
  const width=800, height=230, left=75, right=16, top=20, bottom=36;
  const values=points.map(p=>p.equity);
  const min=Math.min(...values), max=Math.max(...values);
  const pad=Math.max((max-min)*0.12, max*0.01, 1);
  const low=min-pad, high=max+pad;
  const coords=values.map((v,i)=>({
    x:left+(i/(values.length-1))*(width-left-right),
    y:top+(1-(v-low)/(high-low))*(height-top-bottom),
  }));
  const pointString=coords.map(p=>p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
  const areaString=left+","+(height-bottom)+" "+pointString+" "+coords[coords.length-1].x.toFixed(1)+","+(height-bottom);
  const first=points[0], last=points[points.length-1];
  return <div className="mt-4 overflow-x-auto">
    <svg viewBox={"0 0 "+width+" "+height} role="img" aria-label="Alpaca paper account equity history for the last month" className="min-w-[460px] w-full">
      <defs><linearGradient id="paperHistoryArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#42bdb2" stopOpacity="0.31"/>
        <stop offset="100%" stopColor="#42bdb2" stopOpacity="0.01"/>
      </linearGradient></defs>
      {[0,0.5,1].map((ratio,i)=>{
        const y=top+ratio*(height-top-bottom);
        return <g key={i}><line x1={left} y1={y} x2={width-right} y2={y} stroke="#7790a4" strokeOpacity=".3" strokeDasharray="4 6"/><text x={left-10} y={y+4} textAnchor="end" fontSize="11" fill="#9aaabc">{dollar(high-(high-low)*ratio)}</text></g>;
      })}
      <polygon points={areaString} fill="url(#paperHistoryArea)"/>
      <polyline points={pointString} fill="none" stroke="#4ac8b7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={coords[coords.length-1].x} cy={coords[coords.length-1].y} r="4.5" fill="#77dfd0"/>
      <text x={left} y={height-7} fontSize="12" fill="#94a3b8">{new Date(first.timestamp*1000).toLocaleDateString("en-CA",{month:"short",day:"numeric"})}</text>
      <text x={width-right} y={height-7} textAnchor="end" fontSize="12" fill="#94a3b8">{new Date(last.timestamp*1000).toLocaleDateString("en-CA",{month:"short",day:"numeric"})}</text>
    </svg>
  </div>;
}

function PositionsTable({positions}:{positions:AlpacaPosition[]}) {
  if(positions.length===0) return <div className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-8 text-center">
    <h3 className="font-semibold">No open paper positions</h3>
    <p className="mt-2 text-sm text-slate-400">Your Alpaca account has no current holdings. This is real account data, not a demo list.</p>
  </div>;
  return <section className="rounded-2xl border border-white/10 bg-[#172338] surface-panel overflow-hidden">
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
      <div><h2 className="font-semibold">Open positions <span className="ml-1 text-xs text-slate-400">({positions.length})</span></h2><p className="mt-1 text-xs text-slate-500">Data provided by Alpaca Paper Trading</p></div>
      <span className="text-xs text-slate-400">USD</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[930px] text-left text-sm">
        <thead className="surface-table-head text-xs text-slate-400">
          <tr>{["Symbol","Quantity","Avg. cost","Last price","Market value","Unrealized P/L","P/L %","Today"].map(t=><th key={t} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{t}</th>)}</tr>
        </thead>
        <tbody>{positions.map(p=><tr key={p.symbol} className="border-t border-white/10">
          <td className="px-4 py-4"><strong>{p.symbol}</strong>{p.side==="short"&&<span className="ml-2 text-xs text-amber-300">SHORT</span>}<span className="mt-1 block text-xs text-slate-500">{p.assetClass.replaceAll("_"," ")}</span></td>
          <td className="px-4 py-4 tabular-nums">{decimal(p.qty)}</td>
          <td className="px-4 py-4 tabular-nums">{dollar(p.avgEntryPrice)}</td>
          <td className="px-4 py-4 tabular-nums">{dollar(p.currentPrice)}</td>
          <td className="px-4 py-4 tabular-nums">{dollar(p.marketValue)}</td>
          <td className={"px-4 py-4 tabular-nums "+(p.unrealizedPl!==null&&p.unrealizedPl<0?"text-rose-300":"text-emerald-300")}>{dollar(p.unrealizedPl)}</td>
          <td className={"px-4 py-4 tabular-nums "+(p.unrealizedPlPct!==null&&p.unrealizedPlPct<0?"text-rose-300":"text-emerald-300")}>{percent(p.unrealizedPlPct)}</td>
          <td className={"px-4 py-4 tabular-nums "+(p.changeTodayPct!==null&&p.changeTodayPct<0?"text-rose-300":"text-emerald-300")}>{percent(p.changeTodayPct)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
export default function AlpacaPortfolio({currency,onSettings}:Props) {
  const [data,setData]=useState<Result>(null);
  const [refreshing,setRefreshing]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    void readPaperPortfolio(controller.signal).then(result=>{if(!controller.signal.aborted)setData(result);});
    return ()=>controller.abort();
  },[]);
  const refresh=()=>{
    setRefreshing(true);
    void readPaperPortfolio().then(setData).finally(()=>setRefreshing(false));
  };
  if(!data) return <div className="surface-panel rounded-2xl p-8 text-sm text-slate-400" role="status">Loading Alpaca Paper Trading account…</div>;
  if(data.status==="not_configured") return <div className="surface-panel rounded-2xl border border-amber-400/20 p-7">
    <h2 className="text-xl font-semibold">Connect your Alpaca Paper account</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">The read-only integration is ready, but your local API credentials have not been configured. Add them to <code>.env.local</code>, restart the Next.js server, then refresh.</p>
    <div className="mt-5 flex flex-wrap gap-3"><button onClick={onSettings} className="rounded-xl bg-[#83e3cd] px-4 py-2 text-sm font-semibold text-[#102139]">Open Settings → Connection</button><button onClick={refresh} disabled={refreshing} className="rounded-xl border border-white/15 px-4 py-2 text-sm">{refreshing?"Checking…":"Retry connection"}</button></div>
  </div>;
  if(data.status==="error") return <div className="surface-panel rounded-2xl border border-rose-400/20 p-7">
    <h2 className="text-xl font-semibold">Alpaca connection unavailable</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{data.message}</p>
    <div className="mt-5 flex gap-3"><button onClick={refresh} disabled={refreshing} className="rounded-xl bg-[#83e3cd] px-4 py-2 text-sm font-semibold text-[#102139]">{refreshing?"Checking…":"Retry"}</button><button onClick={onSettings} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Connection settings</button></div>
  </div>;

  const stats=[
    {label:"Account equity",value:dollar(data.account.equity)},
    {label:"Cash",value:dollar(data.account.cash)},
    {label:"Buying power",value:dollar(data.account.buyingPower)},
    {label:"Previous equity",value:dollar(data.account.lastEquity)},
  ];
  return <div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><span className="surface-pill rounded-full px-3 py-1.5 text-xs font-semibold">● Connected · Alpaca Paper</span><p className="mt-2 text-xs text-slate-500">Read-only · Account: {data.account.status || "unknown"} · Updated {new Date(data.fetchedAt).toLocaleTimeString("en-CA")}</p></div>
      <button disabled={refreshing} onClick={refresh} className="rounded-xl border border-white/15 bg-[#28384d] px-4 py-2.5 text-xs font-semibold text-slate-200">{refreshing?"Refreshing…":"↻ Refresh from Alpaca"}</button>
    </div>
    {currency==="CNY"&&<div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">Your display preference is CNY, but real Alpaca balances are shown in their original USD. We will not use a fictional exchange rate for live account data.</div>}
    <div className="mb-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">{stats.map(stat=><div key={stat.label} className="surface-panel rounded-2xl p-5"><p className="text-sm text-slate-400">{stat.label}</p><strong className="mt-2 block text-2xl font-semibold tabular-nums">{stat.value}</strong></div>)}</div>
    <section className="surface-panel mb-5 rounded-2xl p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Portfolio equity · last month</h2><p className="mt-1 text-xs text-slate-500">Actual Alpaca paper-account equity snapshots</p></div><span className="text-xs text-slate-400">1M · 1D</span></div>
      {data.historyAvailable?<HistoryChart points={data.history}/>:<p className="mt-8 text-sm text-slate-400">Historical equity is unavailable from Alpaca right now. Holdings and balances still reflect the account.</p>}
    </section>
    <PositionsTable positions={data.positions}/>
    <p className="mt-5 text-xs leading-5 text-slate-500">Paper trading is simulated. Account balances and holdings come from Alpaca, not from the fictional demo portfolio. Market valuations reflect Alpaca&apos;s reported pricing and may be delayed.</p>
  </div>;
}
