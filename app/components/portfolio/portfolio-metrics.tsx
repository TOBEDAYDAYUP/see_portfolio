import type { Currency } from "../../../types/app";
import { money } from "../../../lib/demo/portfolio";

/** Fictional portfolio statistics, kept separate from holdings navigation. */
export default function PortfolioMetrics({currency}:{currency:Currency}) {
 const format=(value:number)=>money(value,currency);
 return <>
   <div className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{[["Unrealized returns",format(217087),"+98.5%"],["Realized returns",format(52591),"+23.9%"],["Dividends received",format(16899),"+7.7%"],["Currency impact","-"+format(952),"-0.4%"],["Estimated dividends",format(5154)+"/yr","1.4% yield"]].map((m,i)=><div key={m[0]} className="surface-stat rounded-2xl border border-white/10 bg-[#172338] surface-panel p-4"><p className="text-xs text-slate-400">{m[0]}</p><strong className="mt-2 block whitespace-nowrap text-lg">{m[1]}</strong><span className={"mt-1 block text-xs "+(i===3?"text-rose-300":"text-emerald-300")}>{m[2]} · sample</span></div>)}</div>
 </>;
}
