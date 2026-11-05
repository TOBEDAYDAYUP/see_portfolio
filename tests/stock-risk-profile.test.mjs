import test from "node:test";
import assert from "node:assert/strict";
import {buildStockRiskProfile} from "../lib/research/stock-risk-profile.ts";
const risk={annualizedVolatilityPct:24,maxDrawdownPct:-18,var95Pct:2.5,expectedShortfall95Pct:4,observations:300};
test("stock radar is entirely derived from existing single-stock risk fields",()=>{
 const a=buildStockRiskProfile(risk);
 assert.deepEqual(a.map(x=>x.key),["volatility","drawdown","var","es","history"]);
 assert.equal(a[0].score,100*(1-24/65));
 assert.equal(a[1].score,70);
 assert.ok(Math.abs((a[2].score??0)-100*(1-2.5/6))<1e-9);
 assert.equal(a[3].score,60);
 assert.equal(a[4].score,100);
});
test("incomplete and corrupt risk history never produces a filled pseudo-risk shape",()=>{
 const no=buildStockRiskProfile(null);
 assert.ok(no.every(a=>a.score===null));
 const few=buildStockRiskProfile({...risk,observations:80,var95Pct:null,expectedShortfall95Pct:null});
 assert.equal(few[2].score,null);
 assert.equal(few[3].score,null);
 assert.equal(few[4].score,80/300*100);
 const invalid=buildStockRiskProfile({...risk,annualizedVolatilityPct:NaN,maxDrawdownPct:6});
 assert.equal(invalid[0].score,null);
 assert.equal(invalid[1].score,null);
});
test("extreme loss statistics clamp to zero and do not fabricate negative scores",()=>{
 const a=buildStockRiskProfile({...risk,var95Pct:20,expectedShortfall95Pct:30,annualizedVolatilityPct:90,maxDrawdownPct:-90});
 assert.deepEqual(a.slice(0,4).map(x=>x.score),[0,0,0,0]);
});
