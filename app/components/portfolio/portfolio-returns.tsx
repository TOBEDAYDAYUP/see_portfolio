"use client";

import {useEffect,useState} from "react";
import type {PointerEvent as ReactPointerEvent,KeyboardEvent as ReactKeyboardEvent} from "react";
import type {AlpacaPortfolioResult,AlpacaPosition,PaperHistoryResponse} from "../../../lib/alpaca/types";
import {portfolioHistoryRanges,type PortfolioHistoryRange} from "../../../lib/alpaca/history-range";
import {historyXAxisTickIndices} from "../../../lib/alpaca/history-display";
import {formatHistoryCrosshairTime,nearestHistoryObservation} from "../../../lib/alpaca/history-crosshair";
import {summarizeOpenUnrealized,summarizeReportedPnlMovement,type ReturnsHistoryPoint} from "../../../lib/portfolio/returns";

const usd=(value:number|null)=>value===null?"—":
 new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(value);
const signedUsd=(value:number|null)=>value===null?"—":(value>0?"+":"")+usd(value);
const signedPct=(value:number|null)=>value===null?"—":(value>0?"+":"")+value.toFixed(2)+"%";
const date=(timestamp:number)=>new Date(timestamp*1000).toLocaleDateString("en-CA",{
 month:"short",day:"numeric",year:"2-digit",timeZone:"America/New_York",
});

function ReturnsChart({points,range}:{
 points:ReturnsHistoryPoint[];range:PortfolioHistoryRange;
}){
 const [hover,setHover]=useState<number|null>(null);
 const [pinned,setPinned]=useState<number|null>(null);
 if(points.length<2)return <div role="status" className="grid min-h-[260px] place-items-center text-center text-sm text-slate-400">
  At least two actual Alpaca P/L snapshots are required to draw a trend.
 </div>;
 const W=800,H=320,L=104,R=24,T=30,B=44;
 const base=points[0].profitLossUsd;
 // Show the *difference* in Alpaca's reported P/L from the first observed
 // snapshot, not a made-up total return or a cash-flow adjusted series.
 const changes=points.map(p=>p.profitLossUsd-base);
 const min=Math.min(0,...changes),max=Math.max(0,...changes);
 const padding=Math.max(1,(max-min)*.13);
 const low=min-padding,high=max+padding;
 const coords=changes.map((value,i)=>({
  x:L+i*(W-L-R)/(points.length-1),
  y:T+(high-value)/(high-low)*(H-T-B),
 }));
 const area=coords.map(p=>p.x.toFixed(2)+","+p.y.toFixed(2)).join(" ");
 const zeroY=T+(high-0)/(high-low)*(H-T-B);
 const selection=pinned??hover;
 const active=selection!==null&&selection>=0&&selection<points.length?selection:null;
 const current=active!==null?points[active]:null;
 const currentCoord=active!==null?coords[active]:null;
 const tickIndices=historyXAxisTickIndices(points,range);
 const hit=(event:ReactPointerEvent<SVGSVGElement>)=>{
  const rect=event.currentTarget.getBoundingClientRect();
  if(rect.width===0||rect.height===0)return null;
  return nearestHistoryObservation({
   x:(event.clientX-rect.left)*W/rect.width,
   y:(event.clientY-rect.top)*H/rect.height,
  },coords,24*W/rect.width);
 };
 const keyboard=(event:ReactKeyboardEvent<SVGSVGElement>)=>{
  if(event.key==="Escape"){setHover(null);setPinned(null);return;}
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
  event.preventDefault();
  const old=pinned??hover??points.length-1;
  const next=event.key==="Home"?0:event.key==="End"?points.length-1:
   event.key==="ArrowLeft"?Math.max(0,old-1):Math.min(points.length-1,old+1);
  setPinned(next);setHover(null);
 };
 return <div className="relative mt-4 overflow-visible">
  <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair focus-visible:outline-2 focus-visible:outline-[#4ac8b7]"
   tabIndex={0} role="img"
   aria-label={"Interactive account reported P/L movement, "+range+". Hover or click near the line to inspect recorded observations."}
   onPointerMove={event=>{if(event.pointerType!=="touch"){const i=hit(event);setHover(i);}}}
   onPointerDown={event=>{const i=hit(event);setPinned(old=>old===i?null:i);setHover(i);}}
   onPointerLeave={()=>setHover(null)}
   onKeyDown={keyboard}>
   <defs><linearGradient id="returnsFill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#4ac8b7" stopOpacity=".25"/>
    <stop offset="100%" stopColor="#4ac8b7" stopOpacity=".015"/>
   </linearGradient></defs>
   <rect x={L} y={T} width={W-L-R} height={H-T-B} fill="transparent" pointerEvents="all"/>
   {[0,.5,1].map((r,i)=>{
    const y=T+r*(H-T-B);
    return <g key={i}><line x1={L} x2={W-R} y1={y} y2={y}
     stroke="#8196a5" strokeOpacity=".35" strokeDasharray="4 6"/>
     <text x={L-10} y={y+4} fontSize="11" textAnchor="end" fill="#8295a6">
      {usd(high-r*(high-low))}</text></g>;
   })}
   <line x1={L} x2={W-R} y1={zeroY} y2={zeroY}
    stroke="#8295a6" strokeOpacity=".65" strokeDasharray="2 5"/>
   <polygon points={`${L},${zeroY} ${area} ${coords.at(-1)!.x},${zeroY}`}
    fill="url(#returnsFill)"/>
   <polyline points={area} fill="none" stroke="#43bea9" strokeWidth="2.8"
    strokeLinejoin="round" strokeLinecap="round"/>
   {current&&currentCoord&&<g pointerEvents="none">
    <line x1={currentCoord.x} x2={currentCoord.x} y1={T} y2={H-B}
     stroke="#239f91" strokeDasharray="5 5" opacity=".8"/>
    <line x1={currentCoord.x} x2={W-R} y1={currentCoord.y} y2={currentCoord.y}
     stroke="#239f91" strokeDasharray="5 5" opacity=".8"/>
    <circle cx={currentCoord.x} cy={currentCoord.y} r="5"
     fill="#fff" stroke="#159b8d" strokeWidth="2"/>
   </g>}
   {tickIndices.map((index,i)=><text key={index} x={coords[index].x}
    y={H-11} textAnchor={i===0?"start":i===tickIndices.length-1?"end":"middle"}
    fontSize="12" fill="#879aaf">{date(points[index].timestamp)}</text>)}
  </svg>
  {current&&currentCoord&&<>
   <div className="chart-inspector-label chart-inspector-date pointer-events-none absolute z-50"
    style={{left:(currentCoord.x/W*100)+"%"}}>
    {formatHistoryCrosshairTime(current.timestamp)}
   </div>
   <div className="chart-inspector-label chart-inspector-value pointer-events-none absolute z-50"
    style={{left:((W-R)/W*100)+"%",top:(currentCoord.y/H*100)+"%"}}>
    {signedUsd(current.profitLossUsd-base)}
   </div>
  </>}
  {pinned!==null&&points[pinned]&&<p className="sr-only" aria-live="polite">
   {date(points[pinned].timestamp)}: reported P/L movement {signedUsd(changes[pinned])}.
  </p>}
 </div>;
}

function Figure({title,value,note}:{title:string;value:string;note:string}){
 return <div className="surface-panel rounded-xl p-4">
  <p className="text-xs text-slate-400">{title}</p>
  <strong className="mt-2 block text-xl font-semibold tabular-nums">{value}</strong>
  <p className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p>
 </div>;
}
function PositionReturnsTable({positions}:{positions:AlpacaPosition[]}){
 return <section className="surface-panel mt-5 rounded-2xl p-5 sm:p-7">
  <h2 className="text-lg font-semibold">Open positions · unrealized P/L</h2>
  <p className="mt-1 text-xs text-slate-400">Alpaca Paper open positions only · updated on refresh</p>
  {!positions.length?<p role="status" className="mt-5 rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
   No open positions have been reported yet. Your first filled trade will appear here after Alpaca updates your account.
  </p>:
  <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
   <thead className="surface-table-head text-xs text-slate-400">
    <tr>{["Symbol","Quantity","Cost basis","Market value","Unrealized P/L","P/L %"].map(x=>
     <th key={x} className="px-4 py-3 font-medium">{x}</th>)}</tr>
   </thead>
   <tbody>{positions.map(p=><tr key={p.symbol} className="border-t border-white/10">
    <td className="px-4 py-3 font-semibold">{p.symbol}{p.side==="short"?" · SHORT":""}</td>
    <td className="px-4 py-3 tabular-nums">{p.qty===null?"—":p.qty.toLocaleString("en-US")}</td>
    <td className="px-4 py-3 tabular-nums">{usd(p.costBasis)}</td>
    <td className="px-4 py-3 tabular-nums">{usd(p.marketValue)}</td>
    <td className={"px-4 py-3 tabular-nums "+(p.unrealizedPl!==null&&p.unrealizedPl<0?"text-rose-300":"text-emerald-300")}>
     {signedUsd(p.unrealizedPl)}</td>
    <td className="px-4 py-3 tabular-nums">{signedPct(p.unrealizedPlPct===null?null:100*p.unrealizedPlPct)}</td>
   </tr>)}</tbody>
  </table></div>}
 </section>;
}

export default function PortfolioReturns({onSettings}:{onSettings:()=>void}){
 const [range,setRange]=useState<PortfolioHistoryRange>("1M");
 const [refresh,setRefresh]=useState(0);
 const [account,setAccount]=useState<AlpacaPortfolioResult|null>(null);
 const [history,setHistory]=useState<PaperHistoryResponse|null>(null);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  const controller=new AbortController();
  void (async()=>{
   try{
    const [accountResponse,historyResponse]=await Promise.all([
     fetch("/api/alpaca/portfolio",{cache:"no-store",signal:controller.signal}),
     fetch("/api/alpaca/portfolio/history?range="+range,{cache:"no-store",signal:controller.signal}),
    ]);
    const accountJson=await accountResponse.json() as AlpacaPortfolioResult;
    const historyJson=await historyResponse.json() as PaperHistoryResponse;
    if(controller.signal.aborted)return;
    setAccount(accountJson);
    setHistory(historyJson);
   }catch{
    if(!controller.signal.aborted){
     setAccount({status:"error",code:"unavailable",message:"Could not load local Alpaca account data. Check your dev server."});
     setHistory({status:"error",message:"Unable to load Alpaca P/L history."});
    }
   }finally{if(!controller.signal.aborted)setLoading(false);}
  })();
  return ()=>controller.abort();
 },[range,refresh]);
 const choose=(next:PortfolioHistoryRange)=>{
  if(next===range)return;
  setRange(next);setLoading(true);setHistory(null);
 };
 const retry=()=>{setLoading(true);setRefresh(v=>v+1);};
 const positions=account?.status==="connected"?account.positions:[];
 const unrealized=summarizeOpenUnrealized(positions);
 const profitPoints=history?.status==="ok"?history.pnlPoints:[];
 const movement=summarizeReportedPnlMovement(profitPoints);
 return <div>
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="text-xl font-semibold">Returns &amp; Profit/Loss</h2>
    <p className="mt-1 text-sm text-slate-400">Alpaca Paper · actual historical account P/L and open-position returns</p></div>
   <button type="button" onClick={retry} disabled={loading}
    className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50">
    {loading?"Refreshing…":"↻ Refresh from Alpaca"}
   </button>
  </div>
  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Figure title="Account equity" value={account?.status==="connected"?usd(account.account.equity):"—"}
    note="Current Alpaca Paper account balance · not investment profit"/>
   <Figure title="Open unrealized P/L" value={account?.status==="connected"?signedUsd(unrealized.unrealizedUsd):"—"}
    note="Sum of Alpaca's reported unrealized P/L for current positions"/>
   <Figure title="Reported P/L movement" value={movement?signedUsd(movement.changeUsd):"—"}
    note="Difference between first and last available P/L snapshots in this view"/>
   <Figure title="P/L movement / starting equity" value={movement?signedPct(movement.changePctOfOpeningEquity):"—"}
    note="Diagnostic ratio, NOT time-weighted or cash-flow-adjusted return"/>
  </div>
  {account?.status==="not_configured"&&<div className="surface-panel mt-5 rounded-xl p-5 text-sm">
   No Alpaca Paper credentials found in the local environment.
   <button className="ml-3 underline" onClick={onSettings}>Open connection settings</button>
  </div>}
  {account?.status==="error"&&<p role="alert" className="mt-5 rounded-xl border border-amber-400/25 p-4 text-sm text-amber-200">
   {account.message}</p>}
  <section className="surface-panel mt-5 overflow-visible rounded-2xl p-5 sm:p-7">
   <div className="flex flex-wrap items-center justify-between gap-4">
    <div><h3 className="text-lg font-semibold">Historical P/L movement</h3>
     <p className="mt-1 text-xs text-slate-400">Alpaca-reported P/L differences · real observations only · USD</p></div>
    <div className="flex flex-wrap gap-1" role="group" aria-label="Returns history period">
     {portfolioHistoryRanges.map(item=><button key={item} type="button"
      aria-pressed={range===item} onClick={()=>choose(item)}
      className={"rounded-lg px-3 py-2 text-xs font-semibold "+(range===item?"bg-[#83e3cd] text-[#102139]":"text-slate-400 hover:bg-white/10 hover:text-slate-100")}>
      {item}</button>)}
    </div>
   </div>
   {history?.status==="ok"&&movement&&<p className="mt-3 text-[11px] text-slate-500">
    Observed: {date(movement.firstTimestamp)} – {date(movement.lastTimestamp)}
    {" · "+movement.observations+" verified P/L snapshots · "+history.resolution}
   </p>}
   {loading?<div role="status" className="grid min-h-[260px] place-items-center text-sm text-slate-400">
    Loading Alpaca account P/L…
   </div>:history?.status==="ok"?
    <ReturnsChart key={range+"-"+refresh} points={profitPoints} range={range}/>:
    <p role="status" className="mt-5 rounded-xl border border-amber-400/25 p-5 text-sm text-amber-200">
     {history?.status==="error"||history?.status==="not_configured"?history.message:"P/L history unavailable."}
    </p>}
   <p className="mt-4 text-xs leading-6 text-slate-500">
    Methodology: each plotted value is the change in Alpaca&apos;s reported profit_loss
    from the earliest visible valid snapshot. External cash deposits, withdrawals,
    reporting resets and other account events can affect these values.
    It is NOT a cash-flow-adjusted investment return, time-weighted return,
    guaranteed forward return, or realized-trade P/L.
   </p>
  </section>
  <PositionReturnsTable positions={positions}/>
  <p className="mt-5 text-xs leading-6 text-slate-500">
   Realized trading P/L requires a complete, reconciled fill/corporate-action ledger
   and is not reported here. DCF estimates a company&apos;s value under assumptions;
   it does not calculate your actual portfolio performance. All account values
   are simulated Alpaca Paper USD values, never fabricated.
  </p>
 </div>;
}
