"use client";

import {useState} from "react";
import type {KeyboardEvent as ReactKeyboardEvent,PointerEvent as ReactPointerEvent} from "react";
import type { PortfolioHistoryPoint } from "../../../lib/alpaca/types";
import type { PortfolioHistoryRange } from "../../../lib/alpaca/history-range";
import {historyXAxisTickIndices} from "../../../lib/alpaca/history-display";
import {nearestHistoryObservation,formatHistoryCrosshairTime} from "../../../lib/alpaca/history-crosshair";

const dollar=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(value);

/** Actual Alpaca Paper account equity snapshots; no synthesized demo points. */
export default function PaperEquityChart({points,range}:{points:PortfolioHistoryPoint[];range:PortfolioHistoryRange}) {
  const [hoveredIndex,setHoveredIndex]=useState<number|null>(null);
  const [pinnedIndex,setPinnedIndex]=useState<number|null>(null);
  if (points.length < 2) return <p className="py-10 text-center text-sm text-slate-400">Not enough account history is available to draw a chart.</p>;
  // Restore original full-width plot: tooltips float above the SVG rather than consuming chart space.
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
  const inspectIndex=pinnedIndex??hoveredIndex;
  const activeIndex=inspectIndex!==null&&inspectIndex>=0&&inspectIndex<points.length?inspectIndex:null;
  const active=activeIndex===null?null:{
    point:points[activeIndex],coord:coords[activeIndex],
  };
  const hitTest=(event:ReactPointerEvent<SVGSVGElement>):number|null=>{
    const rect=event.currentTarget.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return null;
    const x=(event.clientX-rect.left)*width/rect.width;
    const y=(event.clientY-rect.top)*height/rect.height;
    // A 24 CSS-pixel hit radius stays usable at different responsive sizes.
    const tolerance=24*width/rect.width;
    return nearestHistoryObservation({x,y},coords,tolerance);
  };
  const movePointer=(event:ReactPointerEvent<SVGSVGElement>)=>{
    if(event.pointerType==="touch")return;
    const index=hitTest(event);
    setHoveredIndex(previous=>previous===index?previous:index);
  };
  const pressPointer=(event:ReactPointerEvent<SVGSVGElement>)=>{
    const index=hitTest(event);
    setPinnedIndex(previous=>previous===index?null:index);
    setHoveredIndex(index);
  };
  const keyboard=(event:ReactKeyboardEvent<SVGSVGElement>)=>{
    if(event.key==="Escape"){
      event.preventDefault();setPinnedIndex(null);setHoveredIndex(null);return;
    }
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
    event.preventDefault();
    const index=pinnedIndex??hoveredIndex??(points.length-1);
    const next=event.key==="Home"?0:event.key==="End"?points.length-1:
      event.key==="ArrowLeft"?Math.max(0,index-1):Math.min(points.length-1,index+1);
    setPinnedIndex(next);setHoveredIndex(null);
  };
  const dateLabel=active?formatHistoryCrosshairTime(active.point.timestamp):"";
  const valueLabel=active?dollar(active.point.equity):"";
  return <div className="relative isolate mt-2 overflow-visible">
    <svg viewBox={"0 0 "+width+" "+height} role="img"
      tabIndex={0}
      aria-label={"Interactive Alpaca Paper equity history over "+range+". Hover near the line or click to inspect a recorded equity value. Arrow keys move between snapshots; Escape clears selection."}
      onPointerMove={movePointer} onPointerDown={pressPointer}
      onPointerLeave={()=>setHoveredIndex(null)} onKeyDown={keyboard}
      className="min-w-[460px] w-full cursor-crosshair focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4ac8b7]">
      <defs><linearGradient id="paperHistoryArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#42bdb2" stopOpacity="0.31"/>
        <stop offset="100%" stopColor="#42bdb2" stopOpacity="0.01"/>
      </linearGradient></defs>
      {/* Capture pointer events in the transparent space near the line, too. */}
      <rect x={left} y={top} width={width-left-right} height={height-top-bottom}
        fill="transparent" pointerEvents="all"/>
      {[0,0.5,1].map((ratio,i)=>{
        const y=top+ratio*(height-top-bottom);
        return <g key={i}><line x1={left} y1={y} x2={width-right} y2={y} stroke="#7790a4" strokeOpacity=".3" strokeDasharray="4 6"/><text x={left-10} y={y+4} textAnchor="end" fontSize="11" fill="#9aaabc">{dollar(high-(high-low)*ratio)}</text></g>;
      })}
      <polygon points={areaString} fill="url(#paperHistoryArea)"/>
      <polyline points={pointString} fill="none" stroke="#4ac8b7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={coords[coords.length-1].x} cy={coords[coords.length-1].y} r="4.5" fill="#77dfd0"/>
      {active&&<g pointerEvents="none">
        {/* Read-only crosshair snaps to a real account equity observation. */}
        <line x1={active.coord.x} y1={top} x2={active.coord.x} y2={height-bottom}
          stroke="#49bdae" strokeWidth="1.25" strokeDasharray="5 5" opacity=".85"/>
        <line x1={active.coord.x} y1={active.coord.y} x2={width-right} y2={active.coord.y}
          stroke="#49bdae" strokeWidth="1.25" strokeDasharray="5 5" opacity=".85"/>
        <circle cx={active.coord.x} cy={active.coord.y} r="6.5"
          fill="#f0fffa" stroke="#159b8d" strokeWidth="2.5"/>
      </g>}
      {tickIndices.map((index,i)=><text key={index} x={coords[index].x} y={height-7}
        textAnchor={i===0?"start":i===tickIndices.length-1?"end":"middle"}
        fontSize="12" fill="#94a3b8">{axisLabel(points[index].timestamp)}</text>)}
    </svg>
    {active&&<>
      {/* Foreground HTML overlays do not reduce the original SVG plot width/height. */}
      <div className="chart-inspector-label chart-inspector-date pointer-events-none absolute z-50 whitespace-nowrap"
        style={{left:(active.coord.x/width*100)+"%"}}>
        {dateLabel}
      </div>
      <div className="chart-inspector-label chart-inspector-value pointer-events-none absolute z-50 whitespace-nowrap"
        style={{left:((width-right)/width*100)+"%",top:(active.coord.y/height*100)+"%"}}>
        {valueLabel}
      </div>
    </>}
    {pinnedIndex!==null&&pinnedIndex>=0&&pinnedIndex<points.length&&<p className="sr-only" aria-live="polite">{formatHistoryCrosshairTime(points[pinnedIndex].timestamp)} · {dollar(points[pinnedIndex].equity)} account equity.</p>}
  </div>;
}

