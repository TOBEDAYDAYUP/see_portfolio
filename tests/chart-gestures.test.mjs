import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyChartWheel, zoomChartViewport, panChartViewport }
  from "../lib/research/chart-viewport.ts";

const gesture=(deltaX,deltaY,ctrlKey=false)=>({deltaX,deltaY,ctrlKey});

test("ordinary Mac two-finger vertical scroll always scrolls the page",()=>{
 for(const hasZoom of [false,true]){
  for(const deltaY of [-80,-3,1,45,150]){
   assert.equal(classifyChartWheel(gesture(0,deltaY),hasZoom,250),"page-scroll");
  }
 }
});

test("mostly vertical diagonal swipes are not hijacked for time-axis panning",()=>{
 for(const input of [gesture(10,80),gesture(16,20),gesture(6,-32),gesture(0,-100)]){
  assert.equal(classifyChartWheel(input,true,300),"page-scroll");
 }
});

test("Mac Chrome trackpad pinch (ctrl+wheel) zooms only when enough source bars exist",()=>{
 assert.equal(classifyChartWheel(gesture(0,-12,true),false,200),"pinch-zoom");
 assert.equal(classifyChartWheel(gesture(0,12,true),true,200),"pinch-zoom");
 assert.equal(classifyChartWheel(gesture(0,-12,true),false,4),"page-scroll");
 assert.equal(classifyChartWheel(gesture(0,-12,false),false,200),"page-scroll");
});

test("horizontal swipe pans time axis only when zoomed into hidden history",()=>{
 assert.equal(classifyChartWheel(gesture(36,1),true,200),"horizontal-pan");
 assert.equal(classifyChartWheel(gesture(-36,-2),true,200),"horizontal-pan");
 assert.equal(classifyChartWheel(gesture(36,1),false,200),"page-scroll");
 assert.equal(classifyChartWheel(gesture(36,1),true,4),"horizontal-pan");
});

test("pinch takes priority even when trackpad movement has incidental horizontal drift",()=>{
 assert.equal(classifyChartWheel(gesture(40,-5,true),true,400),"pinch-zoom");
 assert.equal(classifyChartWheel(gesture(40,-5,false),true,400),"horizontal-pan");
});

test("non-finite wheel input never captures page scroll",()=>{
 assert.equal(classifyChartWheel(gesture(Number.NaN,10,true),true,100),"page-scroll");
 assert.equal(classifyChartWheel(gesture(10,Number.POSITIVE_INFINITY),true,100),"page-scroll");
});

test("horizontal swipe pans real zoomed raw-bar interval without changing its span",()=>{
 const bars=260;
 const initial=zoomChartViewport(null,bars,.5,-80);
 assert.ok(initial);
 const span=initial.end-initial.start;
 const next=panChartViewport(initial,bars,8.5);
 assert.ok(next);
 assert.ok(next.start>initial.start);
 assert.equal(Math.abs((next.end-next.start)-span)<1e-8,true);
});

test("Research chart no longer registers pointer-down selection or renders a drag rectangle",()=>{
 const file=readFileSync(new URL("../app/components/research/advanced-stock-chart.tsx",import.meta.url),"utf8");
 assert.ok(file.includes('if(intent==="page-scroll")return'));
 assert.ok(file.includes('classifyChartWheel(event,zoomRef.current!==null,bars.length)'));
 assert.ok(file.includes('addEventListener("wheel",handleWheel,{passive:false})'));
 assert.equal(/onPointerDown|setPointerCapture|onPointerUp|setDrag\(|drag to select|drag-to-select zoom/i.test(file),false);
});
