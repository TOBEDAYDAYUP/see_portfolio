import test from "node:test";
import assert from "node:assert/strict";
import { calculateFYValuation } from "../lib/research/valuation-math.ts";
import { parseSECAnnualFinancials } from "../lib/research/financial-math.ts";

const end="2025-12-31",start="2025-01-01";
const annual=(val,unit,startDate=start)=>({val,start:startDate,end,form:"10-K",fp:"FY",
 filed:"2026-02-20",accn:"0000320193-26-000100"});
const instant=(val)=>({val,end,form:"10-K",fp:"FY",filed:"2026-02-20",accn:"0000320193-26-000100"});
const fixture=()=>({
 symbol:"AAPL",cik:"0000320193",companyName:"Example",currency:"USD",
 source:"SEC EDGAR · annual US GAAP 10-K",dataUrl:"https://data.sec.gov/example",
 notes:[],latestFilingDate:"2026-02-20",revenueYoYPct:null,netMarginPct:null,
 operatingMarginPct:null,freeCashFlowUsd:150,
 fiscalYears:[{fiscalYear:2025,fiscalYearEnd:end,filedAt:"2026-02-20",filingUrl:null,
  metrics:{revenue:1000,netIncome:100,operatingIncome:150,operatingCashFlow:200,
   capitalExpenditure:50,totalAssets:900,totalLiabilities:400,cash:90,
   dilutedEps:5,dilutedWeightedShares:100,stockholdersEquity:500}}]
});
test("SEC annual parser retains EPS and diluted shares with their respective units",()=>{
 const doc={facts:{"us-gaap":{
  Revenues:{units:{USD:[annual(1000)]}},
  EarningsPerShareDiluted:{units:{"USD/shares":[annual(5)]}},
  WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[annual(100)]}},
  StockholdersEquity:{units:{USD:[instant(500)]}},
 }}};
 const rows=parseSECAnnualFinancials(doc,"0000320193");
 assert.equal(rows[0].metrics.dilutedEps,5);
 assert.equal(rows[0].metrics.dilutedWeightedShares,100);
 assert.equal(rows[0].metrics.stockholdersEquity,500);
});
test("partial quarter EPS and mismatched units do not contaminate FY ratios",()=>{
 const doc={facts:{"us-gaap":{
  Revenues:{units:{USD:[annual(1000)]}},
  EarningsPerShareDiluted:{units:{"USD/shares":[annual(5),annual(0.2,"USD/shares","2025-10-01"),
    {...annual(99),form:"10-Q"}],USD:[annual(900)]}},
  WeightedAverageNumberOfDilutedSharesOutstanding:{units:{shares:[annual(100)]}}
 }}};
 const rows=parseSECAnnualFinancials(doc,"0000320193");
 assert.equal(rows[0].metrics.dilutedEps,5);
});
test("fy valuation multiples compute from tagged SEC data and sourced IEX close",()=>{
 const v=calculateFYValuation(fixture(),100,"2026-10-28","2026-10-30");
 assert.equal(v.available,true);
 assert.equal(v.pe,20);
 assert.equal(v.psProxy,10);
 assert.equal(v.pbProxy,20);
 assert.equal(v.fcfYieldProxyPct,1.5);
 assert.equal(v.marketCapProxyUSD,10000);
 assert.equal(v.dilutedEPS,5);
});
test("no meaningless PE for zero or negative GAAP EPS; allow negative FCF yield",()=>{
 const f=fixture();f.fiscalYears[0].metrics.dilutedEps=-2;
 f.fiscalYears[0].metrics.operatingCashFlow=-40;
 const v=calculateFYValuation(f,100,"2026-10-28","2026-10-30");
 assert.equal(v.pe,null);
 assert.equal(v.fcfYieldProxyPct,-0.9);
});
test("missing annual diluted shares withholds market-cap proxies, not valid EPS multiple",()=>{
 const f=fixture();f.fiscalYears[0].metrics.dilutedWeightedShares=null;
 const v=calculateFYValuation(f,100,"2026-10-28","2026-10-30");
 assert.equal(v.pe,20);
 assert.equal(v.psProxy,null);
 assert.equal(v.pbProxy,null);
 assert.equal(v.fcfYieldProxyPct,null);
});
test("nonpositive book equity is never shown as positive P/B",()=>{
 const f=fixture();f.fiscalYears[0].metrics.stockholdersEquity=-2;
 const v=calculateFYValuation(f,100,"2026-10-28","2026-10-30");
 assert.equal(v.pbProxy,null);
});
test("old or future close, stale FY and class-shares suppress ratios",()=>{
 const f=fixture();
 for(const asOf of ["2026-09-01","2026-11-01","invalid"]){
  const v=calculateFYValuation(f,100,asOf,"2026-10-30");
  assert.equal(v.available,false);assert.equal(v.pe,null);assert.equal(v.psProxy,null);
 }
 assert.equal(calculateFYValuation(f,null,"2026-10-28","2026-10-30").pe,null);
 const old=fixture();old.fiscalYears[0].fiscalYearEnd="2023-12-31";
 assert.equal(calculateFYValuation(old,100,"2026-10-28","2026-10-30").available,false);
 const classShares=fixture();classShares.symbol="BRK.B";
 assert.equal(calculateFYValuation(classShares,100,"2026-10-28","2026-10-30").pe,null);
});
