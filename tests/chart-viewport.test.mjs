import test from "node:test";
import assert from "node:assert/strict";
import { zoomChartViewport, panChartViewport, viewportBarIndex, MIN_ZOOM_BARS } from "../lib/research/chart-viewport.ts";

const near=(actual,expected,tol=1e-8)=>assert.ok(Math.abs(actual-expected)<tol,
  "Expected "+actual+" near "+expected);

test("scroll-up zooms in and retains the bar beneath the mouse pointer",()=>{
  const zoom=zoomChartViewport(null,101,.25,-80);
  assert.ok(zoom);
  assert.ok(zoom.end-zoom.start<100);
  near(zoom.start+(zoom.end-zoom.start)*.25,25);
  assert.ok(zoom.start>=0 && zoom.end<=100);
});
test("scroll-down zooms out, reset viewport when reaching full selected period",()=>{
  const close=zoomChartViewport(null,101,.6,-75);
  assert.ok(close);
  const far=zoomChartViewport(close,101,.6,500);
  assert.equal(far,null);
});
test("fine trackpad deltas accumulate instead of getting rounded to zero",()=>{
  let view=null;
  for(let i=0;i<20;i++)view=zoomChartViewport(view,251,.5,-1.25);
  assert.ok(view);
  assert.ok(view.end-view.start<251-1-15);
  near(view.start+(.5*(view.end-view.start)),125);
});
test("minimum zoom keeps at least five bars and valid ranges at both edges",()=>{
  let left=null,right=null;
  for(let i=0;i<20;i++){
    left=zoomChartViewport(left,250,0,-140);
    right=zoomChartViewport(right,250,1,-140);
  }
  assert.ok(left&&right);
  assert.ok(left.end-left.start>=MIN_ZOOM_BARS-1-1e-8);
  assert.ok(right.end-right.start>=MIN_ZOOM_BARS-1-1e-8);
  near(left.start,0);
  near(right.end,249);
});
test("zoom remains disabled for sparse single-bar chart and all five-bar views",()=>{
  assert.equal(zoomChartViewport(null,1,.5,-100),null);
  assert.equal(zoomChartViewport(null,MIN_ZOOM_BARS,.5,-100),null);
});
test("pan respects data boundaries and fractional trackpad distances",()=>{
  const view={start:30.25,end:60.25};
  const moved=panChartViewport(view,101,.375);
  assert.ok(moved);
  near(moved.start,30.625);
  near(moved.end,60.625);
  assert.deepEqual(panChartViewport(view,101,-100),{start:0,end:30});
  assert.deepEqual(panChartViewport(view,101,100),{start:70,end:100});
  assert.equal(panChartViewport(null,101,10),null);
});
test("pointer-to-data crosshair correctly observes fractional zoom",()=>{
  const view={start:5.5,end:15.5};
  assert.equal(viewportBarIndex(view,50,0),6);
  assert.equal(viewportBarIndex(view,50,1),15);
  assert.equal(viewportBarIndex(view,50,.5),11);
  assert.equal(viewportBarIndex(null,1,.5),0);
  assert.equal(viewportBarIndex(null,11,1),10);
});
test("out-of-range pointer positions and invalid wheel events are safely clamped",()=>{
  const initial={start:10,end:30};
  assert.equal(zoomChartViewport(initial,101,.5,Number.NaN),initial);
  near(zoomChartViewport(initial,101,-2,-30).start,10);
  const right=zoomChartViewport(initial,101,5,-30);
  assert.ok(right);
  near(right.end,30);
});
