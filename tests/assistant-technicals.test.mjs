import test from "node:test";
import assert from "node:assert/strict";
import {calculateAssistantTechnicals} from "../lib/assistant/technical-indicators.ts";
const series=(xs)=>xs.map((close,i)=>({
  date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),close,
}));
test("SMA and completed-session changes come only from actual closes",()=>{
 const t=calculateAssistantTechnicals(series(Array.from({length:30},(_,i)=>100+i)));
 assert.equal(t.observations,30);
 assert.equal(t.sma5,127);
 assert.equal(t.sma10,124.5);
 assert.equal(t.sma20,119.5);
 assert.ok(Math.abs(t.return5Pct-((129/124-1)*100))<1e-9);
 assert.ok(Math.abs(t.return20Pct-((129/109-1)*100))<1e-9);
 assert.equal(t.rsi14,100);
 assert.equal(t.macdHistogram,null);
});
test("Flat prices have neutral RSI and zero MACD(12,26,9)",()=>{
 const t=calculateAssistantTechnicals(series(Array(50).fill(100)));
 assert.equal(t.rsi14,50);
 assert.equal(t.macdLine,0);
 assert.equal(t.macdSignal,0);
 assert.equal(t.macdHistogram,0);
 assert.equal(t.return5Pct,0);
});
test("Missing history does not yield fabricated momentum or indicators",()=>{
 const t=calculateAssistantTechnicals(series([100,101,99]));
 assert.equal(t.sma5,null);
 assert.equal(t.rsi14,null);
 assert.equal(t.macdHistogram,null);
 assert.equal(t.return5Pct,null);
 assert.equal(t.return20Pct,null);
 const empty=calculateAssistantTechnicals([]);
 assert.equal(empty.observations,0);
 assert.equal(empty.asOf,null);
});
test("Duplicates, invalid prices and non-finite values are excluded",()=>{
 const t=calculateAssistantTechnicals([
  {date:"2026-01-02",close:102},{date:"2026-01-01",close:100},
  {date:"2026-01-01",close:101},{date:"fake",close:1},
  {date:"2026-01-03",close:NaN},{date:"2026-01-04",close:0},
 ]);
 assert.equal(t.observations,2);
 assert.equal(t.asOf,"2026-01-02");
});
