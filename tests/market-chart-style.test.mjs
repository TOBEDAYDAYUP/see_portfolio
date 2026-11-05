import test from "node:test";
import assert from "node:assert/strict";
import {MARKET_CHART_STYLES,isMarketChartStyle,
 isHollowCandle,marketCandleIsUp,inspectionBarTimestamp,marketTimeTickIndices}
 from "../lib/research/market-chart-style.ts";

test("exactly six requested trading chart styles with unique identifiers",()=>{
 const styles=MARKET_CHART_STYLES.map(item=>item.value);
 assert.deepEqual(styles,[
  "bars","candles","hollow-candles","hlc","line","area",
 ]);
 assert.equal(new Set(styles).size,6);
 assert.deepEqual(MARKET_CHART_STYLES.map(s=>s.label),[
  "Bars","Candles","Hollow Candles","HLC","Line","Line with Market Area",
 ]);
 for(const style of styles)assert.equal(isMarketChartStyle(style),true);
 for(const invalid of ["ohlc","candlestick","volume","candles<script>"])
  assert.equal(isMarketChartStyle(invalid),false);
});
test("hollow body depends on own open versus close, not previous close",()=>{
 assert.equal(isHollowCandle({open:100,close:110}),true);
 assert.equal(isHollowCandle({open:100,close:100}),true);
 assert.equal(isHollowCandle({open:110,close:100}),false);
});
test("hollow candle color compares against previous close independently of body",()=>{
 assert.equal(marketCandleIsUp({open:110,close:108},105),true);
 assert.equal(isHollowCandle({open:110,close:108}),false);
 assert.equal(marketCandleIsUp({open:103,close:108},110),false);
 assert.equal(isHollowCandle({open:103,close:108}),true);
 assert.equal(marketCandleIsUp({open:100,close:120},null),true);
});
test("crosshair timestamp is last REAL underlying source bar, not midpoint",()=>{
 assert.equal(inspectionBarTimestamp({lastTime:"2026-11-04T20:30:00Z"}),
  "2026-11-04T20:30:00Z");
});
test("time ticks always refer to real existing bucket indices",()=>{
 assert.deepEqual(marketTimeTickIndices(50),[0,8,16,25,33,41,49]);
 assert.deepEqual(marketTimeTickIndices(2),[0,1]);
 assert.deepEqual(marketTimeTickIndices(1),[0]);
 assert.deepEqual(marketTimeTickIndices(0),[]);
 assert.deepEqual(marketTimeTickIndices(5,3),[0,2,4]);
});
