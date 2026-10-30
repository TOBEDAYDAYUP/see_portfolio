"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CHART_RANGES } from "../../../lib/research/chart-utils";
import type { ChartPayload, ChartRange, ChartBar } from "../../../lib/research/chart-utils";

type Mode="candles"|"line"|"bars";
type ChartResponse={status:"ok";data:ChartPayload}|{status:"error"|"not_configured";message:string};
type Zoom={start:number;end:number};
const money=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(v);
const compact=(v:number)=>new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(v);
const W=1000,H=440,L=66,R=18,PRICE_TOP=25,PRICE_BOTTOM=302,VOL_TOP=335,VOL_BOTTOM=394;
const usableW=W-L-R;
function timeLabel(time:string,intraday:boolean){
  const dt=new Date(time);
  if(!Number.isFinite(dt.getTime()))return time;
  return new Intl.DateTimeFormat("en-US",{
    timeZone:"America/New_York",month:"short",day:"numeric",
    ...(intraday?{hour:"numeric" as const,minute:"2-digit" as const}:{year:"numeric" as const}),
  }).format(dt);
}
function pricePosition(price:number,low:number,high:number){
  return PRICE_TOP+(high-price)/(high-low)*(PRICE_BOTTOM-PRICE_TOP);
}
function scrollToAbsolute(pointerX:number,length:number):number{
  return Math.max(0,Math.min(length-1,Math.round((pointerX-L)/usableW*(length-1))));
}
function within(v:number,lower:number,upper:number){return Math.min(upper,Math.max(lower,v));}
function HistoryChart({payload,mode,showVolume}:{
  payload:ChartPayload;mode:Mode;showVolume:boolean;
}){
  const bars=payload.bars;
  const [zoom,setZoom]=useState<Zoom|null>(null);
  const [hover,setHover]=useState<number|null>(null);
  const [drag,setDrag]=useState<{x0:number;x1:number}|null>(null);
  const dragging=useRef<{type:"select"|"pan";x0:number;zoom0:Zoom|null}|null>(null);
  if(!bars.length)return <div role="status" className="grid min-h-[280px] place-items-center rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
    No IEX bars available for this interval. Try another time range.
  </div>;
  const effectiveZoom=zoom??{start:0,end:bars.length-1};
  const visible=bars.slice(effectiveZoom.start,effectiveZoom.end+1);
  const focused=bars[hover??effectiveZoom.end]??visible.at(-1);
  const low0=Math.min(...visible.map(b=>b.low));
  const high0=Math.max(...visible.map(b=>b.high));
  const padding=Math.max((high0-low0)*0.08,high0*.005,.001);
  const low=low0-padding, high=high0+padding;
  const volMax=Math.max(1,...visible.map(b=>b.volume));
  const x=(i:number)=>L+usableW*(visible.length===1?.5:i/(visible.length-1));
  const barWidth=Math.max(1,Math.min(12,usableW/Math.max(2,visible.length)*.65));
  const path=visible.map((bar,i)=>(i===0?"M":"L")+x(i).toFixed(2)+" "+pricePosition(bar.close,low,high).toFixed(2)).join(" ");
  const intraday=payload.interval==="5Min"||payload.interval==="15Min";
  function canvasX(e:ReactPointerEvent<SVGSVGElement>):number{
    const bounds=e.currentTarget.getBoundingClientRect();
    return (e.clientX-bounds.left)/bounds.width*W;
  }
  const indexAt=(screenX:number)=>effectiveZoom.start+scrollToAbsolute(screenX,visible.length);
  function onPointerDown(e:ReactPointerEvent<SVGSVGElement>){
    if(e.button!==0)return;
    const x0=within(canvasX(e),L,W-R);
    dragging.current={type:e.shiftKey&&zoom?"pan":"select",x0,zoom0:zoom};
    setDrag({x0,x1:x0});
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e:ReactPointerEvent<SVGSVGElement>){
    const xp=within(canvasX(e),L,W-R);
    setHover(indexAt(xp));
    const state=dragging.current;
    if(!state)return;
    if(state.type==="select")setDrag({x0:state.x0,x1:xp});
    else if(state.zoom0){
      const base=state.zoom0,span=base.end-base.start;
      const offset=Math.round((state.x0-xp)/usableW*span);
      const from=within(base.start+offset,0,bars.length-1-span);
      setZoom({start:from,end:from+span});
    }
  }
  function onPointerUp(e:ReactPointerEvent<SVGSVGElement>){
    const state=dragging.current;
    if(state?.type==="select"){
      const xp=within(canvasX(e),L,W-R);
      if(Math.abs(xp-state.x0)>=18 && visible.length>8){
        const from=within(indexAt(Math.min(xp,state.x0)),0,bars.length-1);
        const to=within(indexAt(Math.max(xp,state.x0)),from,bars.length-1);
        if(to-from>=3)setZoom({start:from,end:to});
      }
    }
    dragging.current=null;setDrag(null);
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const badge="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-slate-300 disabled:opacity-40";
  return <div>
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3 rounded-xl bg-[#172d42]/70 px-3 py-3">
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{focused?timeLabel(focused.time,intraday):"No history"} · {payload.interval} · New York time</p>
        {focused&&<div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold tabular-nums">
          <span>O {money(focused.open)}</span><span>H {money(focused.high)}</span>
          <span>L {money(focused.low)}</span><span>C {money(focused.close)}</span>
          <span className="text-slate-400">Vol {compact(focused.volume)}</span>
        </div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={badge} type="button" disabled={!zoom}
          onClick={()=>{setZoom(null);setHover(null);}}>Reset zoom</button>
        <button className={badge} type="button" disabled={!zoom} onClick={()=>{
          if(!zoom)return;
          const span=zoom.end-zoom.start,from=within(zoom.start-Math.max(1,Math.floor(span/3)),0,bars.length-1-span);
          setZoom({start:from,end:from+span});
        }}>←</button>
        <button className={badge} type="button" disabled={!zoom} onClick={()=>{
          if(!zoom)return;
          const span=zoom.end-zoom.start,from=within(zoom.start+Math.max(1,Math.floor(span/3)),0,bars.length-1-span);
          setZoom({start:from,end:from+span});
        }}>→</button>
      </div>
    </div>
    <svg viewBox={"0 0 "+W+" "+H} role="img"
      aria-label={"Interactive "+payload.interval+" stock price and volume chart. Drag to zoom; shift-drag to pan. Use time range buttons or chart navigation arrows."}
      tabIndex={0} className="w-full touch-pan-y cursor-crosshair select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#7ce0cc]"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerCancel={()=>{dragging.current=null;setDrag(null);}}
      onPointerLeave={()=>{if(!dragging.current)setHover(null);}}
      onKeyDown={e=>{
        if(e.key==="Escape"){setZoom(null);setHover(null);}
        if(e.key==="ArrowLeft"||e.key==="ArrowRight"){
          e.preventDefault();
          const next=within((hover??effectiveZoom.end)+(e.key==="ArrowRight"?1:-1),effectiveZoom.start,effectiveZoom.end);
          setHover(next);
        }
      }}>
      {[0,.25,.5,.75,1].map(t=>{
        const yy=PRICE_TOP+t*(PRICE_BOTTOM-PRICE_TOP);
        return <g key={t}>
          <line x1={L} y1={yy} x2={W-R} y2={yy} stroke="#8293a4" strokeDasharray="4 6" opacity=".32"/>
          <text x={L-8} y={yy+4} textAnchor="end" fontSize="12" fill="#8599ac">{money(high-(high-low)*t)}</text>
        </g>;
      })}
      {mode==="line"&&<path d={path} stroke="#42bcae" strokeWidth="2.7" fill="none" strokeLinejoin="round" strokeLinecap="round"/>}
      {mode!=="line"&&visible.map((bar,i)=>{
        const xx=x(i),green=bar.close>=bar.open,color=green?"#32ac9c":"#db7890";
        const yHigh=pricePosition(bar.high,low,high),yLow=pricePosition(bar.low,low,high);
        const yOpen=pricePosition(bar.open,low,high),yClose=pricePosition(bar.close,low,high);
        return <g key={bar.time}>
          <line x1={xx} x2={xx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1.4}/>
          {mode==="candles"
            ? <rect x={xx-barWidth/2} y={Math.min(yOpen,yClose)} width={barWidth}
                height={Math.max(1.5,Math.abs(yOpen-yClose))} fill={color}/>
            : <>
                <line x1={xx-barWidth/2} y1={yOpen} x2={xx} y2={yOpen} stroke={color} strokeWidth={1.4}/>
                <line x1={xx} y1={yClose} x2={xx+barWidth/2} y2={yClose} stroke={color} strokeWidth={1.4}/>
              </>}
        </g>;
      })}
      {showVolume&&<>
        <line x1={L} x2={W-R} y1={VOL_BOTTOM} y2={VOL_BOTTOM} stroke="#8293a4" opacity=".4"/>
        <text x={L-8} y={VOL_TOP+12} textAnchor="end" fontSize="12" fill="#8599ac">{compact(volMax)}</text>
        <text x={L-8} y={VOL_BOTTOM} textAnchor="end" fontSize="12" fill="#8599ac">0</text>
        {visible.map((bar,i)=><rect key={bar.time} x={x(i)-barWidth/2}
          y={VOL_BOTTOM-bar.volume/volMax*(VOL_BOTTOM-VOL_TOP)}
          width={barWidth} height={Math.max(.5,bar.volume/volMax*(VOL_BOTTOM-VOL_TOP))}
          fill={bar.close>=bar.open?"#59bdac":"#d7899c"} opacity=".8"/>)}
      </>}
      {focused&&hover!==null&&hover>=effectiveZoom.start&&hover<=effectiveZoom.end&&<>
        <line x1={x(hover-effectiveZoom.start)} x2={x(hover-effectiveZoom.start)} y1={PRICE_TOP} y2={showVolume?VOL_BOTTOM:PRICE_BOTTOM}
          stroke="#a3b6ca" strokeDasharray="4 4" strokeWidth="1.2"/>
        <line x1={L} x2={W-R} y1={pricePosition(focused.close,low,high)} y2={pricePosition(focused.close,low,high)}
          stroke="#a3b6ca" strokeDasharray="3 5" opacity=".5"/>
      </>}
      {drag&&Math.abs(drag.x0-drag.x1)>0&&<rect x={Math.min(drag.x0,drag.x1)} y={PRICE_TOP}
        width={Math.abs(drag.x1-drag.x0)} height={showVolume?VOL_BOTTOM-PRICE_TOP:PRICE_BOTTOM-PRICE_TOP}
        fill="#83e3cd" opacity=".16" stroke="#4cbfb3"/>}
      <text x={L} y={H-17} fontSize="12" fill="#879db0">{timeLabel(visible[0].time,intraday)}</text>
      <text x={W-R} y={H-17} fontSize="12" fill="#879db0" textAnchor="end">{timeLabel(visible.at(-1)!.time,intraday)}</text>
    </svg>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
      <span>{visible.length} bars in view · drag to zoom · Shift+drag to pan · arrows to browse · Esc to reset</span>
      <span>{zoom?"Zoomed interval":"Full selected period"}</span>
    </div>
  </div>;
}
function ChartForRange({symbol,range,mode,showVolume}:{
  symbol:string;range:ChartRange;mode:Mode;showVolume:boolean;
}){
  const [result,setResult]=useState<ChartResponse|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    void (async()=>{
      try{
        const response=await fetch("/api/research/chart?symbol="+encodeURIComponent(symbol)+"&range="+range,
          {cache:"no-store",signal:controller.signal});
        const data:ChartResponse=await response.json();
        if(!controller.signal.aborted)setResult(data);
      }catch{
        if(!controller.signal.aborted)setResult({status:"error",message:"Unable to load price and volume bars."});
      }
    })();
    return ()=>controller.abort();
  },[symbol,range]);
  if(!result)return <div role="status" className="grid min-h-[300px] place-items-center text-sm text-slate-400">Loading {range} Alpaca OHLCV market data…</div>;
  if(result.status!=="ok")return <p role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-200">{result.message}</p>;
  return <>
    <HistoryChart key={symbol+"-"+range} payload={result.data} mode={mode} showVolume={showVolume}/>
    <p className="mt-3 text-[11px] leading-5 text-slate-500">
      {result.data.interval} OHLCV · split-adjusted · IEX exchange only, not consolidated US trading volume.
      {result.data.delayedMinutes>0?" Latest 20 minutes excluded; not real time.":" Daily/weekly bars omit today's potentially unfinished session."}
      {result.data.asOf?" Last bar: "+timeLabel(result.data.asOf,result.data.interval.endsWith("Min"))+" ET.":""}
      {range==="ALL"?" All available weekly history requested since 2016.":""}
    </p>
  </>;
}
export default function AdvancedStockChart({symbol}:{symbol:string}){
  const [range,setRange]=useState<ChartRange>("1M");
  const [mode,setMode]=useState<Mode>("candles");
  const [volume,setVolume]=useState(true);
  const selected="bg-[#2e6b63] text-[#b3f5e4] border-[#488f82]";
  const unselected="bg-transparent text-slate-400 border-white/15 hover:text-slate-100";
  const button=(active:boolean)=>"rounded-lg border px-3 py-2 text-xs font-semibold transition-colors "+(active?selected:unselected);
  return <div className="mt-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
      <div>
        <h3 className="text-base font-semibold">Price &amp; Trading Volume</h3>
        <p className="mt-1 text-xs text-slate-400">IEX OHLCV · interactive historical chart</p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Select chart period">
        {CHART_RANGES.map(v=><button key={v} type="button" className={button(range===v)}
          aria-pressed={range===v} onClick={()=>setRange(v)}>{v==="ALL"?"All":v}</button>)}
      </div>
    </div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose price chart style">
        {([["candles","Candles"],["line","Line"],["bars","OHLC Bars"]] as const).map(([value,label])=><button
          key={value} className={button(mode===value)} aria-pressed={mode===value}
          type="button" onClick={()=>setMode(value)}>{label}</button>)}
      </div>
      <button type="button" aria-pressed={volume} onClick={()=>setVolume(v=>!v)} className={button(volume)}>
        Volume {volume?"On":"Off"}
      </button>
    </div>
    <ChartForRange key={symbol+"-"+range} symbol={symbol} range={range} mode={mode} showVolume={volume}/>
  </div>;
}
