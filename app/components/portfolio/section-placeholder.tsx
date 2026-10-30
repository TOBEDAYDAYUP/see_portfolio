import type { PortfolioSection } from "../../../types/app";
import { labels } from "../../../lib/demo/portfolio";

export default function Soon({section}:{section:PortfolioSection}){
 return <><section className="rounded-2xl border border-[#395765] bg-[linear-gradient(130deg,#1a3647,#172338)] surface-feature  p-8">
 <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 surface-pill px-3 py-1 text-xs font-semibold text-emerald-200">UNDER DEVELOPMENT</span>
 <h2 className="mt-5 text-2xl font-semibold">{section.charAt(0).toUpperCase()+section.slice(1)}</h2>
 <p className="mt-3 text-sm text-slate-300">{labels[section]}. This research section will receive data and analysis models later.</p></section>
 <div className="mt-5 grid gap-4 md:grid-cols-3">{["Summary","Visual analysis","Research detail"].map((t,i)=><div key={t} className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-6"><h3 className="font-semibold">{t}</h3><div className="mt-7 h-3 w-4/5 rounded-full bg-[#293c52]"/><div className="mt-3 h-3 w-1/2 rounded-full bg-[#293c52]"/><div className="mt-5 h-24 rounded-xl border border-dashed border-[#40516b] bg-[#122035]"/><p className="mt-4 text-xs text-slate-500">Module {i+1} · Planned</p></div>)}</div></>;
}
