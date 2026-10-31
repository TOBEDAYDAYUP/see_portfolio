import test from "node:test";
import assert from "node:assert/strict";
import {parseAlpacaTradingCalendar,easternBarClock,selectRegularTradingBars}
  from "../lib/research/chart-session.ts";
import {selectStockChartBars,planStockChart} from "../lib/research/chart-utils.ts";
import {bucketVisibleChartBars} from "../lib/research/chart-density.ts";

const bar=(time,volume=100)=>({time,open:100,high:102,low:99,close:101,volume});
const sessions=()=>parseAlpacaTradingCalendar([
 {date:"2026-10-29",open:"09:30",close:"16:00"},
 {date:"2026-10-30",open:"09:30",close:"16:00"},
 {date:"2026-11-02",open:"09:30",close:"16:00"},
 {date:"2026-11-27",open:"09:30",close:"13:00"},
]);

test("screened 1D/5D range keeps 9:30 but excludes premarket 4:00 and after-hours 16:00 onward",()=>{
 const data=[
  bar("2026-10-30T08:00:00Z",9999), // 04:00 EDT
  bar("2026-10-30T13:25:00Z"),      // 09:25 EDT
  bar("2026-10-30T13:30:00Z"),      // 09:30 EDT
  bar("2026-10-30T19:55:00Z"),      // 15:55 EDT
  bar("2026-10-30T20:00:00Z",8888), // 16:00 EDT (after)
  bar("2026-10-30T23:45:00Z",9999), // 19:45 EDT (after)
 ];
 for(const range of ["1D","5D","1M"]){
  const filtered=selectRegularTradingBars(data,range,sessions());
  assert.deepEqual(filtered.map(x=>x.time),[
   "2026-10-30T13:30:00Z","2026-10-30T19:55:00Z",
  ]);
  assert.equal(filtered.reduce((s,b)=>s+b.volume,0),200);
 }
});

test("New York DST conversion uses EDT in October and EST after November 1",()=>{
 assert.deepEqual(easternBarClock("2026-10-30T13:30:00Z"),
  {date:"2026-10-30",time:"09:30"});
 assert.deepEqual(easternBarClock("2026-11-02T14:30:00Z"),
  {date:"2026-11-02",time:"09:30"});
 const selected=selectRegularTradingBars([
  bar("2026-11-02T13:30:00Z"), // 08:30 EST, excluded
  bar("2026-11-02T14:30:00Z"), // 09:30 EST
  bar("2026-11-02T20:55:00Z"), // 15:55 EST
  bar("2026-11-02T21:00:00Z"), // 16:00 EST
 ],"1D",sessions());
 assert.equal(selected.length,2);
 assert.equal(selected[0].time,"2026-11-02T14:30:00Z");
});

test("early-close calendar excludes post-13:00 bars on day after Thanksgiving",()=>{
 const selected=selectRegularTradingBars([
  bar("2026-11-27T14:30:00Z"), // 09:30 EST
  bar("2026-11-27T17:30:00Z"), // 12:30 EST
  bar("2026-11-27T18:00:00Z"), // 13:00 EST
  bar("2026-11-27T20:00:00Z"), // 15:00 EST
 ],"1M",sessions());
 assert.equal(selected.length,2);
 assert.equal(selected.at(-1).time,"2026-11-27T17:30:00Z");
});

test("trading calendar rejects malformed inputs rather than accidentally widening hours",()=>{
 assert.throws(()=>parseAlpacaTradingCalendar({date:"2026-10-30"}));
 assert.throws(()=>parseAlpacaTradingCalendar([{date:"2026-10-30",open:"16:00",close:"09:30"}]));
 assert.throws(()=>parseAlpacaTradingCalendar([{date:"2026-10-30",open:"9:30",close:"16:00"}]));
 assert.equal(parseAlpacaTradingCalendar([]).size,0);
});

test("market holidays are excluded when authoritative trading calendar is available",()=>{
 const data=[bar("2026-10-31T13:30:00Z"),bar("2026-10-30T13:30:00Z")];
 const result=selectRegularTradingBars(data,"1M",sessions());
 assert.deepEqual(result.map(b=>b.time),["2026-10-30T13:30:00Z"]);
});

test("filtering before selecting latest session avoids a premarket-only today hiding yesterday",()=>{
 const all=[
  bar("2026-10-29T13:30:00Z"),
  bar("2026-10-29T19:55:00Z"),
  bar("2026-10-30T08:00:00Z"),
  bar("2026-10-30T12:15:00Z"),
 ];
 const filtered=selectRegularTradingBars(all,"1D",sessions());
 const latest=selectStockChartBars(filtered,"1D");
 assert.equal(latest.length,2);
 assert.equal(latest[0].time,"2026-10-29T13:30:00Z");
});

test("50 candles preserve RTH-only OHLCV and exclude oversized after-hours volume",()=>{
 const source=[];
 for(let minute=0;minute<78;minute++){
  const timestamp=Date.parse("2026-10-30T13:30:00Z")+minute*5*60_000;
  source.push(bar(new Date(timestamp).toISOString(),100));
 }
 source.unshift(bar("2026-10-30T12:00:00Z",2_000_000));
 source.push(bar("2026-10-30T23:45:00Z",5_000_000));
 const regular=selectRegularTradingBars(source,"1D",sessions());
 assert.equal(regular.length,78);
 const visual=bucketVisibleChartBars(regular,null);
 assert.equal(visual.buckets.length,50);
 assert.equal(visual.buckets.reduce((s,b)=>s+b.bar.volume,0),7800);
 assert.equal(visual.buckets[0].firstTime,"2026-10-30T13:30:00.000Z");
});

test("month requests 30-minute bars so their whole source intervals fit inside 09:30-16:00",()=>{
 const planned=planStockChart("1M",new Date("2026-10-30T23:00:00Z"));
 assert.equal(planned.interval,"30Min");
 assert.equal(planned.intraday,true);
 assert.equal(planned.end,"2026-10-30T22:40:00.000Z");
});

test("provider daily and weekly data are not misrepresented as session-filtered intraday",()=>{
 const data=[bar("2026-10-30T22:00:00Z")];
 assert.deepEqual(selectRegularTradingBars(data,"1Y",sessions()),data);
 assert.deepEqual(selectRegularTradingBars(data,"ALL",sessions()),data);
});
