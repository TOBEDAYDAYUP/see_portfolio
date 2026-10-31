import test from "node:test";
import assert from "node:assert/strict";
import {parseCashDividends,parseReceivedDividends,annualRegularRate,summarizeDividends}
 from "../lib/portfolio/dividends.ts";
const date=(d)=>({symbol:"AAPL",id:d,ex_date:d,process_date:d,payable_date:d,
 rate:"0.26",special:false,currency:"USD"});
const position={symbol:"AAPL",qty:100,marketValue:20000,side:"long",assetClass:"us_equity"};
test("Alpaca corporate action parser supports only sourced USD cash dividends",()=>{
 const result=parseCashDividends({cash_dividends:[
  date("2026-02-10"),date("2026-05-10"),date("2026-08-10"),
  {...date("2026-11-10"),process_date:"2026-10-28"},
  {...date("2026-11-10"),id:"cad",currency:"CAD"},
  {...date("2026-11-10"),id:"notrate",rate:"unknown"}]});
 assert.equal(result.length,4);
 assert.ok(result.every(x=>x.rateUSD===0.26));
});
test("Paid dividends are only genuine DIV credits, no guessing from account cash",()=>{
 const a=parseReceivedDividends([
  {id:"1",activity_type:"DIV",symbol:"AAPL",date:"2026-08-20",net_amount:"25.00"},
  {id:"2",activity_type:"DIVNRA",symbol:"AAPL",date:"2026-08-21",net_amount:"-3.00"},
  {id:"3",activity_type:"INT",symbol:"AAPL",date:"2026-08-22",net_amount:"15.00"}]);
 assert.equal(a.length,1);assert.equal(a[0].netAmountUSD,25);
});
test("Annualized run-rate requires 3 quarterly spaced regular dividends; exclude specials",()=>{
 const all=parseCashDividends({cash_dividends:[date("2026-02-10"),date("2026-05-10"),date("2026-08-10")]});
 assert.equal(annualRegularRate(all,"AAPL","2026-10-30"),1.04);
 assert.equal(annualRegularRate(all.slice(0,2),"AAPL","2026-10-30"),null);
 assert.equal(annualRegularRate(all.map((x,i)=>i===0?{...x,special:true}:x),"AAPL","2026-10-30"),null);
});
test("Upcoming distribution is indicative only, separate from paid receipt totals",()=>{
 const events=parseCashDividends({cash_dividends:[
 date("2026-02-10"),date("2026-05-10"),date("2026-08-10"),
 {...date("2026-11-10"),process_date:"2026-10-27",payable_date:"2026-11-20"}]});
 const paid=parseReceivedDividends([
  {id:"credit",activity_type:"DIV",symbol:"AAPL",date:"2026-08-21",net_amount:"22.10"}]);
 const s=summarizeDividends([position],events,paid,true,"2026-10-30");
 assert.equal(s.receivedUSD,22.10);
 assert.equal(s.announcedIndicativeUSD,26);
 assert.equal(s.annualizedRunRateUSD,104);
 assert.equal(s.rows[0].nextPayDate,"2026-11-20");
 assert.equal(s.projectedCoveragePct,100);
});
test("No paid records does not imply dividends were verified zero when incomplete",()=>{
 const s=summarizeDividends([position],[],[],false,"2026-10-30");
 assert.equal(s.receivedCoverageComplete,false);
 assert.equal(s.annualizedRunRateUSD,null);
 assert.equal(s.announcedIndicativeUSD,null);
});
