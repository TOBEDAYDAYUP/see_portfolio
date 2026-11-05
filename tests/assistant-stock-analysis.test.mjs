import test from "node:test";
import assert from "node:assert/strict";
import {requestsStandardStockReport,formatStandardStockReport} from "../lib/assistant/stock-analysis.ts";
import {calculateAssistantTechnicals} from "../lib/assistant/technical-indicators.ts";
const base={
 symbol:"AAPL",asOf:"2026-11-04",lastCloseUSD:349.56,previousCloseUSD:331.71,
 technicals:calculateAssistantTechnicals(Array.from({length:60},(_,i)=>({
  date:new Date(Date.UTC(2026,7,1+i)).toISOString().slice(0,10),close:300+i/2}))),
 risk:{annualizedVolatilityPct:24.07,maxDrawdownPct:-13.76,
  var95Pct:2.04,expectedShortfall95Pct:3.46,observations:300},
 fundamentals:{fiscalYearEnd:"2025-09-27",annualRevenueUSD:416160000000,
  annualNetIncomeUSD:112010000000,annualDilutedEPSUSD:7.46,
  ttmPeriodEnd:"2026-06-27",ttmPEApprox:39.54,ttmPSProxy:10.78,
  latestPBProxy:46.8,ttmFCFYieldPct:2.72},
 headlines:[],sources:{price:"S1",fundamentals:"S2"},
 notes:[],
};
test("Explicit single-stock analysis requests use the quant template; social chat does not",()=>{
 assert.equal(requestsStandardStockReport("Analyze AAPL",["AAPL"]),true);
 assert.equal(requestsStandardStockReport("帮我分析 AAPL 的估值",["AAPL"]),true);
 assert.equal(requestsStandardStockReport("Is Tommy a genius?",[]),false);
 assert.equal(requestsStandardStockReport("Explain P/E",["AAPL"]),false);
 assert.equal(requestsStandardStockReport("Compare AAPL and MSFT",["AAPL","MSFT"]),false);
 assert.equal(requestsStandardStockReport("Analyze my portfolio",["AAPL"],true),false);
});
test("SEE quant report is standardized, sourced and uses Summary not Conclusion",()=>{
 const s=formatStandardStockReport(base,"en");
 for(const title of ["Market Snapshot","Trend & Indicators","Momentum: RSI & MACD",
  "Volatility & Tail Risk","Fundamentals & Valuation","Volume & News","Summary"]){
  assert.ok(s.includes(title),title);
 }
 assert.ok(s.includes("USD 349.56"));
 assert.ok(s.includes("+5.38%"));
 assert.ok(s.includes("39.54×"));
 assert.ok(s.includes("24.07%"));
 assert.ok(s.includes("[S1]"));
 assert.ok(s.includes("[S2]"));
 assert.doesNotMatch(s,/Conclusion|BUY NOW|Sell this stock/);
 assert.match(s,/no volume ratio is inferred/);
});
test("Chinese reports don't invent unavailable values and flag data limitations",()=>{
 const s=formatStandardStockReport({...base,lastCloseUSD:null,previousCloseUSD:null,
  risk:null,fundamentals:null,notes:["SEC filing missing"],sources:{}}, "zh");
 assert.match(s,/Summary｜证据摘要/);
 assert.match(s,/数据局限/);
 assert.match(s,/SEC filing missing/);
 assert.match(s,/近似 TTM P\/E：—/);
 assert.match(s,/年化历史波动率：—/);
 assert.doesNotMatch(s,/自定义目标价|买入建议|Conclusion/);
});
