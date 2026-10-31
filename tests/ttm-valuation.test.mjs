import test from "node:test";
import assert from "node:assert/strict";
import { parseSECAnnualFinancials } from "../lib/research/financial-math.ts";
import { parseSECRecentData } from "../lib/research/sec-ttm.ts";
import { calculateCurrentValuation } from "../lib/research/valuation-current.ts";

const fyStart="2024-09-29",fyEnd="2025-09-27";
const qStart="2025-09-28",qEnd="2026-06-27";
const priorEnd="2025-06-28";
const fact=(val,start,end,form,filed,fp)=>({val,...(start?{start}:{}),
 end,form,filed,fp,accn:"0000320193-26-000100"});
function company({futureQ=false,prior=true,shares=true}={}){
 const fy=(x)=>fact(x,fyStart,fyEnd,"10-K","2025-10-31","FY");
 const cur=(x)=>fact(x,qStart,qEnd,"10-Q",futureQ?"2026-11-02":"2026-07-31","Q3");
 const old=(x)=>fact(x,fyStart,priorEnd,"10-Q","2025-08-01","Q3");
 const mix=(annual,current,previous)=>[fy(annual),cur(current),...(prior?[old(previous)]:[])];
 const gaap={
  RevenueFromContractWithCustomerExcludingAssessedTax:{units:{USD:mix(400e9,360e9,300e9)}},
  NetIncomeLoss:{units:{USD:mix(100e9,95e9,80e9)}},
  NetCashProvidedByUsedInOperatingActivities:{units:{USD:mix(120e9,90e9,88e9)}},
  PaymentsToAcquirePropertyPlantAndEquipment:{units:{USD:mix(20e9,15e9,12e9)}},
  EarningsPerShareDiluted:{units:{"USD/shares":mix(7.46,6.88,5.62)}},
  WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[fy(15e9)]}},
  StockholdersEquity:{units:{USD:[
   fact(73e9,null,fyEnd,"10-K","2025-10-31","FY"),
   fact(110e9,null,qEnd,"10-Q","2026-07-31","Q3")]}},
  Assets:{units:{USD:[fact(500e9,null,qEnd,"10-Q","2026-07-31","Q3")]}},
 };
 const dei=shares?{EntityCommonStockSharesOutstanding:{units:{shares:[
  fact(14.6e9,null,"2026-07-17","10-Q","2026-07-31","Q3")]}}}:{};
 return {facts:{"us-gaap":gaap,dei}};
}
function snapshot(raw,asOf="2026-10-30"){
 const annual=parseSECAnnualFinancials(raw,"0000320193",asOf);
 const recent=parseSECRecentData(raw,annual,asOf);
 return {symbol:"AAPL",fiscalYears:annual,recent,asOfDate:asOf};
}
test("10-K plus Q3 current YTD minus matching prior Q3 YTD gives non-overlapping TTM",()=>{
 const d=snapshot(company());
 const t=d.recent.ttm;
 assert.ok(t);
 assert.equal(t.fiscalPeriod,"Q3");
 assert.equal(t.periodEnd,"2026-06-27");
 assert.equal(t.revenue,460e9);
 assert.equal(t.netIncome,115e9);
 assert.equal(t.operatingCashFlow,122e9);
 assert.equal(t.capex,23e9);
 assert.equal(t.freeCashFlow,99e9);
 assert.ok(Math.abs(t.dilutedEpsApprox-8.72)<1e-9);
});
test("recent balance book and cover-page shares have independent reporting dates",()=>{
 const d=snapshot(company());
 assert.equal(d.recent.bookEquity?.value,110e9);
 assert.equal(d.recent.bookEquity?.asOf,"2026-06-27");
 assert.equal(d.recent.sharesOutstanding?.value,14.6e9);
 assert.equal(d.recent.sharesOutstanding?.asOf,"2026-07-17");
});
test("the live-like valuation remains a dated proxy, not FY-only P/B",()=>{
 const d=snapshot(company());
 const v=calculateCurrentValuation(d,100,"2026-10-30","Alpaca IEX","2026-10-30");
 assert.ok(v.ttmPEApprox&&Math.abs(v.ttmPEApprox-100/8.72)<1e-8);
 assert.equal(v.marketCapProxyUSD,1.46e12);
 assert.ok(v.latestPBProxy&&Math.abs(v.latestPBProxy-1.46e12/110e9)<1e-8);
 assert.ok(v.ttmPSProxy&&Math.abs(v.ttmPSProxy-1.46e12/460e9)<1e-8);
 assert.ok(v.ttmFCFYieldProxyPct&&Math.abs(v.ttmFCFYieldProxyPct-99e9/1.46e12*100)<1e-8);
 assert.ok(v.fyPE&&Math.abs(v.fyPE-100/7.46)<1e-8);
});
test("do not include fiscal 10-Q filed AFTER quote date (look-ahead)",()=>{
 const d=snapshot(company({futureQ:true}));
 assert.equal(d.recent.ttm,null);
 const v=calculateCurrentValuation(d,100,"2026-10-30","Alpaca IEX","2026-10-30");
 assert.equal(v.ttmPEApprox,null);
 assert.ok(v.fyPE);
});
test("no prior matching year-to-date 10-Q means no synthetic trailing earnings",()=>{
 const d=snapshot(company({prior:false}));
 assert.equal(d.recent.ttm,null);
});
test("no dated SEC shares means no market cap, P/S, P/B or FCF yield",()=>{
 const d=snapshot(company({shares:false}));
 const v=calculateCurrentValuation(d,100,"2026-10-30","Alpaca IEX","2026-10-30");
 assert.equal(v.marketCapProxyUSD,null);
 assert.equal(v.ttmPSProxy,null);
 assert.equal(v.latestPBProxy,null);
 assert.ok(v.ttmPEApprox);
});
test("stale close and class share tickers withhold every valuation ratio",()=>{
 const d=snapshot(company());
 assert.equal(calculateCurrentValuation(d,100,"2026-09-30","Alpaca IEX","2026-10-30").ttmPEApprox,null);
 const c={...d,symbol:"BRK.B"};
 const v=calculateCurrentValuation(c,100,"2026-10-30","Alpaca IEX","2026-10-30");
 assert.equal(v.ttmPEApprox,null);
 assert.equal(v.latestPBProxy,null);
});

test("SEC source coverage explains absent TTM data rather than silently showing blanks",()=>{
 const raw=company({futureQ:true,shares:false});
 const d=snapshot(raw);
 assert.equal(d.recent.ttm,null);
 assert.equal(d.recent.coverage.latest10QPeriodEnd,null);
 assert.equal(d.recent.coverage.latestSECShareDate,null);
 assert.equal(d.recent.coverage.latestSECBookDate,"2026-06-27");
});
test("SEC source coverage identifies the most recent public 10-Q and dated snapshots",()=>{
 const d=snapshot(company());
 assert.equal(d.recent.coverage.latest10QPeriodEnd,"2026-06-27");
 assert.equal(d.recent.coverage.latestFiled10Q,"2026-07-31");
 assert.equal(d.recent.coverage.latestSECShareDate,"2026-07-17");
 assert.equal(d.recent.coverage.latestSECBookDate,"2026-06-27");
});
