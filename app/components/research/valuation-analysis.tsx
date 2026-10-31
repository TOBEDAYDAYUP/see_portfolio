import type { FundamentalSnapshot } from "../../../lib/research/fundamentals-types";
import { calculateCurrentValuation } from "../../../lib/research/valuation-current";
import { calculateFYValuation } from "../../../lib/research/valuation-math";

const multiple=(value:number|null)=>value===null?"—":value.toFixed(2)+"×";
const pct=(value:number|null)=>value===null?"—":(value>0?"+":"")+value.toFixed(2)+"%";
const usd=(value:number|null)=>value===null?"—":
 new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(value);
const compact=(value:number|null)=>value===null?"—":Math.abs(value)>=1e12?"$"+(value/1e12).toFixed(2)+"T":
 Math.abs(value)>=1e9?"$"+(value/1e9).toFixed(2)+"B":
 Math.abs(value)>=1e6?"$"+(value/1e6).toFixed(2)+"M":usd(value);
function Card({label,value,explain}:{label:string;value:string;explain:string}){
 return <div className="rounded-xl border border-white/10 p-4">
  <p className="text-xs text-slate-400">{label}</p>
  <strong className="mt-2 block text-2xl font-semibold tabular-nums">{value}</strong>
  <p className="mt-2 text-[11px] leading-5 text-slate-500">{explain}</p>
 </div>;
}
export default function ValuationAnalysis({data,price,priceAsOf,priceSource}:{
 data:FundamentalSnapshot;price:number|null;priceAsOf:string;priceSource:string;
}){
 const v=calculateCurrentValuation(data,price,priceAsOf,priceSource);
 const olderFY=calculateFYValuation(data,price,priceAsOf);
 const incomplete=v.ttmEnd===null||v.sharesOutstanding===null||v.bookEquity===null;
 const coverage=data.recent?.coverage;
 return <section aria-label="Company valuation" className="surface-panel rounded-2xl p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <h2 className="text-lg font-semibold">Valuation Multiples</h2>
    <p className="mt-1 text-xs text-slate-400">
     SEC EDGAR annual + quarterly filings · dated historical Alpaca reference close · not intrinsic value
    </p>
   </div>
   <span className="surface-pill rounded-full px-3 py-1.5 text-[11px] font-semibold">TTM WHEN VERIFIED · NO TARGETS</span>
  </div>
  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
   <span>Reference close: <strong className="font-medium text-slate-200">{usd(v.price)}</strong> · {priceAsOf} · {priceSource}</span>
   <span>TTM period ended: <strong className="font-medium text-slate-200">{v.ttmEnd??"Unavailable"}</strong></span>
  </div>
  {incomplete&&<div role="status" className="mt-5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
   <p className="text-sm font-semibold text-amber-200">Partial SEC data — some ratios unavailable</p>
   <p className="mt-2 text-xs leading-6 text-amber-200">
    Annual 10-K values loaded. The quarterly TTM bridge, dated shares or book-equity
    check did not pass. Missing current ratios are withheld rather than displayed as zero.
    {coverage
     ?" Latest detectable SEC 10-Q ended "+(coverage.latest10QPeriodEnd??"not found")+
      " (filed "+(coverage.latestFiled10Q??"unknown")+"); shares dated "+
      (coverage.latestSECShareDate??"not found")+"; equity dated "+
      (coverage.latestSECBookDate??"not found")+"."
     :" SEC source coverage is unavailable."}
   </p>
   <p className="mt-2 text-xs text-amber-200">
    These diagnostics describe the public source data, not your Alpaca API credentials.
    Expand Methodology below for calculation warnings.
   </p>
  </div>}
  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Card label="TTM P/E · Approx." value={multiple(v.ttmPEApprox)}
    explain="Reference price / (FY diluted EPS + latest interim YTD EPS − prior YTD EPS)."/>
   <Card label="TTM P/S · Share proxy" value={multiple(v.ttmPSProxy)}
    explain="Dated reported shares × reference price / TTM revenue."/>
   <Card label="Latest P/B · Share proxy" value={multiple(v.latestPBProxy)}
    explain="Dated reported shares × reference price / latest SEC shareholder equity."/>
   <Card label="TTM FCF Yield · Share proxy" value={pct(v.ttmFCFYieldProxyPct)}
    explain="TTM cash from operations − TTM reported capex, divided by market-cap proxy."/>
  </div>
  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Card label="FY P/E · Prior year" value={multiple(v.fyPE)}
    explain={"Diluted GAAP FY earnings · fiscal year end "+(data.fiscalYears[0]?.fiscalYearEnd??"—")}/>
   <Card label="TTM Revenue" value={compact(v.ttmRevenue)}
    explain="10-K + 10-Q year-to-date − prior-year matching year-to-date."/>
   <Card label="Reported shares (dated)" value={v.sharesOutstanding===null?"—":
     new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:3}).format(v.sharesOutstanding)}
    explain={"SEC outstanding common shares · as of "+(v.sharesDate??"—")}/>
   <Card label="Market-cap proxy" value={compact(v.marketCapProxyUSD)}
    explain="Dated SEC share count × IEX daily close. Not official or real-time market cap."/>
  </div>
  {incomplete&&olderFY.available&&<details className="mt-5 rounded-xl border border-white/10 p-4">
   <summary className="cursor-pointer text-sm font-medium">Older fiscal-year estimates (not current TTM)</summary>
   <p className="mt-2 text-xs leading-5 text-slate-400">
    These values use FY{data.fiscalYears[0]?.fiscalYear??"—"} 10-K diluted weighted-average shares
    as a market-cap proxy, not recent actual shares. They are historical-period approximations
    and must not replace missing TTM multiples.
   </p>
   <div className="mt-3 grid gap-3 sm:grid-cols-3">
    <Card label="FY P/S · Old proxy" value={multiple(olderFY.psProxy)} explain="Annual revenue and FY weighted-average shares."/>
    <Card label="FY P/B · Old proxy" value={multiple(olderFY.pbProxy)} explain="FY book equity and FY weighted-average shares."/>
    <Card label="FY FCF Yield · Old proxy" value={pct(olderFY.fcfYieldProxyPct)} explain="Annual cash flow and FY weighted-average shares."/>
   </div>
  </details>}
  <details className="mt-5 rounded-xl border border-white/10 p-4">
   <summary className="cursor-pointer text-sm font-medium">Methodology, latest book equity &amp; data quality</summary>
   <div className="mt-3 space-y-3 text-xs leading-6 text-slate-400">
    <p>Latest SEC book equity: <strong className="text-slate-200">{compact(v.bookEquity)}</strong> · dated {v.bookDate??"unavailable"}.
     TTM net income: <strong className="text-slate-200">{compact(v.ttmNetIncome)}</strong>.
     TTM free cash flow: <strong className="text-slate-200">{compact(v.ttmFCF)}</strong>.
     TTM approximate diluted EPS: <strong className="text-slate-200">{usd(v.ttmEPSApprox)}</strong>.</p>
    <p>All figures are sourced from annual 10-K and interim 10-Q US-GAAP facts filed on or before {data.asOfDate}.
     TTM quarter-to-year comparisons are rejected when periods cannot be reconciled. Share count and equity
     snapshots must be recent enough and disclosed by the quote date; missing inputs yield —.</p>
    <p>Market capitalization is a **proxy** based on the latest disclosed shares, not a live or exchange-verified value.
     Differences in dates, dilution, splits, share classes and restatements can affect multiples.
     These ratios are not future price targets or investment recommendations.</p>
    <a href={data.dataUrl} target="_blank" rel="noopener noreferrer"
      className="inline-block font-semibold text-[#75d6c6] hover:underline">Original SEC XBRL company facts ↗</a>
    {v.warnings.map((warning,i)=><p key={i} className="text-amber-200">{warning}</p>)}
   </div>
  </details>
  <p className="mt-4 text-[11px] leading-5 text-slate-500">
   Forward P/E, verified EV/EBITDA, peer benchmarking and DCF are not yet available.
   Any reported N/M or missing ratio is intentional, not a predicted value.
  </p>
 </section>;
}
