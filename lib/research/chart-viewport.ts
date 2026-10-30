/**
 * Client-only chart viewport math. Float-index bounds make fine trackpad
 * gestures accumulate smoothly, instead of rounding each small wheel delta
 * to zero (which otherwise makes pinching appear unresponsive).
 */
export type ChartViewport={start:number;end:number};
export const MIN_ZOOM_BARS=5;
const clamp=(x:number,low:number,high:number)=>Math.max(low,Math.min(x,high));

/**
 * Negative wheel delta zooms IN. Positive zooms OUT.
 * Preserve the data coordinate beneath the pointer whenever possible.
 * Returns null to represent the complete unzoomed interval.
 */
export function zoomChartViewport(
  current:ChartViewport|null,totalBars:number,pointerFraction:number,
  wheelDeltaY:number,
):ChartViewport|null{
  if(totalBars<=MIN_ZOOM_BARS||!Number.isFinite(wheelDeltaY)||wheelDeltaY===0)return current;
  const full=totalBars-1;
  const old=current??{start:0,end:full};
  const fraction=clamp(Number.isFinite(pointerFraction)?pointerFraction:.5,0,1);
  const scale=Math.exp(clamp(wheelDeltaY,-150,150)*0.004);
  const span=clamp((old.end-old.start)*scale,MIN_ZOOM_BARS-1,full);
  if(span>=full-1e-6)return null;
  const anchor=old.start+(old.end-old.start)*fraction;
  const start=clamp(anchor-fraction*span,0,full-span);
  return {start,end:start+span};
}

/** Pan in units of bars; fractional deltas work for smooth trackpad swipes. */
export function panChartViewport(
  current:ChartViewport|null,totalBars:number,deltaBars:number,
):ChartViewport|null{
  if(!current||totalBars<2||!Number.isFinite(deltaBars)||deltaBars===0)return current;
  const span=clamp(current.end-current.start,0,totalBars-1);
  const start=clamp(current.start+deltaBars,0,totalBars-1-span);
  return {start,end:start+span};
}

/** Convert a pointer fraction to a valid data-bar index for crosshairs. */
export function viewportBarIndex(
  viewport:ChartViewport|null,totalBars:number,pointerFraction:number,
):number{
  if(totalBars<=1)return 0;
  const range=viewport??{start:0,end:totalBars-1};
  const position=range.start+clamp(pointerFraction,0,1)*(range.end-range.start);
  return clamp(Math.round(position),Math.ceil(range.start-1e-8),Math.floor(range.end+1e-8));
}
