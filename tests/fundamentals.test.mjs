import test from "node:test";
import assert from "node:assert/strict";
import {parseSECAnnualFinancials,revenueGrowthPct,freeCashFlow,ratioPercent} from "../lib/research/financial-math.ts";

const item=(value,start,end,form="10-K",filed="2026-10-25",extras={})=>
 ({val:value,...(start?{start}:{}),end,form,filed,fp:"FY",accn:"0000320193-26-000100",...extras});
const sec=(gaap)=>({facts:{"us-gaap":Object.fromEntries(
 Object.entries(gaap).map(([key,values])=>[key,{units:{USD:values}}])
)}});
const fy26=["2025-09-29","2026-09-27"],fy25=["2024-09-30","2025-09-28"];
test("SEC full-year 10-K revenue rejects quarterly/9-month YTD and 10-Q figures",()=>{
 const rows=parseSECAnnualFinancials(sec({
  RevenueFromContractWithCustomerExcludingAssessedTax:[
   item(1000,...fy26),item(800,...fy25),
   item(900,"2026-01-01","2026-09-27","10-K"),
   item(200,"2026-06-01","2026-09-27","10-Q"),
  ],
  NetIncomeLoss:[item(150,...fy26),item(100,...fy25)],
  NetCashProvidedByUsedInOperatingActivities:[item(200,...fy26),item(120,...fy25)],
 }),"0000320193");
 assert.equal(rows.length,2);
 assert.equal(rows[0].metrics.revenue,1000);
 assert.equal(rows[1].metrics.revenue,800);
 assert.equal(rows[0].metrics.netIncome,150);
 assert.equal(rows[0].metrics.operatingCashFlow,200);
 assert.equal(revenueGrowthPct(rows),25);
});
test("annual flow concepts reject 10-K facts shorter than full fiscal year",()=>{
 const rows=parseSECAnnualFinancials(sec({
  Revenues:[item(600,"2026-04-01","2026-09-27"),item(700,...fy26)],
 }),"0000320193");
 assert.equal(rows.length,1);
 assert.equal(rows[0].metrics.revenue,700);
});
test("SEC reported balance-sheet assets are point-in-time only",()=>{
 const rows=parseSECAnnualFinancials(sec({
  Revenues:[item(1000,...fy26)],
  Assets:[item(450,null,"2026-09-27"),item(150,"2025-09-29","2026-09-27")],
  Liabilities:[item(230,null,"2026-09-27")],
  CashAndCashEquivalentsAtCarryingValue:[item(75,null,"2026-09-27")],
 }),"0000320193");
 assert.equal(rows[0].metrics.totalAssets,450);
 assert.equal(rows[0].metrics.totalLiabilities,230);
 assert.equal(rows[0].metrics.cash,75);
});
test("most recent SEC filing wins within a consistent concept and period",()=>{
 const rows=parseSECAnnualFinancials(sec({
  Revenues:[item(101,...fy26,"10-K","2026-10-25"),item(109,...fy26,"10-K/A","2026-11-01")],
 }),"0000320193");
 assert.equal(rows[0].metrics.revenue,109);
 assert.equal(rows[0].filedAt,"2026-11-01");
});
test("annual data missing or negative denominators cannot produce misleading margins",()=>{
 assert.equal(ratioPercent(50,null),null);
 assert.equal(ratioPercent(50,0),null);
 assert.equal(ratioPercent(50,-100),null);
 assert.equal(ratioPercent(-20,200),-10);
 assert.equal(revenueGrowthPct([]),null);
 assert.deepEqual(parseSECAnnualFinancials({}, "0000320193"),[]);
});
test("free cash flow uses reported capex and refuses absent capex",()=>{
 assert.equal(freeCashFlow(100,35),65);
 assert.equal(freeCashFlow(-10,35),-45);
 assert.equal(freeCashFlow(100,null),null);
 assert.equal(freeCashFlow(100,-35),null);
});
test("source archive URL uses true accession and never fabricates a filing reference",()=>{
 const rows=parseSECAnnualFinancials(sec({
  Revenues:[item(1000,...fy26)],
 }),"0000320193");
 assert.equal(rows[0].filingUrl,
  "https://www.sec.gov/Archives/edgar/data/320193/000032019326000100/");
});
test("year-on-year comparison requires approximately one-year-separated fiscal year ends",()=>{
 const rows=parseSECAnnualFinancials(sec({
  Revenues:[item(1000,...fy26),item(800,"2025-01-01","2025-05-01")],
 }),"0000320193");
 assert.equal(revenueGrowthPct(rows),null);
});
