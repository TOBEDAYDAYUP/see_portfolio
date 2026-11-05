import test from "node:test";
import assert from "node:assert/strict";
import {buildPortfolioHealthProfile} from "../lib/portfolio/health-profile.ts";

function risk(overrides={}){
 return {
  allocations:[{symbol:"AAPL",marketValue:600,weightPct:60},{symbol:"MSFT",marketValue:400,weightPct:40}],
  investedValue:1000,topPositionPct:60,topThreePct:100,hhi:0.52,effectivePositions:1/0.52,
  annualizedVolatilityPct:24,maxDrawdownPct:-18,dailyReturnObservations:260,
  firstDate:"2025-11-02",lastDate:"2026-11-04",path:[],
  historySufficient:true,var95Pct:2.5,var95Usd:25,
  expectedShortfall95Pct:4,expectedShortfall95Usd:40,tailObservations:13,
  tailRiskSufficient:true,...overrides,
 };
}
test("Health profile uses only real Risk Engine values and explicitly labeled guides",()=>{
 const out=buildPortfolioHealthProfile(risk(),"2026-11-05");
 assert.equal(out.complete,true);
 assert.equal(out.available,5);
 assert.deepEqual(out.axes.map(a=>a.key),
  ["diversification","weightBalance","volatility","drawdown","tailLoss"]);
 const scores=out.axes.map(a=>a.score);
 assert.ok(Math.abs(scores[0]-(1/0.52-1)/7*100)<1e-10);
 assert.ok(Math.abs(scores[1]-(75-60)/55*100)<1e-10);
 assert.equal(scores[2],60);
 assert.equal(scores[3],64);
 assert.equal(scores[4],50);
 assert.equal(out.axes[4].raw,"4.0% daily ES95");
});
test("No historical risk observations: show only actual allocation-derived axes, no fake polygon",()=>{
 const out=buildPortfolioHealthProfile(risk({
  historySufficient:false,lastDate:null,dailyReturnObservations:0,
  annualizedVolatilityPct:null,maxDrawdownPct:null,
  expectedShortfall95Pct:null,tailRiskSufficient:false,
 }),"2026-11-05");
 assert.equal(out.complete,false);
 assert.equal(out.available,2);
 assert.deepEqual(out.axes.slice(2).map(a=>a.score),[null,null,null]);
 assert.equal(out.axes[2].raw,"Unavailable");
});
test("30–199 aligned returns support volatility/drawdown but NEVER ES tail control",()=>{
 const out=buildPortfolioHealthProfile(risk({dailyReturnObservations:80,
  tailRiskSufficient:false,expectedShortfall95Pct:null}),"2026-11-05");
 assert.equal(out.available,4);
 assert.equal(out.axes[4].score,null);
 assert.equal(out.complete,false);
});
test("Stale and future market dates withhold historical indicators without erasing concentration",()=>{
 for(const lastDate of ["2026-10-01","2026-11-08",null,"invalid-date"]){
  const p=buildPortfolioHealthProfile(risk({lastDate}),"2026-11-05");
  assert.equal(p.isHistoryFresh,false);
  assert.equal(p.available,2);
  assert.deepEqual(p.axes.slice(2).map(a=>a.score),[null,null,null]);
 }
});
test("Bounds and invalid metrics do not produce misleading indices",()=>{
 const out=buildPortfolioHealthProfile(risk({
  effectivePositions:8.5,topPositionPct:12,annualizedVolatilityPct:220,
  maxDrawdownPct:-90,expectedShortfall95Pct:22,
 }),"2026-11-05");
 assert.deepEqual(out.axes.map(a=>a.score),[100,100,0,0,0]);
 const bad=buildPortfolioHealthProfile(risk({
  effectivePositions:NaN,topPositionPct:Infinity,annualizedVolatilityPct:NaN,
  maxDrawdownPct:15,expectedShortfall95Pct:-1,
 }),"2026-11-05");
 assert.equal(bad.available,0);
 assert.ok(bad.axes.every(a=>a.score===null));
});
test("Single equity concentration scores 0, not a fictitious diversified portfolio",()=>{
 const one=buildPortfolioHealthProfile(risk({
  effectivePositions:1,topPositionPct:100,
 }),"2026-11-05");
 assert.equal(one.axes[0].score,0);
 assert.equal(one.axes[1].score,0);
});
