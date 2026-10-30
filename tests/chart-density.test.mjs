import test from "node:test";
import assert from "node:assert/strict";
import { TARGET_VISIBLE_BARS, bucketVisibleChartBars } from "../lib/research/chart-density.ts";

function marketBars(count){
 return Array.from({length:count},(_,i)=>({
  time:new Date(Date.UTC(2026,0,1,0,i)).toISOString(),
  open:100+i,high:103+i,low:98+i,close:101+i,volume:(i+1)*100,
 }));
}
const sum=(arr,fn)=>arr.reduce((total,v)=>total+fn(v),0);

test("all five ranges show exactly 50 equally spaced candles from enough real data",()=>{
 for(const sourceCount of [78,130,155,252,540]){
  const source=marketBars(sourceCount);
  const result=bucketVisibleChartBars(source,null);
  assert.equal(result.buckets.length,TARGET_VISIBLE_BARS);
  assert.equal(result.rawCount,sourceCount);
  assert.equal(sum(result.buckets,b=>b.underlyingCount),sourceCount);
 }
});

test("aggregation preserves first open, last close, maximum high, minimum low and SUM of volume",()=>{
 const input=[
  {time:"2026-01-01T10:00Z",open:20,high:25,low:18,close:23,volume:100},
  {time:"2026-01-01T11:00Z",open:23,high:26,low:22,close:24,volume:200},
  {time:"2026-01-01T12:00Z",open:24,high:25,low:17,close:18,volume:300},
  {time:"2026-01-01T13:00Z",open:18,high:24,low:16,close:22,volume:400},
 ];
 const result=bucketVisibleChartBars(input,null,2);
 assert.deepEqual(result.buckets.map(b=>b.bar),[
  {...input[0],high:26,volume:300,close:24},
  {...input[2],high:25,low:16,close:22,volume:700},
 ]);
 assert.equal(result.buckets[0].lastTime,input[1].time);
 assert.equal(result.buckets[1].underlyingCount,2);
});

test("does not invent bars when data is fewer than 50",()=>{
 for(const count of [0,1,5,21,49]){
  const result=bucketVisibleChartBars(marketBars(count),null);
  assert.equal(result.buckets.length,count);
  assert.equal(result.rawCount,count);
 }
});

test("each raw bar is counted exactly once with no lost highs or double-counted volume",()=>{
 const source=marketBars(137);
 const result=bucketVisibleChartBars(source,null);
 assert.equal(result.buckets.length,50);
 let cursor=0;
 for(const bucket of result.buckets){
  assert.equal(bucket.firstRawIndex,cursor);
  assert.ok(bucket.lastRawIndex>=cursor);
  cursor=bucket.lastRawIndex+1;
  assert.equal(bucket.bar.high,Math.max(...source.slice(bucket.firstRawIndex,bucket.lastRawIndex+1).map(r=>r.high)));
  assert.equal(bucket.bar.low,Math.min(...source.slice(bucket.firstRawIndex,bucket.lastRawIndex+1).map(r=>r.low)));
 }
 assert.equal(cursor,source.length);
 assert.equal(sum(result.buckets,b=>b.bar.volume),sum(source,b=>b.volume));
});

test("zoom window rebuckets its own underlying bars to 50, not the earlier 50 aggregates",()=>{
 const input=marketBars(1000);
 const initial=bucketVisibleChartBars(input,null);
 const zoom=bucketVisibleChartBars(input,{start:250,end:349});
 assert.equal(initial.buckets.length,50);
 assert.equal(zoom.buckets.length,50);
 assert.equal(zoom.rawCount,100);
 assert.equal(zoom.buckets[0].firstRawIndex,250);
 assert.equal(zoom.buckets.at(-1).lastRawIndex,349);
 assert.equal(zoom.buckets[0].bar.open,350);
});

test("fractional viewport respects original zoom math and never escapes range",()=>{
 const source=marketBars(500);
 const result=bucketVisibleChartBars(source,{start:111.25,end:171.25});
 assert.equal(result.rawCount,60);
 assert.equal(result.buckets.length,50);
 assert.equal(result.buckets[0].firstRawIndex,112);
 assert.equal(result.buckets.at(-1).lastRawIndex,171);
});

test("small zoom still shows only real source bars, never fills to target by fabrication",()=>{
 const bars=marketBars(200);
 const zoom=bucketVisibleChartBars(bars,{start:25,end:30});
 assert.equal(zoom.buckets.length,6);
 assert.equal(zoom.rawCount,6);
 assert.equal(zoom.buckets[0].bar.time,bars[25].time);
});

test("invalid display density parameters fail predictably",()=>{
 assert.throws(()=>bucketVisibleChartBars(marketBars(5),null,0));
 assert.throws(()=>bucketVisibleChartBars(marketBars(5),null,3.5));
});
