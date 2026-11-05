"use client";

import {useState} from "react";
import type {FundamentalSnapshot} from "../../../lib/research/fundamentals-types";
import {calculateCurrentValuation} from "../../../lib/research/valuation-current";
import {calculateEquityCashFlowDCF} from "../../../lib/research/dcf";

const dollar=(v:number|null)=>v===null?"—":new Intl.NumberFormat("en-US",{
 style:"currency",currency:"USD",maximumFractionDigits:2,
}).format(v);
const shortUSD=(v:number)=>!Number.isFinite(v)?"—":
 Math.abs(v)>=1e12?"$"+(v/1e12).toFixed(2)+"T":
 Math.abs(v)>=1e9?"$"+(v/1e9).toFixed(2)+"B":
 Math.abs(v)>=1e6?"$"+(v/1e6).toFixed(2)+"M":dollar(v);
const percent=(v:number|null)=>v===null?"—":(v>0?"+":"")+v.toFixed(1)+"%";
function Input({label,value,setValue,min,max,step,description}:{
 label:string;value:number;setValue:(value:number)=>void;
 min:number;max:number;step:number;description:string;
}){
 return <label className="block rounded-xl border border-white/10 p-4">
  <span className="block text-xs font-semibold text-slate-200">{label}</span>
  <span className="mt-1 block text-[11px] leading-4 text-slate-500">{description}</span>
  <span className="mt-3 flex items-center gap-2">
   <input type="number" value={value} min={min} max={max} step={step}
    onChange={event=>setValue(Number(event.target.value))}
    className="min-w-0 w-full rounded-lg border border-white/15 bg-[#102038] px-3 py-2 text-base font-semibold text-slate-100 tabular-nums outline-none focus:border-[#83e3cd]"
    aria-label={label}/>
   <span className="text-sm text-slate-400">%</span>
  </span>
 </label>;
}
function Tile({label,value,description}:{label:string;value:string;description:string}){
 return <div className="rounded-xl border border-white/10 p-4">
  <p className="text-xs text-slate-400">{label}</p>
  <strong className="mt-2 block text-xl font-semibold tabular-nums">{value}</strong>
  <p className="mt-2 text-[11px] leading-5 text-slate-500">{description}</p>
 </div>;
}
/**
 * Read-only client calculator: historical SEC inputs are validated by the
 * existing current-valuation gates; all forecasts are user-supplied.
 */
export default function DCFAnalysis({data,price,priceAsOf,priceSource}:{
 data:FundamentalSnapshot;price:number|null;priceAsOf:string;priceSource:string;
}){
 const [growth,setGrowth]=useState(5);
 const [costOfEquity,setCostOfEquity]=useState(10);
 const [terminalGrowth,setTerminalGrowth]=useState(2.5);
 const current=calculateCurrentValuation(data,price,priceAsOf,priceSource);
 const latest=data.fiscalYears[0];
 const priceDay=Date.parse(priceAsOf+"T00:00:00Z");
 const fyDay=Date.parse((latest?.fiscalYearEnd??"")+"T00:00:00Z");
 const fyAge=(priceDay-fyDay)/86400000;
 const fyOK=latest&&latest.filedAt<=priceAsOf&&Number.isFinite(fyAge)&&fyAge>=0&&fyAge<=550;
 const annualFCF=fyOK?data.freeCashFlowUsd:null;
 const base=current.ttmFCF!==null?current.ttmFCF:annualFCF;
 const source=current.ttmFCF!==null?"SEC TTM ending "+(current.ttmEnd??"—"):
  fyOK?"SEC fiscal year ending "+latest.fiscalYearEnd:"Not available";
 const shares=current.sharesOutstanding;
 const available=base!==null&&base>0&&shares!==null&&shares>0;
 const assumptions={baseCashFlowUsd:base??0,sharesOutstanding:shares??0,
  growthRatePct:growth,costOfEquityPct:costOfEquity,
  terminalGrowthPct:terminalGrowth,referencePriceUsd:current.price};
 const model=available?calculateEquityCashFlowDCF(assumptions):null;
 const discountCases=[costOfEquity-1,costOfEquity,costOfEquity+1];
 const terminalCases=[terminalGrowth-0.5,terminalGrowth,terminalGrowth+0.5];
 return <section aria-label="Discounted cash flow model" className="surface-panel rounded-2xl p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="text-lg font-semibold">DCF Valuation · 5-Year Model</h2>
    <p className="mt-1 text-xs leading-5 text-slate-400">SEC historical operating cash flow − capital expenditure · editable forward assumptions</p></div>
   <span className="surface-pill rounded-full px-3 py-1.5 text-[11px] font-semibold">SCENARIO ESTIMATE · NOT ANALYST TARGET</span>
  </div>
  {!available?<div role="status" className="mt-5 rounded-xl border border-amber-400/25 p-4 text-sm leading-6 text-amber-200">
   DCF unavailable: requires positive, verifiable SEC TTM or recent annual cash flow and a recent
   issuer-level shares-outstanding snapshot aligned with the IEX reference close. Negative cash flow,
   stale shares, and multi-class tickers require a more detailed model. No value has been invented.
  </div>:<>
   <p className="mt-5 text-xs leading-6 text-slate-400">
    Starting annual cash-flow proxy: <strong className="text-slate-200">{shortUSD(base!)}</strong> · {source}.
    Reported shares: <strong className="text-slate-200">{new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:2}).format(shares!)}</strong>
    {" · dated "+(current.sharesDate??"—")+" · "+(current.sharesSource??"SEC")}.
   </p>
   <div className="mt-4 grid gap-3 md:grid-cols-3">
    <Input label="Five-year annual growth" value={growth} setValue={setGrowth}
     min={-30} max={50} step={0.5} description="Your scenario assumption, not an analyst estimate"/>
    <Input label="Cost of equity" value={costOfEquity} setValue={setCostOfEquity}
     min={3} max={40} step={0.5} description="Equity discount rate, not WACC"/>
    <Input label="Terminal growth" value={terminalGrowth} setValue={setTerminalGrowth}
     min={-5} max={8} step={0.5} description="Long-run equity cash-flow growth assumption"/>
   </div>
   {!model?<p role="alert" className="mt-4 rounded-xl border border-amber-400/25 p-4 text-sm text-amber-200">
    Invalid assumptions. Keep growth rates within their allowed ranges and cost of equity at least
    one percentage point above terminal growth.
   </p>:<>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
     <Tile label="Modeled equity value / share" value={dollar(model.estimatedValuePerShareUsd)}
      description="5-year present value + terminal value, divided by dated reported shares"/>
     <Tile label="Scenario upside / downside" value={percent(model.upsideVsReferencePct)}
      description={"Versus historical IEX close "+dollar(current.price)+" · "+priceAsOf}/>
     <Tile label="Estimated total equity value" value={shortUSD(model.estimatedEquityValueUsd)}
      description="Discounted equity cash-flow proxy, not enterprise value"/>
     <Tile label="Terminal value contribution" value={model.terminalWeightPct.toFixed(1)+"%"}
      description="Share of total modeled value arising after year five"/>
    </div>
    <details className="mt-4 rounded-xl border border-white/10 p-4" open>
     <summary className="cursor-pointer text-sm font-semibold">Projected cash flow · five years</summary>
     <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-xs">
      <thead><tr className="border-b border-white/10 text-slate-400">
       <th className="px-3 py-3">Projection year</th>
       <th className="px-3 py-3 text-right">Cash-flow proxy</th>
       <th className="px-3 py-3 text-right">Present value</th>
      </tr></thead>
      <tbody>{model.projectedYears.map(row=><tr key={row.year} className="border-b border-white/10">
       <td className="px-3 py-3">Year {row.year}</td>
       <td className="px-3 py-3 text-right tabular-nums">{shortUSD(row.projectedCashFlowUsd)}</td>
       <td className="px-3 py-3 text-right tabular-nums">{shortUSD(row.presentValueUsd)}</td>
      </tr>)}</tbody>
      <tfoot><tr className="font-semibold"><td className="px-3 pt-3">Terminal value (PV)</td>
       <td className="px-3 pt-3 text-right">—</td>
       <td className="px-3 pt-3 text-right">{shortUSD(model.pvTerminalUsd)}</td></tr></tfoot>
     </table></div>
    </details>
    <details className="mt-4 rounded-xl border border-white/10 p-4">
     <summary className="cursor-pointer text-sm font-semibold">Sensitivity · value per share (USD)</summary>
     <p className="mt-2 text-xs leading-5 text-slate-500">Rows vary cost of equity by ±1 percentage point; columns vary terminal growth by ±0.5 point. All other inputs remain constant.</p>
     <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[420px] text-center text-xs">
      <thead><tr><th className="p-3 text-left text-slate-400">Ke ↓ / g →</th>
       {terminalCases.map((g,i)=><th key={i} className="p-3 text-slate-300">{g.toFixed(1)}%</th>)}</tr></thead>
      <tbody>{discountCases.map((ke,i)=><tr key={i} className="border-t border-white/10">
       <th className="p-3 text-left text-slate-300">{ke.toFixed(1)}%</th>
       {terminalCases.map((g,j)=>{
        const scenario=calculateEquityCashFlowDCF({...assumptions,costOfEquityPct:ke,terminalGrowthPct:g});
        return <td key={j} className={"p-3 tabular-nums "+(i===1&&j===1?"font-bold text-[#83e3cd]":"text-slate-300")}>
         {scenario?dollar(scenario.estimatedValuePerShareUsd):"—"}
        </td>;
       })}
      </tr>)}</tbody>
     </table></div>
    </details>
   </>}
  </>}
  <p className="mt-5 text-[11px] leading-5 text-slate-500">
   Methodology: 5 annual cash-flow forecasts discounted at an assumed cost of equity,
   plus a Gordon-growth terminal value. Starting cash flow equals SEC operating cash flow
   minus reported PP&amp;E purchases; this is an equity cash-flow proxy, NOT rigorously
   reconciled FCFE (net borrowing is excluded) or unlevered FCFF/WACC.
   No debt, excess-cash or enterprise-value bridge is applied. Assumes unchanged shares
   and constant growth; not appropriate for every sector, especially financial firms,
   or companies with negative or highly cyclical cash flow. Historical filings are actual;
   forward rates are illustrative user inputs, not verified forecasts or investment advice.
  </p>
 </section>;
}
