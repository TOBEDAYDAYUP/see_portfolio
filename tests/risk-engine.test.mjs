import test from "node:test";
import assert from "node:assert/strict";
import { calculateRisk } from "../lib/analytics/risk.ts";

const days=(prices)=>prices.map((close,i)=>({
  date: new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10), close,
}));
const closeTo=(a,b)=>assert.ok(Math.abs(a-b)<1e-9, "Expected "+a+" ≈ "+b);

test("100% single position: exact concentration, zero volatility for constant prices",()=>{
  const result=calculateRisk([{symbol:"AAA",marketValue:5000}],{
    AAA:days(Array.from({length:45},()=>100)),
  });
  closeTo(result.topPositionPct,100);
  closeTo(result.hhi,1);
  closeTo(result.effectivePositions,1);
  closeTo(result.topThreePct,100);
  closeTo(result.annualizedVolatilityPct,0);
  closeTo(result.maxDrawdownPct,0);
  assert.equal(result.dailyReturnObservations,44);
  assert.equal(result.historySufficient,true);
});
test("60/40 allocation uses HHI and effective positions correctly",()=>{
  const prices=Array.from({length:45},(_,i)=>100+Math.sin(i/5)*8+i*.2);
  const result=calculateRisk(
    [{symbol:"AAA",marketValue:600},{symbol:"BBB",marketValue:400}],
    {AAA:days(prices),BBB:days(Array.from({length:45},()=>100))},
  );
  closeTo(result.topPositionPct,60);
  closeTo(result.topThreePct,100);
  closeTo(result.hhi,.6**2+.4**2);
  closeTo(result.effectivePositions,1/.52);
  assert.ok(result.annualizedVolatilityPct>0);
  assert.ok(result.maxDrawdownPct<=0);
  assert.equal(result.path[0].index,100);
});
test("historical max drawdown is peak-to-trough rather than total-period loss",()=>{
  const price=[...Array(31).fill(100),110,88,95,102];
  const result=calculateRisk([{symbol:"AAA",marketValue:1000}],{AAA:days(price)});
  closeTo(result.maxDrawdownPct,-20);
});
test("insufficient common dates preserve allocation but do not invent volatility",()=>{
  const a=days(Array(35).fill(100));
  const b=days(Array(35).fill(95)).slice(31);
  const result=calculateRisk([{symbol:"A",marketValue:10},{symbol:"B",marketValue:10}],{A:a,B:b});
  assert.equal(result.annualizedVolatilityPct,null);
  assert.equal(result.maxDrawdownPct,null);
  assert.equal(result.historySufficient,false);
  closeTo(result.hhi,.5);
});
test("invalid holdings must not be silently included",()=>{
  assert.throws(()=>calculateRisk([{symbol:"AAA",marketValue:0}],{}));
  assert.throws(()=>calculateRisk([{symbol:"AAA",marketValue:100},{symbol:"AAA",marketValue:100}],{}));
  assert.throws(()=>calculateRisk([],{}));
});
