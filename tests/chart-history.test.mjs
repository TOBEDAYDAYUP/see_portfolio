import test from "node:test";
import assert from "node:assert/strict";
import { CHART_RANGES, planStockChart, parseStockChartBar, selectStockChartBars, marketDateNY, assessChartCoverage } from "../lib/research/chart-utils.ts";

const row=(time,open,high,low,close,volume)=>({t:time,o:open,h:high,l:low,c:close,v:volume});
test("chart supports exactly 1D,5D,1M,1Y,ALL with real distinct granularity",()=>{
  assert.deepEqual(CHART_RANGES,["1D","5D","1M","1Y","ALL"]);
  const now=new Date("2026-10-30T23:00:00.000Z");
  assert.equal(planStockChart("1D",now).interval,"5Min");
  assert.equal(planStockChart("5D",now).interval,"15Min");
  assert.equal(planStockChart("1M",now).interval,"1Day");
  assert.equal(planStockChart("1Y",now).interval,"1Day");
  assert.equal(planStockChart("ALL",now).interval,"1Week");
  assert.equal(planStockChart("ALL",now).start,"2016-01-01");
  assert.equal(planStockChart("1M",now).start,"2026-09-29");
  assert.equal(planStockChart("1Y",now).start,"2025-10-29");
  assert.equal(planStockChart("1M",now).end,"2026-10-29");
  assert.equal(planStockChart("1Y",now).end,"2026-10-29");
});
test("intraday excludes 20 minutes and daily bars exclude unfinished NY trading date",()=>{
  const now=new Date("2026-10-30T20:00:00.000Z");
  const intraday=planStockChart("1D",now);
  assert.equal(intraday.end,"2026-10-30T19:40:00.000Z");
  assert.equal(intraday.intraday,true);
  const daily=planStockChart("1M",now);
  assert.equal(daily.end,"2026-10-29");
  assert.equal(daily.intraday,false);
});
test("timezone grouping handles premarket and DST boundaries",()=>{
  assert.equal(marketDateNY("2026-10-30T13:30:00Z"),"2026-10-30");
  assert.equal(marketDateNY("2026-11-02T14:30:00Z"),"2026-11-02");
  assert.equal(marketDateNY("2026-10-31T02:00:00Z"),"2026-10-30");
});
test("validated Alpaca OHLCV fields preserve real prices and real IEX volume",()=>{
  const data=parseStockChartBar(row("2026-10-29T13:30:00Z",100,105,98,104,123456));
  assert.deepEqual(data,{time:"2026-10-29T13:30:00Z",open:100,high:105,low:98,close:104,volume:123456});
  assert.equal(parseStockChartBar(row("2026-10-29T13:30:00Z",100,105,98,106,400)),null);
  assert.equal(parseStockChartBar(row("2026-10-29T13:30:00Z",100,105,98,104,-3)),null);
  assert.equal(parseStockChartBar(row("invalid",100,105,98,104,400)),null);
  assert.equal(parseStockChartBar({t:"2026-10-29T13:30:00Z",o:10,c:12,v:5}),null);
});
test("1D displays only latest session rather than all seven days",()=>{
  const src=[
    parseStockChartBar(row("2026-10-28T13:30:00Z",10,11,9,10.5,100)),
    parseStockChartBar(row("2026-10-29T13:30:00Z",12,13,11,12.2,120)),
    parseStockChartBar(row("2026-10-29T13:45:00Z",12,13,11,12.3,140)),
  ].filter(Boolean);
  const chosen=selectStockChartBars(src,"1D");
  assert.deepEqual(chosen.map(x=>x.close),[12.2,12.3]);
});
test("5D includes last five sessions and deduplicates identical bar timestamps",()=>{
  const source=Array.from({length:7},(_,i)=>({
    time:new Date(Date.UTC(2026,9,20+i,14,30)).toISOString(),
    open:100,high:110,low:90,close:100+i,volume:100+i,
  }));
  source.push({...source.at(-1)});
  const selected=selectStockChartBars(source,"5D");
  assert.equal(selected.length,5);
  assert.equal(selected[0].close,102);
  assert.equal(selected.at(-1).close,106);
});
test("empty bars and sorting produce no fake prices",()=>{
  assert.deepEqual(selectStockChartBars([],"1D"),[]);
  assert.deepEqual(selectStockChartBars([],"ALL"),[]);
  const rows=[
    {time:"2026-10-30T10:00:00Z",open:4,high:5,low:3,close:4,volume:10},
    {time:"2026-10-29T10:00:00Z",open:4,high:5,low:3,close:3,volume:10},
  ];
  assert.equal(selectStockChartBars(rows,"1Y")[0].close,3);
});

test("single stale intraday IEX bar is insufficient to call a one-day chart complete",()=>{
  const bars=[{time:"2026-10-27T19:00:00Z",open:2.28,high:2.28,low:2.28,close:2.28,volume:500}];
  assert.equal(assessChartCoverage("1D",bars),"insufficient");
  assert.equal(selectStockChartBars(bars,"1D").length,1);
});

test("limited intraday/monthly data is flagged without inventing volume or flat candles",()=>{
  const bars=Array.from({length:23},(_,i)=>({
    time:new Date(Date.UTC(2026,8,29+i,20)).toISOString(),
    open:3.2,high:3.2,low:3.2,close:3.2,volume:i===5?500:0,
  }));
  assert.equal(assessChartCoverage("1D",bars),"sufficient");
  assert.equal(assessChartCoverage("5D",bars),"limited");
  assert.equal(assessChartCoverage("1M",bars),"sufficient");
  assert.equal(assessChartCoverage("1Y",bars),"limited");
  assert.equal(bars.filter(b=>b.volume===0).length,22);
});

test("no market bars are always insufficient, irrespective of selected range",()=>{
  for(const range of CHART_RANGES)assert.equal(assessChartCoverage(range,[]),"insufficient");
});
