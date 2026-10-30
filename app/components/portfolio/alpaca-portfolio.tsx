"use client";

import { useEffect, useState } from "react";
import type { AlpacaPortfolioResult, AlpacaPosition } from "../../../lib/alpaca/types";
import PortfolioOverview from "./portfolio-overview";
import PortfolioResearchMetrics from "./portfolio-research-metrics";
import type { Currency } from "../../../types/app";

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

  return <div>
    <PortfolioOverview account={data.account} history={data.history} historyAvailable={data.historyAvailable} positionCount={data.positions.length}/>
    <div className="mb-5 mt-7 flex flex-wrap items-center justify-between gap-3">
      <div><span className="surface-pill rounded-full px-3 py-1.5 text-xs font-semibold">● Connected · Alpaca Paper</span><p className="mt-2 text-xs text-slate-500">Read-only · Account: {data.account.status || "unknown"} · Updated {new Date(data.fetchedAt).toLocaleTimeString("en-CA")}</p></div>
      <button disabled={refreshing} onClick={refresh} className="rounded-xl border border-white/15 bg-[#28384d] px-4 py-2.5 text-xs font-semibold text-slate-200">{refreshing?"Refreshing…":"↻ Refresh from Alpaca"}</button>
    </div>
    {currency==="CNY"&&<div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">Your display preference is CNY, but real Alpaca balances are shown in their original USD. We will not use a fictional exchange rate for live account data.</div>}
    <PortfolioResearchMetrics positions={data.positions} annualPerformance={data.annualPerformance}/>
    <PositionsTable positions={data.positions}/>
    <p className="mt-5 text-xs leading-5 text-slate-500">Paper trading is simulated. Balances, the single equity chart and holdings come from Alpaca Paper. Market valuations reflect Alpaca&apos;s reported pricing and may be delayed.</p>
  </div>;
}
