import test from "node:test";
import assert from "node:assert/strict";
import {newYorkSessionDate,lastFiveMarketSessions,historyXAxisTickIndices}
 from "../lib/alpaca/history-display.ts";

const sample=(iso,hour=15)=>({
 timestamp:Date.parse(iso+"T"+String(hour).padStart(2,"0")+":00:00Z")/1000,
 equity:100000,
});
test("NY dates are derived using timezone rather than assuming UTC calendar day",()=>{
 assert.equal(newYorkSessionDate(Date.parse("2026-11-04T02:00:00Z")/1000),"2026-11-03");
 assert.equal(newYorkSessionDate(NaN),null);
});
test("5D selects last five observed weekday sessions across a weekend and a holiday",()=>{
 // Mon 26, Tue 27, Thu 29, Fri 30, Mon Nov 2, Tue Nov 3;
 // no Wed 28 (hypothetical market holiday), and weekends must be excluded.
 const dates=["2026-10-26","2026-10-27","2026-10-29","2026-10-30",
  "2026-10-31","2026-11-01","2026-11-02","2026-11-03"];
 const history=dates.flatMap(date=>[sample(date,15),sample(date,17)]);
 const selected=lastFiveMarketSessions(history);
 const distinct=[...new Set(selected.map(x=>newYorkSessionDate(x.timestamp)))];
 assert.deepEqual(distinct,[
  "2026-10-27","2026-10-29","2026-10-30","2026-11-02","2026-11-03"]);
 assert.equal(selected.length,10);
 assert.deepEqual(historyXAxisTickIndices(selected,"5D").length,5);
});
test("five X-axis ticks use real points, including first and last",()=>{
 const points=Array.from({length:21},(_,i)=>({timestamp:i*86400,equity:100+i}));
 assert.deepEqual(historyXAxisTickIndices(points,"1M"),[0,5,10,15,20]);
 assert.deepEqual(historyXAxisTickIndices(points.slice(0,5),"1Y"),[0,1,2,3,4]);
 assert.deepEqual(historyXAxisTickIndices(points.slice(0,2),"ALL"),[0,1]);
 assert.deepEqual(historyXAxisTickIndices([],"1D"),[]);
 assert.deepEqual(historyXAxisTickIndices(points.slice(0,1),"1D"),[0]);
});
test("5D uses at most one tick per real session, no invented missing dates",()=>{
 const points=[
  sample("2026-10-30",15),sample("2026-10-30",17),
  sample("2026-11-02",15),sample("2026-11-02",17),
  sample("2026-11-03",15),sample("2026-11-03",17),
 ];
 assert.deepEqual(historyXAxisTickIndices(points,"5D"),[0,3,5]);
 assert.deepEqual(historyXAxisTickIndices([
  sample("2026-11-03",15),sample("2026-11-03",17)
 ],"5D"),[0]); // one session means one date label, never repeated five times
 assert.equal(lastFiveMarketSessions([]).length,0);
});
