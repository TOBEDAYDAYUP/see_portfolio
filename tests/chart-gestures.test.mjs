import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyChartWheel, zoomChartViewport, panChartViewport, dragChartViewport
} from "../lib/research/chart-viewport.ts";

const gesture=(deltaX,deltaY,ctrlKey=false)=>({deltaX,deltaY,ctrlKey});
const near=(actual,expected,epsilon=1e-8)=>assert.ok(Math.abs(actual-expected)<epsilon,
  "Expected "+actual+" ≈ "+expected);

test("Mac two-finger vertical scroll never zooms the chart",()=>{
  for(const dy of [-120,-3,3,120]){
    assert.equal(classifyChartWheel(gesture(0,dy),250),"page-scroll");
  }
});
test("Mac two-finger horizontal scrolling is left to the browser, never pans timeline",()=>{
  for(const dx of [-120,-3,3,120]){
    assert.equal(classifyChartWheel(gesture(dx,0),250),"page-scroll");
    assert.equal(classifyChartWheel(gesture(dx,dx*.1),250),"page-scroll");
  }
});
test("macOS Chrome trackpad pinch zoom is still captured for populated charts",()=>{
  assert.equal(classifyChartWheel(gesture(0,-12,true),250),"pinch-zoom");
  assert.equal(classifyChartWheel(gesture(0,12,true),250),"pinch-zoom");
  assert.equal(classifyChartWheel(gesture(0,-12,true),4),"page-scroll");
  assert.equal(classifyChartWheel(gesture(0,-12,false),250),"page-scroll");
});
test("only supported finite pinch gestures capture chart scrolling",()=>{
  assert.equal(classifyChartWheel(gesture(Number.NaN,-5,true),250),"page-scroll");
  assert.equal(classifyChartWheel(gesture(0,Number.POSITIVE_INFINITY,true),250),"page-scroll");
  assert.equal(classifyChartWheel(gesture(0,0,true),250),"page-scroll");
  assert.equal(classifyChartWheel(gesture(90,-4,true),250),"pinch-zoom");
});
test("press-and-hold drag LEFT shifts visible time axis toward later data",()=>{
  const zoom=zoomChartViewport(null,251,.5,-100);
  assert.ok(zoom);
  const next=dragChartViewport(zoom,251,-60,600);
  assert.ok(next);
  assert.ok(next.start>zoom.start);
  near(next.end-next.start,zoom.end-zoom.start);
});
test("press-and-hold drag RIGHT reveals earlier dates",()=>{
  const zoom=zoomChartViewport(null,251,.5,-100);
  assert.ok(zoom);
  const next=dragChartViewport(zoom,251,60,600);
  assert.ok(next);
  assert.ok(next.start<zoom.start);
  near(next.end-next.start,zoom.end-zoom.start);
});
test("smooth successive single-finger drags preserve sub-bar distances",()=>{
  const zoom={start:30.5,end:80.5};
  const a=dragChartViewport(zoom,251,-1,800);
  assert.ok(a);
  const b=dragChartViewport(a,251,-1,800);
  assert.ok(b);
  near(b.start,30.625);
  near(b.end,80.625);
});
test("dragging never pans a full unzoomed chart or makes invalid viewports",()=>{
  assert.equal(dragChartViewport(null,251,50,800),null);
  assert.deepEqual(dragChartViewport({start:10,end:35},251,50,0),{start:10,end:35});
  assert.deepEqual(dragChartViewport({start:10,end:35},251,Number.NaN,800),{start:10,end:35});
  assert.deepEqual(dragChartViewport({start:10,end:35},251,9999,800),{start:0,end:25});
  assert.deepEqual(dragChartViewport({start:10,end:35},251,-9999,800),{start:225,end:250});
});
test("pan helper still supports arrow navigation for zoomed chart",()=>{
  const zoom={start:30,end:50};
  assert.deepEqual(panChartViewport(zoom,251,-10),{start:20,end:40});
  assert.deepEqual(panChartViewport(zoom,251,10),{start:40,end:60});
});
test("UI uses pointer capture for held drag without selection-rectangle zoom",()=>{
  const file=readFileSync(new URL("../app/components/research/advanced-stock-chart.tsx",import.meta.url),"utf8");
  for(const token of ["onPointerDown={onPointerDown}","onPointerMove={onPointerMove}",
    "onPointerUp={stopDrag}","onPointerCancel={stopDrag}",
    "onLostPointerCapture={stopDrag}","setPointerCapture(e.pointerId)",
    "dragChartViewport(current,bars.length,deltaX,",
    'classifyChartWheel(event,bars.length)',
    'if(classifyChartWheel(event,bars.length)!=="pinch-zoom")return'])
    assert.ok(file.includes(token),"Missing "+token);
  assert.equal(/setDrag\(|type:"select"|drag to select|rectangle selection|two-finger horizontal swipes pan/i.test(file),false);
});
