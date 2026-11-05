import test from "node:test";
import assert from "node:assert/strict";
import { parseAlpacaSearchSnapshots } from "../lib/research/search-quotes.ts";

const snapshot=(price,previous,date="2026-11-04T05:00:00Z",prior="2026-11-03T05:00:00Z")=>({
 dailyBar:{t:date,c:price,o:price,h:price,l:price,v:2000},
 prevDailyBar:{t:prior,c:previous,o:previous,h:previous,l:previous,v:1000},
});
test("JNJ search price and signed USD / percentage change are calculated from IEX daily bars",()=>{
 const data=parseAlpacaSearchSnapshots({JNJ:snapshot(278.76,268.77)},["JNJ"],"2026-11-04");
 assert.equal(data.JNJ.priceUSD,278.76);
 assert.ok(Math.abs(data.JNJ.changeUSD-9.99)<1e-10);
 assert.ok(Math.abs(data.JNJ.changePct-9.99/268.77*100)<1e-10);
 assert.equal(data.JNJ.source,"Alpaca IEX");
 assert.equal(data.JNJ.sessionDate,"2026-11-04");
 assert.equal(data.JNJ.previousSessionDate,"2026-11-03");
});
test("Negative and flat prices produce the correct signed change",()=>{
 const out=parseAlpacaSearchSnapshots({
  AAPL:snapshot(95,100),MSFT:snapshot(100,100)
 },["AAPL","MSFT"],"2026-11-04");
 assert.equal(out.AAPL.changeUSD,-5);
 assert.equal(out.AAPL.changePct,-5);
 assert.equal(out.MSFT.changeUSD,0);
 assert.equal(out.MSFT.changePct,0);
});
test("Alpaca dailyBar timestamp is converted to New York date across DST",()=>{
 const summer=snapshot(200,190,"2026-10-30T04:00:00Z","2026-10-29T04:00:00Z");
 const winter=snapshot(200,190,"2026-11-03T05:00:00Z","2026-11-02T05:00:00Z");
 assert.equal(parseAlpacaSearchSnapshots({AAPL:summer},["AAPL"],"2026-10-30").AAPL.sessionDate,"2026-10-30");
 assert.equal(parseAlpacaSearchSnapshots({AAPL:winter},["AAPL"],"2026-11-03").AAPL.sessionDate,"2026-11-03");
});
test("A missing, stale, future or inconsistent snapshot is never shown as a real daily price",()=>{
 const raw={
  EMPTY:{dailyBar:{t:"2026-11-04T05:00:00Z",c:100}},
  NEG:snapshot(-2,100),
  ZERO:snapshot(100,0),
  REVERSED:snapshot(100,90,"2026-11-03T05:00:00Z","2026-11-04T05:00:00Z"),
  STALE:snapshot(100,95,"2026-10-01T04:00:00Z","2026-09-30T04:00:00Z"),
  FUTURE:snapshot(100,95,"2026-11-05T05:00:00Z","2026-11-04T05:00:00Z"),
  GAP:snapshot(100,95,"2026-11-04T05:00:00Z","2026-10-01T04:00:00Z"),
  OK:snapshot(100,95),
 };
 const result=parseAlpacaSearchSnapshots(raw,Object.keys(raw),"2026-11-04");
 assert.deepEqual(Object.keys(result),["OK"]);
});
test("Malformed payloads or invalid market dates yield no fabricated quote",()=>{
 assert.deepEqual(parseAlpacaSearchSnapshots(null,["AAPL"],"2026-11-04"),{});
 assert.deepEqual(parseAlpacaSearchSnapshots({AAPL:snapshot(100,99)},["AAPL"],"2026-13-99"),{});
 assert.deepEqual(parseAlpacaSearchSnapshots({AAPL:{dailyBar:{c:"100",t:"2026-11-04T05:00:00Z"}}},["AAPL"],"2026-11-04"),{});
});
test("When market is closed, the latest available IEX session is labeled with its actual date",()=>{
 const friday=snapshot(278.76,268.77,"2026-10-30T04:00:00Z","2026-10-29T04:00:00Z");
 const result=parseAlpacaSearchSnapshots({JNJ:friday},["JNJ"],"2026-11-02");
 assert.equal(result.JNJ.sessionDate,"2026-10-30");
});
