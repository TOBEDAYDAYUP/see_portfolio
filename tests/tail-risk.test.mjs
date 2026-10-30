import test from "node:test";
import assert from "node:assert/strict";
import { calculateHistoricalTailRisk95, calculateRisk, TAIL_RISK_MIN_RETURNS } from "../lib/analytics/risk.ts";

const close=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon, "Expected "+a+" ≈ "+b);

test("VaR95 is the 10th-worst daily loss and ES95 averages worst ten of 200",()=>{
  const returns=[...Array(5).fill(-0.2),...Array(5).fill(-0.1),...Array(190).fill(0.005)];
  const r=calculateHistoricalTailRisk95(returns);
  assert.ok(r);
  assert.equal(r.tailObservations,10);
  close(r.var95Pct,10);
  close(r.expectedShortfall95Pct,15);
  assert.ok(r.expectedShortfall95Pct>=r.var95Pct);
});

test("historical quantile uses ceil(5% × n) at uneven sample lengths",()=>{
  const returns=[...Array(12).fill(-0.03),-0.02,...Array(237).fill(0.004)];
  assert.equal(returns.length,250);
  const r=calculateHistoricalTailRisk95(returns);
  assert.ok(r);
  assert.equal(r.tailObservations,13);
  close(r.var95Pct,2);
  close(r.expectedShortfall95Pct,(12*3+2)/13);
});

test("minimum historical coverage is enforced and not extrapolated",()=>{
  assert.equal(TAIL_RISK_MIN_RETURNS,200);
  assert.equal(calculateHistoricalTailRisk95(Array(199).fill(-.01)),null);
  const r=calculateHistoricalTailRisk95(Array(200).fill(0));
  assert.ok(r);
  close(r.var95Pct,0);
  close(r.expectedShortfall95Pct,0);
});

test("historically profitable days do not create fictitious negative loss estimates",()=>{
  const r=calculateHistoricalTailRisk95(Array(220).fill(0.001));
  assert.ok(r);
  assert.equal(r.var95Pct,0);
  assert.equal(r.expectedShortfall95Pct,0);
});

test("invalid daily returns are rejected rather than misreported",()=>{
  assert.throws(()=>calculateHistoricalTailRisk95([...Array(199).fill(0),Number.NaN]));
  assert.throws(()=>calculateHistoricalTailRisk95([...Array(199).fill(0),-1]));
});

test("portfolio integration converts historical tail losses into USD invested exposure",()=>{
  const returns=[...Array(5).fill(-0.2),...Array(5).fill(-0.1),...Array(190).fill(0.005)];
  const prices=[100];
  for(const value of returns) prices.push(prices[prices.length-1]*(1+value));
  const dates=prices.map((price,i)=>({
    date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),
    close:price,
  }));
  const result=calculateRisk([{symbol:"AAA",marketValue:10000}],{AAA:dates});
  assert.equal(result.dailyReturnObservations,200);
  assert.equal(result.tailRiskSufficient,true);
  assert.equal(result.tailObservations,10);
  close(result.var95Pct,10);
  close(result.expectedShortfall95Pct,15);
  close(result.var95Usd,1000);
  close(result.expectedShortfall95Usd,1500);
});

test("portfolio with only 100 observations retains volatility but withholds VaR and ES",()=>{
  const prices=Array.from({length:101},(_,i)=>({
    date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),
    close:100+i,
  }));
  const result=calculateRisk([{symbol:"A",marketValue:1000}],{A:prices});
  assert.equal(result.historySufficient,true);
  assert.equal(result.tailRiskSufficient,false);
  assert.equal(result.var95Pct,null);
  assert.equal(result.var95Usd,null);
  assert.equal(result.expectedShortfall95Pct,null);
  assert.equal(result.expectedShortfall95Usd,null);
});
