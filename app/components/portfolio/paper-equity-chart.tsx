import type { PortfolioHistoryPoint } from "../../../lib/alpaca/types";
import type { PortfolioHistoryRange } from "../../../lib/alpaca/history-range";
import {historyXAxisTickIndices} from "../../../lib/alpaca/history-display";

const dollar=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(value);

/** Actual Alpaca Paper account equity snapshots; no synthesized demo points. */
export default function PaperEquityChart({points,range}:{points:PortfolioHistoryPoint[];range:PortfolioHistoryRange}) {
  if (points.length < 2) return <p className="py-10 text-center text-sm text-slate-400">Not enough account history is available to draw a chart.</p>;
  const width=800, height=348, left=91, right=18, top=22, bottom=43;
  const values=points.map(p=>p.equity);
  const min=Math.min(...values), max=Math.max(...values);
  const pad=Math.max((max-min)*0.12, max*0.01, 1);
  const low=min-pad, high=max+pad;
  const coords=values.map((v,i)=>({
    x:left+(i/(values.length-1))*(width-left-right),
    y:top+(1-(v-low)/(high-low))*(height-top-bottom),
  }));
  const pointString=coords.map(p=>p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
  const areaString=left+","+(height-bottom)+" "+pointString+" "+coords[coords.length-1].x.toFixed(1)+","+(height-bottom);
  const tickIndices=historyXAxisTickIndices(points,range);
  const axisLabel=(timestamp:number)=>{
    const date=new Date(timestamp*1000);
    if(range==="1D")return date.toLocaleTimeString("en-CA",{
      hour:"numeric",minute:"2-digit",timeZone:"America/New_York"});
    if(range==="5D")return date.toLocaleDateString("en-CA",{
      weekday:"short",month:"short",day:"numeric",timeZone:"America/New_York"});
    return date.toLocaleDateString("en-CA",{
      month:"short",day:"numeric",
      ...(range==="ALL"||range==="1Y"?{year:"2-digit" as const}:{}),
      timeZone:"America/New_York",
    });
  };
  return <div className="mt-2 overflow-x-auto">
    <svg viewBox={"0 0 "+width+" "+height} role="img" aria-label={"Alpaca Paper account equity history over "+range} className="min-w-[460px] w-full">
      <defs><linearGradient id="paperHistoryArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#42bdb2" stopOpacity="0.31"/>
        <stop offset="100%" stopColor="#42bdb2" stopOpacity="0.01"/>
      </linearGradient></defs>
      {[0,0.5,1].map((ratio,i)=>{
        const y=top+ratio*(height-top-bottom);
        return <g key={i}><line x1={left} y1={y} x2={width-right} y2={y} stroke="#7790a4" strokeOpacity=".3" strokeDasharray="4 6"/><text x={left-10} y={y+4} textAnchor="end" fontSize="11" fill="#9aaabc">{dollar(high-(high-low)*ratio)}</text></g>;
      })}
      <polygon points={areaString} fill="url(#paperHistoryArea)"/>
      <polyline points={pointString} fill="none" stroke="#4ac8b7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={coords[coords.length-1].x} cy={coords[coords.length-1].y} r="4.5" fill="#77dfd0"/>
      {tickIndices.map((index,i)=><text key={index} x={coords[index].x} y={height-7}
        textAnchor={i===0?"start":i===tickIndices.length-1?"end":"middle"}
        fontSize="12" fill="#94a3b8">{axisLabel(points[index].timestamp)}</text>)}
    </svg>
  </div>;
}

