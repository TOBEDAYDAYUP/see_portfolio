import type { RiskMetrics } from "../../../lib/analytics/risk";
import { TAIL_RISK_MIN_RETURNS } from "../../../lib/analytics/risk";

const usd=(v:number)=>new Intl.NumberFormat("en-US",{
  style:"currency",currency:"USD",maximumFractionDigits:2,
}).format(v);
const percent=(v:number)=>v.toFixed(2)+"%";

/** Two complementary, in-sample historical tail loss statistics. */
export default function TailRiskSection({metrics}:{metrics:RiskMetrics}){
  const ready=metrics.tailRiskSufficient &&
    typeof metrics.var95Pct==="number" && typeof metrics.var95Usd==="number" &&
    typeof metrics.expectedShortfall95Pct==="number" &&
    typeof metrics.expectedShortfall95Usd==="number";
  const cards=[
    {name:"1-Day Historical VaR 95%",
     short:"VaR · 95%",
     pct:metrics.var95Pct,
     dollars:metrics.var95Usd,
     description:"Threshold of the worst ~5% of historical modeled daily losses.",
     bar:"bg-[#5dbfc4]"},
    {name:"1-Day Expected Shortfall 95%",
     short:"ES · 95%",
     pct:metrics.expectedShortfall95Pct,
     dollars:metrics.expectedShortfall95Usd,
     description:"Average loss among the worst ~5% of modeled daily outcomes.",
     bar:"bg-[#e4a16a]"},
  ];
  const max=Math.max(metrics.expectedShortfall95Pct ?? 0,metrics.var95Pct ?? 0,0.001);
  return <section className="surface-panel rounded-2xl p-5 sm:p-6" aria-label="Historical VaR and Expected Shortfall">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">Tail risk · VaR &amp; Expected Shortfall</h2>
        <p className="mt-1 text-xs text-slate-400">1-day horizon · historical simulation · 95% confidence level</p>
      </div>
      <span className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400">Model v0.2</span>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {cards.map(card=><div key={card.name} className="rounded-xl border border-white/10 bg-[#1c2a40] p-4 sm:p-5">
        <p className="text-xs font-medium text-slate-300">{card.name}</p>
        <strong className="mt-3 block text-2xl font-semibold tabular-nums">
          {ready&&card.pct!==null?percent(card.pct):"—"}
        </strong>
        <p className="mt-1 text-sm font-semibold text-slate-300 tabular-nums">
          {ready&&card.dollars!==null?usd(card.dollars)+" potential daily loss":"No estimate yet"}
        </p>
        <p className="mt-4 text-xs leading-5 text-slate-400">{card.description}</p>
        {ready&&card.pct!==null&&<div className="mt-4 h-2 overflow-hidden rounded-full bg-[#2e4156]">
          <div className={"h-full rounded-full "+card.bar}
            style={{width:Math.max(0,Math.min(100,card.pct/max*100))+"%"}}/>
        </div>}
      </div>)}
    </div>
    {ready
      ? <p className="mt-4 text-xs leading-6 text-slate-400">
          Calculated from <strong className="text-slate-200">{metrics.dailyReturnObservations}</strong> aligned daily model returns.
          Worst-tail scenarios averaged for ES: <strong className="text-slate-200">{metrics.tailObservations}</strong>.
          Dollar estimates use current invested stock value of <strong className="text-slate-200">{usd(metrics.investedValue)}</strong>, excluding cash.
        </p>
      : <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-xs leading-6 text-amber-200" role="status">
          Insufficient synchronized market history. Historical VaR and ES need at least {TAIL_RISK_MIN_RETURNS} daily modeled
          returns for every holding (currently {metrics.dailyReturnObservations}). No tail-loss numbers are generated from insufficient samples.
        </p>}
    <p className="mt-4 border-t border-white/10 pt-4 text-[11px] leading-5 text-slate-500">
      Historical sample estimates, not a prediction or maximum possible loss. ES describes the observed
      tail beyond the VaR threshold. Losses may exceed both values; results depend on the current-weight
      hypothetical portfolio and IEX price coverage. No backtesting or confidence calibration has been performed.
    </p>
  </section>;
}
