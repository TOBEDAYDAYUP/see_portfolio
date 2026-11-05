"use client";

import {useEffect,useState} from "react";
import type {RiskApiResult} from "../../../lib/alpaca/risk-types";
import type {PortfolioValuationResult} from "../../../lib/portfolio/valuation-server";
import {buildPortfolioHealthProfile,type HealthAxis} from "../../../lib/portfolio/health-profile";

type Props={positionCount:number;fetchedAt:string};
type Tagged<T>={token:string;data:T};
const pct=(v:number)=>v.toFixed(1)+"%";
const multiple=(v:number|null)=>v===null?"—":v.toFixed(2)+"×";
const percent=(v:number|null)=>v===null?"—":pct(v);
const errRisk:RiskApiResult={status:"error",message:"Local risk analytics are currently unavailable."};
const errValuation:PortfolioValuationResult={status:"error",message:"SEC valuation coverage is currently unavailable."};

function radarPoint(index:number,radius:number){
 const angle=(-90+index*72)*Math.PI/180;
 return {x:160+Math.cos(angle)*radius,y:145+Math.sin(angle)*radius};
}
const radarLabels=[
 {name:"Diversify",x:160,y:20,anchor:"middle"},
 {name:"Balance",x:271,y:116,anchor:"start"},
 {name:"Volatility",x:232,y:265,anchor:"middle"},
 {name:"Drawdown",x:88,y:265,anchor:"middle"},
 {name:"Tail loss",x:49,y:116,anchor:"end"},
] as const;

function HealthRadar({axes,complete}:{axes:HealthAxis[];complete:boolean}){
 const radius=90;
 const values=axes.map((axis,i)=>axis.score===null?null:radarPoint(i,radius*axis.score/100));
 const polygon=complete?values.map(p=>p!.x.toFixed(1)+","+p!.y.toFixed(1)).join(" "):null;
 const segments=values.flatMap((p,i)=>{
  const next=values[(i+1)%values.length];
  return p&&next?[{key:i,x1:p.x,y1:p.y,x2:next.x,y2:next.y}]:[];
 });
 return <svg viewBox="0 0 320 285" role="img" className="mx-auto w-full max-w-[350px]"
  aria-label={"Five-axis portfolio risk profile: "+axes.map(a=>a.label+" "+(a.score===null?"unavailable":a.score.toFixed(0)+" out of 100")).join("; ")}>
  {[25,50,75,100].map(level=><polygon key={level} fill="none" stroke="#7691a6" strokeOpacity=".32"
   strokeWidth="1" points={Array.from({length:5},(_,i)=>{const p=radarPoint(i,radius*level/100);return p.x+","+p.y;}).join(" ")}/>)}
  {Array.from({length:5},(_,i)=>{const p=radarPoint(i,radius);return <line key={i}
   x1="160" y1="145" x2={p.x} y2={p.y} stroke="#7691a6" strokeOpacity=".35"/>;})}
  {polygon?<polygon points={polygon} fill="#2ac5ad" fillOpacity=".22"
   stroke="#18a99a" strokeWidth="2.3" strokeLinejoin="round"/>:
   segments.map(s=><line key={s.key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
    stroke="#18a99a" strokeWidth="2" strokeDasharray="3 3"/>)}
  {values.map((p,i)=>p&&<circle key={axes[i].key} cx={p.x} cy={p.y} r="3.5"
   fill="#16ac98" stroke="#fff" strokeWidth="1.25">
   <title>{axes[i].label}: {axes[i].score!.toFixed(0)}/100 · {axes[i].raw}</title>
  </circle>)}
  {radarLabels.map((item,i)=><text key={item.name} x={item.x} y={item.y}
   textAnchor={item.anchor} fill="currentColor" fontSize="11" fontWeight="500">
   {item.name}{axes[i].score===null?" · —":""}
  </text>)}
 </svg>;
}

async function readApi<T>(path:string,signal:AbortSignal,fallback:T):Promise<T>{
 try{
  const response=await fetch(path,{cache:"no-store",signal});
  const raw:unknown=await response.json();
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||!("status" in raw)||
    typeof raw.status!=="string"||!["connected","empty","not_configured","unsupported","error"].includes(raw.status)){
   return fallback;
  }
  if(raw.status==="connected"&&(!("metrics" in raw)&&path.includes("/risk")))return fallback;
  return raw as T;
 }catch{return fallback;}
}

export default function PortfolioHealthAnalysis({positionCount,fetchedAt}:Props){
 const [retry,setRetry]=useState(0);
 const [risk,setRisk]=useState<Tagged<RiskApiResult>|null>(null);
 const [valuation,setValuation]=useState<Tagged<PortfolioValuationResult>|null>(null);
 const token=fetchedAt+"|"+retry+"|"+positionCount;
 useEffect(()=>{
  if(positionCount===0)return;
  const controller=new AbortController();
  void readApi("/api/alpaca/risk",controller.signal,errRisk).then(data=>{
   if(!controller.signal.aborted)setRisk({token,data});
  });
  void readApi("/api/alpaca/valuation",controller.signal,errValuation).then(data=>{
   if(!controller.signal.aborted)setValuation({token,data});
  });
  return ()=>controller.abort();
 },[token,positionCount]);
 const currentRisk=risk?.token===token?risk.data:null;
 const currentValuation=valuation?.token===token?valuation.data:null;
 const profile=currentRisk?.status==="connected"&&currentRisk.metrics?
  buildPortfolioHealthProfile(currentRisk.metrics):null;
 const riskMessage=currentRisk?.status==="unsupported"?currentRisk.reason:
  currentRisk?.status==="error"?currentRisk.message:
  currentRisk?.status==="not_configured"?"Alpaca Paper is not connected.":
  currentRisk?.status==="empty"?"No eligible holdings to analyze.":null;
 const summary=currentValuation?.status==="connected"?currentValuation.summary:null;
 return <section className="surface-panel flex min-w-0 flex-col rounded-2xl p-5 sm:p-6"
  aria-label="Portfolio health analysis">
  <div className="flex flex-wrap items-start justify-between gap-2">
   <div><h2 className="text-lg font-semibold">Portfolio health analysis</h2>
    <p className="mt-1 text-xs leading-5 text-slate-500">Current positions · transparent risk indicators</p></div>
   {positionCount>0&&<button type="button" onClick={()=>setRetry(n=>n+1)}
    className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-100">
    Refresh
   </button>}
  </div>
  {positionCount===0?<p className="my-auto rounded-xl border border-dashed border-white/15 px-4 py-9 text-center text-sm leading-6 text-slate-400">
   No open positions. Add Paper holdings to see a real risk profile; no substitute scores are generated.
  </p>:<>
   {!currentRisk&&<p role="status" className="my-5 text-sm text-slate-400">Calculating portfolio risk profile…</p>}
   {riskMessage&&<p role="status" className="mt-5 rounded-xl border border-amber-400/20 p-3 text-xs leading-5 text-amber-200">
    {riskMessage} No substitute risk scores are shown.
   </p>}
   {profile&&<>
    <div className="mt-3">
     <HealthRadar axes={profile.axes} complete={profile.complete}/>
    </div>
    <p className="text-center text-[11px] text-slate-500">
     {profile.available}/5 indicators available · {profile.complete?"Full risk profile":"Partial profile · no complete polygon"}
    </p>
    <div className="mt-4 space-y-2.5">
     {profile.axes.map(axis=><div key={axis.key}>
      <div className="flex items-baseline justify-between gap-3 text-[11px]">
       <span className="font-medium text-slate-300" title={axis.method}>{axis.label}</span>
       <span className="text-right tabular-nums text-slate-400">{axis.raw}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#34495d]"
       role="meter" aria-label={axis.label+" diagnostic index"} aria-valuemin={0} aria-valuemax={100}
       aria-valuenow={axis.score??undefined} aria-valuetext={axis.score===null?"Unavailable":axis.score.toFixed(0)+" of 100"}>
       {axis.score!==null&&<div className="h-full rounded-full bg-[#38b9a6]" style={{width:axis.score+"%"}}/>}
      </div>
     </div>)}
    </div>
    {!profile.isHistoryFresh&&<p role="status" className="mt-3 text-[11px] leading-5 text-amber-200">
     Historical IEX data is missing, outdated or insufficient; volatility, drawdown and tail-loss indicators are withheld.
    </p>}
    <p className="mt-3 text-[11px] leading-5 text-slate-500">
     {profile.observations} aligned daily returns · latest session {profile.latestDate??"unknown"}.
     This is a hypothetical buy-and-hold stock basket, not account performance.
    </p>
   </>}
   <div className="mt-5 border-t border-white/10 pt-4">
    <h3 className="text-sm font-semibold">Fundamentals &amp; coverage</h3>
    {!currentValuation&&<p role="status" className="mt-2 text-xs text-slate-400">Checking SEC fundamentals…</p>}
    {summary&&<div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
     <div><p className="text-[11px] text-slate-500">Covered TTM P/E</p>
      <strong className="mt-1 block text-base tabular-nums">{multiple(summary.weightedPortfolioPE)}</strong></div>
     <div><p className="text-[11px] text-slate-500">P/E coverage</p>
      <strong className="mt-1 block text-base tabular-nums">{pct(summary.peCoveragePct)}</strong></div>
     <div><p className="text-[11px] text-slate-500">Covered FCF yield</p>
      <strong className="mt-1 block text-base tabular-nums">{percent(summary.weightedFCFYieldPct)}</strong></div>
     <div><p className="text-[11px] text-slate-500">FCF coverage</p>
      <strong className="mt-1 block text-base tabular-nums">{pct(summary.fcfCoveragePct)}</strong></div>
    </div>}
    {currentValuation&&currentValuation.status!=="connected"&&
     <p role="status" className="mt-2 text-xs leading-5 text-slate-400">
      Fundamentals unavailable: {currentValuation.message}. No values are inferred.
     </p>}
    {summary&&<p className="mt-2 text-[11px] leading-5 text-slate-500">
     Coverage is a percentage of eligible invested stock value, not a company-quality score.
     Multiples exclude unsupported and missing observations.
    </p>}
   </div>
   <details className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-slate-400">
    <summary className="cursor-pointer font-medium">How to interpret this chart</summary>
    <p className="mt-2">Higher polygon values indicate lower observed exposure relative to heuristic reference points;
     they are NOT probabilities, a validated composite health rating, forecasts or investment recommendations.
     Fundamentals appear separately because low P/E or high yield alone does not establish investment quality.</p>
    <div className="mt-2 space-y-1">
     {profile?.axes.map(axis=><p key={axis.key}><strong className="text-slate-300">{axis.label}:</strong> {axis.method}</p>)}
    </div>
    <p className="mt-2">Source: Alpaca Paper holdings, historical split-adjusted IEX data, and SEC TTM fundamentals when available.
     Heuristic markers ignore cash, currencies and unsupported/non-long stock exposure. Past risk does not guarantee future outcomes.</p>
   </details>
  </>}
 </section>;
}
