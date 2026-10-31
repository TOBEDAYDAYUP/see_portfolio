import test from "node:test";
import assert from "node:assert/strict";
import {summarizePortfolioValuation} from "../lib/portfolio/valuation.ts";
import {parseFMPOutstandingShares} from "../lib/research/fmp-shares.ts";
const pos=(symbol,mv)=>({symbol,marketValue:mv,side:"long",assetClass:"us_equity",qty:5,avgEntryPrice:20,currentPrice:30});
const valuation=(pe,fcfYield=2)=>({ttmPEApprox:pe,ttmPSProxy:4,latestPBProxy:3,
 ttmFCFYieldProxyPct:fcfYield,price:100,priceAsOf:"2026-10-30",sharesSource:"SEC companyfacts",
 ttmEnd:"2026-09-30"});
test("Portfolio P/E uses market-weighted earnings yield, not arithmetic mean",()=>{
 const s=summarizePortfolioValuation([
  {position:pos("AAA",300),valuation:valuation(10)},
  {position:pos("BBB",100),valuation:valuation(30)}
 ]);
 assert.ok(s.weightedPortfolioPE!==null);
 assert.ok(Math.abs(s.weightedPortfolioPE-(400/(300/10+100/30)))<1e-9);
 assert.equal(s.peCoveragePct,100);
});
test("Missing, zero and loss P/E excluded from P/E coverage but not denominator",()=>{
 const s=summarizePortfolioValuation([
  {position:pos("AAA",100),valuation:valuation(10)},
  {position:pos("BBB",200),valuation:valuation(null)},
  {position:pos("CCC",100),valuation:valuation(-3)}
 ]);
 assert.equal(s.peCoveragePct,25);
 assert.equal(s.weightedPortfolioPE,10);
 assert.equal(s.fcfCoveragePct,100);
});
test("Only long positive market value US equity qualifies",()=>{
 const s=summarizePortfolioValuation([
  {position:pos("AAA",100),valuation:valuation(12)},
  {position:{...pos("SHRT",-100),side:"short"},valuation:valuation(9)},
  {position:{...pos("SPY",200),assetClass:"us_option"},valuation:valuation(15)}
 ]);
 assert.equal(s.eligiblePositions,1);
 assert.equal(s.eligibleInvestedUSD,100);
 assert.equal(s.totalPositions,3);
});
test("FMP fallback reads total outstandingShares not floatShares",()=>{
 const v=parseFMPOutstandingShares([{symbol:"NKE",date:"2026-09-28 16:30:00",
  outstandingShares:1485308829,floatShares:1200000000,freeFloat:80}],"NKE","2026-10-30");
 assert.equal(v?.value,1485308829);
 assert.equal(v?.source,"FMP shares-float");
 assert.equal(v?.asOf,"2026-09-28");
});
test("FMP provider key not sufficient: reject future, wrong symbols and float-only records",()=>{
 assert.equal(parseFMPOutstandingShares([{symbol:"NKE",date:"2026-11-04",outstandingShares:1400000000}],"NKE","2026-10-30"),null);
 assert.equal(parseFMPOutstandingShares([{symbol:"ABC",date:"2026-09-28",outstandingShares:1400000000}],"NKE","2026-10-30"),null);
 assert.equal(parseFMPOutstandingShares([{symbol:"NKE",date:"2026-09-28",floatShares:1100000000}],"NKE","2026-10-30"),null);
});
