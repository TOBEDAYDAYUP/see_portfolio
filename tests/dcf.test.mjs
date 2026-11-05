import test from "node:test";
import assert from "node:assert/strict";
import {calculateEquityCashFlowDCF} from "../lib/research/dcf.ts";

const inputs=(overrides={})=>({
 baseCashFlowUsd:100,sharesOutstanding:10,growthRatePct:0,
 costOfEquityPct:10,terminalGrowthPct:0,referencePriceUsd:80,
 ...overrides,
});
test("flat cash flow and zero terminal growth equals a growing-perpetuity limit",()=>{
 const result=calculateEquityCashFlowDCF(inputs());
 assert.ok(result);
 assert.ok(Math.abs(result.estimatedEquityValueUsd-1000)<1e-8);
 assert.ok(Math.abs(result.estimatedValuePerShareUsd-100)<1e-8);
 assert.ok(Math.abs(result.upsideVsReferencePct-25)<1e-8);
 assert.equal(result.projectedYears.length,5);
});
test("forecast cashflows discount individually and terminal value discounts at year five",()=>{
 const r=calculateEquityCashFlowDCF(inputs({growthRatePct:5,terminalGrowthPct:2}));
 assert.ok(r);
 assert.ok(Math.abs(r.projectedYears[0].projectedCashFlowUsd-105)<1e-8);
 assert.ok(Math.abs(r.projectedYears[0].presentValueUsd-105/1.1)<1e-8);
 assert.ok(Math.abs(r.pvTerminalUsd-r.terminalValueAtYearFiveUsd/1.1**5)<1e-8);
 assert.ok(Math.abs(r.estimatedEquityValueUsd-r.pvForecastUsd-r.pvTerminalUsd)<1e-8);
});
test("cost of equity must exceed terminal growth by a percentage point",()=>{
 for(const terminalGrowthPct of [10,9.5,9]){
  assert.equal(calculateEquityCashFlowDCF(inputs({terminalGrowthPct})),null);
 }
});
test("reject unsupported negative base flow, zero shares and nonfinite values",()=>{
 assert.equal(calculateEquityCashFlowDCF(inputs({baseCashFlowUsd:-1})),null);
 assert.equal(calculateEquityCashFlowDCF(inputs({sharesOutstanding:0})),null);
 assert.equal(calculateEquityCashFlowDCF(inputs({growthRatePct:Number.NaN})),null);
 assert.equal(calculateEquityCashFlowDCF(inputs({costOfEquityPct:Infinity})),null);
});
test("valuation still works without a reference price but cannot claim upside",()=>{
 const r=calculateEquityCashFlowDCF(inputs({referencePriceUsd:null}));
 assert.ok(r);
 assert.equal(r.upsideVsReferencePct,null);
});
test("higher cost of equity lowers modeled value",()=>{
 const a=calculateEquityCashFlowDCF(inputs({costOfEquityPct:8,terminalGrowthPct:2}));
 const b=calculateEquityCashFlowDCF(inputs({costOfEquityPct:12,terminalGrowthPct:2}));
 assert.ok(a&&b);
 assert.ok(a.estimatedValuePerShareUsd>b.estimatedValuePerShareUsd);
});
