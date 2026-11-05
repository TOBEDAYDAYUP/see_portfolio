"use client";

import type {StockRiskSummary} from "../../../lib/research/types";
import {buildStockRiskProfile} from "../../../lib/research/stock-risk-profile";

const point=(index:number,rad:number)=>({
 x:155+Math.cos((-90+index*72)*Math.PI/180)*rad,
 y:147+Math.sin((-90+index*72)*Math.PI/180)*rad,
});
const coords=(x:{x:number;y:number})=>x.x.toFixed(1)+","+x.y.toFixed(1);

export default function StockRiskRadar({risk,asOf,symbol}:{
 risk:StockRiskSummary|null;asOf:string;symbol:string;
}){
 const axes=buildStockRiskProfile(risk);
 const present=axes.map((axis,i)=>axis.score===null?null:point(i,92*axis.score/100));
 const complete=present.every(p=>p!==null);
 return <aside className="surface-panel flex h-full min-w-0 flex-col rounded-2xl p-4 sm:p-5"
  aria-label={symbol+" single-stock risk analysis"}>
  <h3 className="text-base font-semibold">Stock Risk Profile</h3>
  <p className="mt-1 text-xs leading-5 text-slate-400">SEE-calculated · historical IEX · {asOf}</p>
  <svg viewBox="0 0 310 291" className="mx-auto mt-5 w-full max-w-[350px]" role="img"
   aria-label={symbol+" five-axis historical risk diagnostics; higher means lower historical risk or more sample coverage"}>
   {[25,50,75,100].map(k=><polygon key={k}
    points={Array.from({length:5},(_,i)=>coords(point(i,92*k/100))).join(" ")}
    fill="none" stroke="#7e9ab0" strokeOpacity=".3" strokeWidth="1"/>)}
   {Array.from({length:5},(_,i)=><line key={i} x1="155" y1="147"
    x2={point(i,92).x} y2={point(i,92).y} stroke="#8ca5b5" strokeOpacity=".36"/>)}
   {complete&&<polygon points={present.map(p=>coords(p!)).join(" ")}
     fill="#19b99d" fillOpacity=".22" stroke="#169e8c" strokeWidth="2.1" strokeLinejoin="round"/>}
   {!complete&&present.map((p,i)=>{
    const next=present[(i+1)%5];
    return p&&next?<line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y}
      stroke="#169e8c" strokeWidth="2" strokeDasharray="4 3"/>:null;
   })}
   {present.map((p,i)=>p&&<circle key={axes[i].key} cx={p.x} cy={p.y}
    r="3.6" fill="#159e8d" stroke="#fff" strokeWidth="1"><title>{axes[i].label}: {axes[i].raw}</title></circle>)}
   {[
     {x:155,y:25,anchor:"middle"},
     {x:276,y:118,anchor:"start"},
     {x:240,y:272,anchor:"middle"},
     {x:70,y:272,anchor:"middle"},
     {x:34,y:118,anchor:"end"},
   ].map((label,i)=><text key={axes[i].key} x={label.x} y={label.y}
     textAnchor={label.anchor as "middle"|"start"|"end"} fontSize="11" fontWeight="500" fill="currentColor">
      {["Volatility","Drawdown","VaR","ES","History"][i]}
    </text>)}
  </svg>
  <p className="text-center text-[11px] text-slate-500">{present.filter(Boolean).length}/5 available · {complete?"Full diagnostic polygon":"Incomplete history; missing axes withheld"}</p>
  <div className="mt-4 space-y-3">
   {axes.map(axis=><div key={axis.key} title={axis.method}>
    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
     <span className="font-medium text-slate-300">{axis.label}</span>
     <span className="tabular-nums text-slate-400">{axis.raw}</span>
    </div>
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#34495d]"
     role="meter" aria-label={axis.label} aria-valuemin={0} aria-valuemax={100}
     aria-valuenow={axis.score??undefined}
     aria-valuetext={axis.score===null?"Unavailable":axis.score.toFixed(0)+"/100"}>
      {axis.score!==null&&<div className="h-full rounded-full bg-[#38b9a6]" style={{width:axis.score+"%"}}/>}
    </div>
   </div>)}
  </div>
  <details className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">
   <summary className="cursor-pointer font-semibold">How the five axes work</summary>
   <div className="mt-3 space-y-2">
    {axes.map(axis=><p key={axis.key}><strong>{axis.label}:</strong> {axis.method}</p>)}
   </div>
  </details>
  <p className="mt-auto pt-4 text-[11px] leading-5 text-slate-500">
   Illustrative 0–100 reference scales, not a validated investment score or price forecast.
   Historical VaR/ES are in-sample. Sample depth measures coverage, not company quality.
  </p>
 </aside>;
}
