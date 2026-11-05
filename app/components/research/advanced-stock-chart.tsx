"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CHART_RANGES } from "../../../lib/research/chart-utils";
import { MIN_ZOOM_BARS, zoomChartViewport, panChartViewport, dragChartViewport, classifyChartWheel } from "../../../lib/research/chart-viewport";
import { TARGET_VISIBLE_BARS, bucketVisibleChartBars } from "../../../lib/research/chart-density";
import {MARKET_CHART_STYLES,isHollowCandle,marketCandleIsUp,marketTimeTickIndices,inspectionBarTimestamp,chartCursorPrice,type MarketChartStyle} from "../../../lib/research/market-chart-style";
import type { ChartPayload, ChartRange } from "../../../lib/research/chart-utils";

type Mode=MarketChartStyle;
type ChartResponse={status:"ok";data:ChartPayload}|{status:"error"|"not_configured";message:string};
type Zoom={start:number;end:number};
const money=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(v);
const compact=(v:number)=>new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(v);
const W=1000,H=440,L=22,R=78,PRICE_TOP=28,PRICE_BOTTOM=302,VOL_TOP=335,VOL_BOTTOM=394;
const usableW=W-L-R;
const formatPrice=(v:number)=>v.toFixed(2);
const candleUp="#26a69a",candleDown="#e04d64";
function timeLabel(time:string,intraday:boolean){
  const dt=new Date(time);
  if(!Number.isFinite(dt.getTime()))return time;
  return new Intl.DateTimeFormat("en-US",{
    timeZone:"America/New_York",month:"short",day:"numeric",
    ...(intraday?{hour:"numeric" as const,minute:"2-digit" as const}:{year:"numeric" as const}),
  }).format(dt);
}
function inspectionTimestamp(time:string,intraday:boolean){
  const date=new Date(time);
  if(!Number.isFinite(date.getTime()))return time;
  return new Intl.DateTimeFormat("en-US",{
    timeZone:"America/New_York",year:"numeric",month:"short",day:"numeric",
    ...(intraday?{hour:"numeric" as const,minute:"2-digit" as const,timeZoneName:"short" as const}:{}),
  }).format(date);
}
function pricePosition(price:number,low:number,high:number){
  return PRICE_TOP+(high-price)/(high-low)*(PRICE_BOTTOM-PRICE_TOP);
}
function within(v:number,lower:number,upper:number){return Math.min(upper,Math.max(lower,v));}
function HistoryChart({payload,mode,showVolume}:{
  payload:ChartPayload;mode:Mode;showVolume:boolean;
}){
  const bars=payload.bars;
  const [zoom,setZoom]=useState<Zoom|null>(null);
  const [hover,setHover]=useState<number|null>(null);
  const [hoverY,setHoverY]=useState<number|null>(null);
  const chartRef=useRef<SVGSVGElement|null>(null);
  const zoomRef=useRef<Zoom|null>(null);
  const heldPointer=useRef<{id:number;lastX:number}|null>(null);
  const [isDragging,setIsDragging]=useState(false);
  useEffect(()=>{zoomRef.current=zoom;},[zoom]);
  // A normal two-finger swipe (vertical OR horizontal) scrolls the browser.
  // Only Chrome/macOS pinch (ctrl+wheel) zooms this chart.
  useEffect(()=>{
    const element=chartRef.current;
    if(!element||bars.length<=MIN_ZOOM_BARS)return;
    const handleWheel=(event:WheelEvent)=>{
      if(classifyChartWheel(event,bars.length)!=="pinch-zoom")return;
      const rect=element.getBoundingClientRect();
      if(rect.width<=0)return;
      const unit=event.deltaMode===1?16:event.deltaMode===2?320:1;
      const viewX=(event.clientX-rect.left)/rect.width*W;
      const fraction=within((viewX-L)/usableW,0,1);
      if(event.cancelable)event.preventDefault();
      setZoom(previous=>{
        const next=zoomChartViewport(previous,bars.length,fraction,event.deltaY*unit);
        zoomRef.current=next;
        return next;
      });
    };
    element.addEventListener("wheel",handleWheel,{passive:false});
    return ()=>element.removeEventListener("wheel",handleWheel);
  },[bars.length]);
  if(!bars.length)return <div role="status" className="grid min-h-[280px] place-items-center rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
    No market bars available for this interval. Try another time range.
  </div>;
  if(bars.length===1){
    const only=bars[0];
    return <div role="status" className="my-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-5">
      <h4 className="font-semibold text-amber-200">Not enough bars to display a meaningful price chart</h4>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        The market data provider returned only one bar for this range; no line, candle series, or missing prices have been fabricated.
      </p>
      <p className="mt-3 text-xs leading-6 text-slate-300">
        Actual bar: {timeLabel(only.time,payload.interval.endsWith("Min"))} ET ·
        O {money(only.open)} · H {money(only.high)} · L {money(only.low)} ·
        C {money(only.close)} · Volume {compact(only.volume)}
      </p>
    </div>;
  }
  // Re-aggregate raw history to the same 50-candle density on every zoom.
  const density=bucketVisibleChartBars(bars,zoom);
  const visible=density.buckets.map(bucket=>bucket.bar);
  const currentHover=hover!==null&&hover>=0&&hover<visible.length?hover:null;
  const focusedGroup=density.buckets[currentHover??visible.length-1];
  const focused=focusedGroup?.bar;
  const low0=Math.min(...visible.map(b=>b.low));
  const high0=Math.max(...visible.map(b=>b.high));
  const padding=Math.max((high0-low0)*0.08,high0*.005,.001);
  const low=low0-padding, high=high0+padding;
  const volMax=Math.max(1,...visible.map(b=>b.volume));
  const x=(i:number)=>L+usableW*(i+.5)/visible.length;
  const barWidth=Math.max(1,Math.min(12,usableW/visible.length*.72));
  const path=visible.map((bar,i)=>(i===0?"M":"L")+x(i).toFixed(2)+" "+pricePosition(bar.close,low,high).toFixed(2)).join(" ");
  const areaPath=path+" L"+x(visible.length-1).toFixed(2)+" "+PRICE_BOTTOM+
    " L"+x(0).toFixed(2)+" "+PRICE_BOTTOM+" Z";
  const timelineTicks=marketTimeTickIndices(visible.length);
  const latest=visible[visible.length-1];
  const latestY=pricePosition(latest.close,low,high);
  const latestColor=latest.close>=latest.open?candleUp:candleDown;
  const intraday=payload.interval==="5Min"||payload.interval==="15Min"||payload.interval==="30Min";
  // Use the LAST REAL underlying bar timestamp in each aggregated bucket.
  // A bucket is an OHLC summary; we never claim its close happened at a midpoint.
  const focusedDate=focusedGroup
    ?inspectionTimestamp(inspectionBarTimestamp(focusedGroup),intraday)
    :"No history";
  const timeBadgeWidth=intraday?192:130;
  const cursorX=currentHover===null?0:x(currentHover);
  const badgeX=within(cursorX-timeBadgeWidth/2,L,W-R-timeBadgeWidth);
  const cursorY=focused?(hoverY??pricePosition(focused.close,low,high)):0;
  const cursorPrice=chartCursorPrice(cursorY,low,high,PRICE_TOP,PRICE_BOTTOM);
  const showLastPriceBadge=currentHover===null||Math.abs(latestY-cursorY)>22;
  function canvasX(e:ReactPointerEvent<SVGSVGElement>):number{
    const bounds=e.currentTarget.getBoundingClientRect();
    return (e.clientX-bounds.left)/bounds.width*W;
  }
  // Mac trackpad: click/press and keep the finger down, then slide
  // horizontally. No box-selection, timer or secondary finger required.
  function onPointerDown(e:ReactPointerEvent<SVGSVGElement>){
    if(e.button!==0||!e.isPrimary||!zoomRef.current||bars.length<=MIN_ZOOM_BARS)return;
    heldPointer.current={id:e.pointerId,lastX:e.clientX};
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  }
  function onPointerMove(e:ReactPointerEvent<SVGSVGElement>){
    const xp=within(canvasX(e),L,W-R);
    setHover(within(Math.floor((xp-L)/usableW*visible.length),0,visible.length-1));
    const bounds=e.currentTarget.getBoundingClientRect();
    if(bounds.height>0){
      const y=(e.clientY-bounds.top)/bounds.height*H;
      setHoverY(y>=PRICE_TOP&&y<=PRICE_BOTTOM?y:null);
    }
    const held=heldPointer.current;
    if(!held||held.id!==e.pointerId)return;
    // A released mouse button without pointerup (e.g. window focus change)
    // must never leave the timeline in a stuck drag state.
    if(e.pointerType==="mouse"&&(e.buttons&1)===0){
      heldPointer.current=null;
      setIsDragging(false);
      return;
    }
    const deltaX=e.clientX-held.lastX;
    held.lastX=e.clientX;
    const bounds=e.currentTarget.getBoundingClientRect();
    const current=zoomRef.current;
    const next=dragChartViewport(current,bars.length,deltaX,bounds.width*usableW/W);
    if(next&&current&&Math.abs(next.start-current.start)>1e-8){
      zoomRef.current=next;
      setZoom(next);
    }
  }
  function stopDrag(e:ReactPointerEvent<SVGSVGElement>){
    if(heldPointer.current?.id!==e.pointerId)return;
    heldPointer.current=null;
    setIsDragging(false);
    if(e.currentTarget.hasPointerCapture(e.pointerId)){
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }
  const badge="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-slate-300 disabled:opacity-40";
  return <div>
    <div className="market-chart-toolbar mb-2 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-1 py-2">
      <div className="min-w-0">
        <p className="text-xs text-slate-400">Historical {payload.interval} · New York time · {focusedGroup?.underlyingCount??0} source bars in selected bucket</p>
        {focused&&<div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold tabular-nums">
          <span>O {formatPrice(focused.open)}</span><span>H {formatPrice(focused.high)}</span>
          <span>L {formatPrice(focused.low)}</span><span>C {formatPrice(focused.close)}</span>
          <span className="text-slate-400">Vol {compact(focused.volume)}</span>

        </div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={badge} type="button" disabled={!zoom}
          onClick={()=>{setZoom(null);setHover(null);}}>Reset zoom</button>
        <button className={badge} type="button" disabled={!zoom} onClick={()=>{
          if(!zoom)return;
          const span=zoom.end-zoom.start;
          setZoom(previous=>panChartViewport(previous,bars.length,-Math.max(1,span/3)));
        }}>←</button>
        <button className={badge} type="button" disabled={!zoom} onClick={()=>{
          if(!zoom)return;
          const span=zoom.end-zoom.start;
          setZoom(previous=>panChartViewport(previous,bars.length,Math.max(1,span/3)));
        }}>→</button>
      </div>
    </div>
    <div className="market-chart-frame relative overflow-hidden">
    <svg ref={chartRef} viewBox={"0 0 "+W+" "+H} role="img"
      aria-label={"Interactive "+payload.interval+" stock price and volume chart. Two-finger swipes scroll the page; pinch to zoom; when zoomed in, press and hold with one finger or the mouse button, then drag left or right to pan the timeline. No box selection."}
      tabIndex={0} className={"market-price-canvas w-full touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-[#7ce0cc] "+(isDragging?"cursor-grabbing":zoom?"cursor-grab":"cursor-crosshair")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onLostPointerCapture={stopDrag}
      onPointerLeave={()=>{if(!heldPointer.current){setHover(null);setHoverY(null);}}}
      onKeyDown={e=>{
        if(e.key==="Escape"){setZoom(null);setHover(null);setHoverY(null);}
        if(e.key==="ArrowLeft"||e.key==="ArrowRight"){
          e.preventDefault();
          const next=within((currentHover??visible.length-1)+(e.key==="ArrowRight"?1:-1),0,visible.length-1);
          setHover(next);
        }
      }}>
      <defs>
        <linearGradient id="marketAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#26a69a" stopOpacity=".28"/>
          <stop offset="100%" stopColor="#26a69a" stopOpacity=".02"/>
        </linearGradient>
      </defs>
      {/* Chart price ticks are on the RIGHT, matching a trading terminal. */}
      {[0,.25,.5,.75,1].map(t=>{
        const yy=PRICE_TOP+t*(PRICE_BOTTOM-PRICE_TOP);
        return <g key={t}>
          <line x1={L} y1={yy} x2={W-R} y2={yy}
            stroke="var(--market-grid)" strokeDasharray="4 5" strokeWidth="1"/>
          <text x={W-R+10} y={yy+4} fontSize="12" fill="#8599ac"
            className="market-axis-numeric">{formatPrice(high-(high-low)*t)}</text>
        </g>;
      })}
      {timelineTicks.map(index=><line key={"grid-"+index} x1={x(index)}
        x2={x(index)} y1={PRICE_TOP} y2={showVolume?VOL_BOTTOM:PRICE_BOTTOM}
        stroke="var(--market-grid)" opacity=".65" strokeWidth=".8"/>)}
      {mode==="area"&&<path d={areaPath} fill="url(#marketAreaFill)"/>}
      {(mode==="line"||mode==="area")&&<path d={path} stroke={candleUp}
        strokeWidth="2.4" fill="none" strokeLinejoin="round" strokeLinecap="round"/>}
      {mode!=="line"&&mode!=="area"&&visible.map((bar,i)=>{
        const xx=x(i),previousClose=i>0?visible[i-1].close:null;
        const isUp=mode==="hollow-candles"
          ?marketCandleIsUp(bar,previousClose):bar.close>=bar.open;
        const color=isUp?candleUp:candleDown;
        const yHigh=pricePosition(bar.high,low,high);
        const yLow=pricePosition(bar.low,low,high);
        const yOpen=pricePosition(bar.open,low,high);
        const yClose=pricePosition(bar.close,low,high);
        const isCandle=mode==="candles"||mode==="hollow-candles";
        return <g key={i}>
          <line x1={xx} x2={xx} y1={yHigh} y2={yLow}
            stroke={color} strokeWidth="1.4"/>
          {isCandle
            ? <rect x={xx-barWidth/2} y={Math.min(yOpen,yClose)}
                width={barWidth} height={Math.max(1.5,Math.abs(yOpen-yClose))}
                fill={mode==="hollow-candles"&&isHollowCandle(bar)?"transparent":color}
                stroke={color} strokeWidth="1.25"/>
            : <>
                {mode==="bars"&&<line x1={xx-barWidth/2} y1={yOpen}
                  x2={xx} y2={yOpen} stroke={color} strokeWidth="1.5"/>}
                <line x1={xx} y1={yClose} x2={xx+barWidth/2}
                  y2={yClose} stroke={color} strokeWidth="1.5"/>
              </>}
        </g>;
      })}
      {showVolume&&<>
        <line x1={L} x2={W-R} y1={VOL_BOTTOM} y2={VOL_BOTTOM}
          stroke="var(--market-grid)" strokeWidth="1"/>
        <text x={W-R+10} y={VOL_TOP+12} fontSize="12" fill="#8599ac">
          {compact(volMax)}</text>
        <text x={W-R+10} y={VOL_BOTTOM} fontSize="12" fill="#8599ac">0</text>
        {visible.map((bar,i)=><rect key={i} x={x(i)-barWidth/2}
          y={VOL_BOTTOM-bar.volume/volMax*(VOL_BOTTOM-VOL_TOP)}
          width={barWidth}
          height={Math.max(.5,bar.volume/volMax*(VOL_BOTTOM-VOL_TOP))}
          fill={bar.close>=bar.open?candleUp:candleDown} opacity=".52"/>)}
      </>}
      {timelineTicks.map((index,k)=><text key={"time-"+index}
        x={x(index)} y={H-15} fontSize="11" fill="#879db0"
        textAnchor={k===0?"start":k===timelineTicks.length-1?"end":"middle"}>
        {timeLabel(density.buckets[index].lastTime,intraday)}
      </text>)}
      {/* Last completed source-bucket CLOSE, distinct from hover. Not a live quote. */}
      {showLastPriceBadge&&<>
        <line x1={L} x2={W-R} y1={latestY} y2={latestY}
          stroke={latestColor} opacity=".7" strokeWidth="1" strokeDasharray="2 3"/>
        <rect x={W-R+3} y={within(latestY-12,PRICE_TOP-1,PRICE_BOTTOM-24)}
          width={R-8} height="24" rx="2" fill={latestColor}/>
        <text x={W-R+(R-2)/2}
          y={within(latestY-12,PRICE_TOP-1,PRICE_BOTTOM-24)+16}
          fontSize="12" fontWeight="600" textAnchor="middle"
          style={{fill:"#ffffff"}}>{formatPrice(latest.close)}</text>
      </>}
      {focused&&currentHover!==null&&<>
        <line x1={cursorX} x2={cursorX} y1={PRICE_TOP}
          y2={showVolume?VOL_BOTTOM:PRICE_BOTTOM}
          stroke="#8b98a8" strokeDasharray="4 4" strokeWidth="1.1"/>
        <line x1={L} x2={W-R} y1={cursorY} y2={cursorY}
          stroke="#8b98a8" strokeDasharray="4 4" strokeWidth="1.1"/>
        {/* Both tooltip labels stay INSIDE the SVG, never overlap browser edge. */}
        <rect x={W-R+3} y={within(cursorY-12,PRICE_TOP-1,PRICE_BOTTOM-24)}
          width={R-8} height="24" rx="2" fill="#17181d"/>
        <text x={W-R+(R-2)/2}
          y={within(cursorY-12,PRICE_TOP-1,PRICE_BOTTOM-24)+16}
          fontSize="12" fontWeight="600" textAnchor="middle"
          style={{fill:"#ffffff"}}>{formatPrice(cursorPrice??focused.close)}</text>
        <rect x={badgeX} y={H-34} width={timeBadgeWidth} height="27"
          rx="2" fill="#17181d"/>
        <text x={badgeX+timeBadgeWidth/2} y={H-16}
          fontSize="12" fontWeight="600" textAnchor="middle"
          style={{fill:"#ffffff"}}>{focusedDate}</text>
      </>}
    </svg>
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
      <span>{visible.length} / {TARGET_VISIBLE_BARS} chart buckets · {density.rawCount} source bars · two-finger scroll · pinch to zoom · hold + drag ←→ to pan when zoomed</span>
      <span>{zoom?"Zoomed interval":"Full selected period"} · OHLCV aggregation</span>
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
    {result.data.notice&&<p role="status" className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-xs leading-6 text-amber-200">{result.data.notice}</p>}
    {result.data.bars.length<50&&<p role="status" className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-xs leading-6 text-amber-200">
      Only {result.data.bars.length} actual market bars are available in this period, so a genuine 50-candle display is not possible. No prices or volume have been invented.
    </p>}
    <HistoryChart key={symbol+"-"+range} payload={result.data} mode={mode} showVolume={showVolume}/>
    <p className="mt-3 text-[11px] leading-5 text-slate-500">
      {result.data.interval} OHLCV · split-adjusted · {result.data.source==="Alpaca SIP"?"SIP consolidated US trades & volume (delayed).":"IEX exchange-only trades & volume; not the consolidated US market."}
      {result.data.delayedMinutes>0?" Regular session only (9:30 AM–4:00 PM ET, adjusted for early closes); pre-market and after-hours excluded. Latest 20 minutes excluded; not real time.":" Provider daily/weekly OHLCV may contain extended-hours trades; not yet reconstructed as regular-session-only. Today's potentially unfinished session omitted."}
      {result.data.asOf?" Last bar: "+timeLabel(result.data.asOf,result.data.interval.endsWith("Min")||result.data.interval.endsWith("Hour"))+" ET.":""}
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
        <p className="mt-1 text-xs text-slate-400">Historical OHLCV · consolidated when available · regular hours for 1D / 5D / 1M</p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Select chart period">
        {CHART_RANGES.map(v=><button key={v} type="button" className={button(range===v)}
          aria-pressed={range===v} onClick={()=>setRange(v)}>{v==="ALL"?"All":v}</button>)}
      </div>
    </div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <button type="button" aria-pressed={volume} onClick={()=>setVolume(v=>!v)} className={button(volume)}>
        Volume {volume?"On":"Off"}
      </button>
      <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-400" htmlFor="research-chart-style">
        Chart type
        <select id="research-chart-style" value={mode}
          onChange={event=>setMode(event.target.value as Mode)}
          className="surface-field cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold">
          {MARKET_CHART_STYLES.map(option=><option key={option.value} value={option.value}>
            {option.label}
          </option>)}
        </select>
      </label>
    </div>
    <ChartForRange key={symbol+"-"+range} symbol={symbol} range={range} mode={mode} showVolume={volume}/>
  </div>;
}
