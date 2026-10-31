import type { FundamentalSnapshot } from "../../../lib/research/fundamentals-types";
import { calculateFYValuation } from "../../../lib/research/valuation-math";

const multiple=(n:number|null)=>n===null?"—":n.toFixed(2)+"×";
const yieldText=(n:number|null)=>n===null?"—":(n>0?"+":"")+n.toFixed(2)+"%";
const unitUSD=(n:number|null)=>n===null?"—":
 new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n);
const bigUSD=(n:number|null)=>{
 if(n===null)return "—";
 return n>=1e12?"$"+(n/1e12).toFixed(2)+"T":n>=1e9?"$"+(n/1e9).toFixed(2)+"B":
 n>=1e6?"$"+(n/1e6).toFixed(2)+"M":unitUSD(n);
};
function MultipleCard({label,value,note}:{label:string;value:string;note:string}){
 return <div className="rounded-xl border border-white/10 p-4">
  <p className="text-xs text-slate-400">{label}</p>
  <strong className="mt-2 block text-2xl font-semibold tabular-nums">{value}</strong>
  <p className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p>
 </div>;
}
export default function ValuationAnalysis({data,price,priceAsOf}:{
 data:FundamentalSnapshot;price:number|null;priceAsOf:string;
}){
 const result=calculateFYValuation(data,price,priceAsOf);
 const eps=result.dilutedEPS;
 const peLabel=result.available&&eps!==null&&eps<=0?"N/M":multiple(result.pe);
 return <section aria-label="Company valuation" className="surface-panel rounded-2xl p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <h2 className="text-lg font-semibold">Valuation Multiples</h2>
    <p className="mt-1 text-xs text-slate-400">Fiscal-year SEC fundamentals × last available Alpaca IEX close · not TTM or live quotes</p>
   </div>
   <span className="surface-pill rounded-full px-3 py-1.5 text-[11px] font-semibold">FY ACTUALS · NOT PRICE TARGETS</span>
  </div>
  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
   <span>Price: <strong className="font-medium text-slate-200">{result.price===null?"—":unitUSD(result.price)}</strong> · {priceAsOf}</span>
   <span>SEC fiscal year ended: <strong className="font-medium text-slate-200">{result.fiscalYearEnd||"—"}</strong></span>
   <span>Annual diluted EPS: <strong className="font-medium text-slate-200">{unitUSD(eps)}</strong></span>
  </div>
  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <MultipleCard label="FY P/E (Diluted)" value={peLabel}
    note="Latest IEX close ÷ annual GAAP diluted EPS; negative/zero EPS = N/M. Not trailing 12-month EPS."/>
   <MultipleCard label="FY P/S · Proxy" value={multiple(result.psProxy)}
    note="Price × FY weighted-average diluted shares ÷ annual sales. Not verified current market cap."/>
   <MultipleCard label="FY P/B · Proxy" value={multiple(result.pbProxy)}
    note="Price × FY weighted-average diluted shares ÷ fiscal year-end stockholders’ equity."/>
   <MultipleCard label="FY FCF Yield · Proxy" value={yieldText(result.fcfYieldProxyPct)}
    note="(Annual operating cash flow − reported capex) ÷ estimated market-cap proxy."/>
  </div>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
   <div className="rounded-xl border border-white/10 p-4">
    <p className="text-xs text-slate-400">Annual diluted weighted-average shares</p>
    <p className="mt-2 text-xl font-semibold tabular-nums">{result.weightedAverageDilutedShares===null?"—":
     new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(result.weightedAverageDilutedShares)}</p>
    <p className="mt-1 text-xs text-slate-500">SEC 10-K · this is not current outstanding shares</p>
   </div>
   <div className="rounded-xl border border-white/10 p-4">
    <p className="text-xs text-slate-400">Market-cap proxy (not official market cap)</p>
    <p className="mt-2 text-xl font-semibold tabular-nums">{bigUSD(result.marketCapProxyUSD)}</p>
    <p className="mt-1 text-xs text-slate-500">Historical diluted weighted-average shares × latest available IEX close</p>
   </div>
  </div>
  {result.warnings.length>0&&<div role="status" className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
   <p className="text-xs font-semibold text-amber-200">Important valuation qualifications</p>
   {result.warnings.map((w,i)=><p key={i} className="mt-2 text-xs leading-5 text-amber-200">{w}</p>)}
  </div>}
  <div className="mt-5 rounded-xl border border-white/10 p-4">
   <p className="text-sm font-semibold">Additional models · not available yet</p>
   <p className="mt-2 text-xs leading-6 text-slate-400">
    Forward P/E requires sourced analyst forecasts. EV/EBITDA requires verified enterprise value, debt and EBITDA.
    DCF, historical/peer benchmarks and a 12-month price target need validated inputs and independent model review.
    None of these are inferred from a few annual ratios.
   </p>
  </div>
  <p className="mt-4 text-[11px] leading-5 text-slate-500">
   Sources: <a href={data.dataUrl} rel="noopener noreferrer" target="_blank" className="text-[#75d6c6] hover:underline">SEC EDGAR company facts ↗</a>
   {" "}and Alpaca historical IEX close. Figures can be stale, restated, split-sensitive or unsuitable for some share classes.
   These are descriptive FY multiples, not intrinsic value, investment advice or a verified consolidated market quote.
   Missing values are withheld rather than extrapolated.
  </p>
 </section>;
}
