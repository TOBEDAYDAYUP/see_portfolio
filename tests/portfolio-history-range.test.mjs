import test from "node:test";
import assert from "node:assert/strict";
import {isPortfolioHistoryRange,portfolioHistoryRanges,portfolioHistoryRequestPath,
 portfolioHistoryResolution,portfolioHistoryFallbackPath} from "../lib/alpaca/history-range.ts";

const path=(range,createdAt,nowIso)=>{
 const result=portfolioHistoryRequestPath(range,createdAt,nowIso);
 assert.ok(result);
 const url=new URL(result,"https://paper-api.alpaca.markets");
 return url.searchParams;
};
test("exactly five allowed chart ranges, rejects arbitrary upstream parameters",()=>{
 assert.deepEqual([...portfolioHistoryRanges],["1D","1W","1M","1Y","ALL"]);
 for(const range of portfolioHistoryRanges)assert.equal(isPortfolioHistoryRange(range),true);
 for(const other of ["1A","5Y","all","../v2/orders","1Y&secret=true",""]){
  assert.equal(isPortfolioHistoryRange(other),false);
 }
});
test("1D and 1W request actual intraday equity snapshots",()=>{
 const day=path("1D");
 assert.equal(day.get("period"),"1D");
 assert.equal(day.get("timeframe"),"5Min");
 assert.equal(day.get("intraday_reporting"),"market_hours");
 const week=path("1W");
 assert.equal(week.get("period"),"1W");
 assert.equal(week.get("timeframe"),"1H");
});
test("1M and 1Y use daily snapshots; annual Alpaca unit is A",()=>{
 const month=path("1M");
 const year=path("1Y");
 assert.equal(month.get("period"),"1M");
 assert.equal(month.get("timeframe"),"1D");
 assert.equal(year.get("period"),"1A");
 assert.equal(year.get("timeframe"),"1D");
 assert.equal(portfolioHistoryResolution["1Y"],"Daily snapshots");
});
test("ALL is anchored at the actual account creation date, not 100 years",()=>{
 const all=path("ALL","2025-08-13T14:43:12.100Z","2026-11-05T04:00:00.000Z");
 assert.equal(all.get("start"),"2025-08-13");
 assert.equal(all.get("end"),"2026-11-05T04:00:00.000Z");
 assert.equal(all.get("timeframe"),"1D");
 assert.equal(all.has("period"),false);
 assert.equal(portfolioHistoryRequestPath("ALL"),null);
 assert.equal(portfolioHistoryRequestPath("ALL","invalid"),null);
 assert.equal(portfolioHistoryRequestPath("ALL","2025-99-99"),null);
});

test("ALL always has an explicit end, and rejects impossible future starts",()=>{
 assert.equal(portfolioHistoryRequestPath("ALL","2027-01-01T00:00:00Z","2026-11-05T00:00:00Z"),null);
 assert.equal(portfolioHistoryRequestPath("ALL","2025-02-30T00:00:00Z","2026-11-05T00:00:00Z"),null);
 const p=path("ALL","2024-06-01T13:00:00Z","2026-11-05T00:00:00Z");
 assert.equal(p.has("period"),false);
 assert.ok(p.has("start")&&p.has("end"));
});
test("only unsupported intraday ranges can use lower-resolution Alpaca fallback",()=>{
 const d=portfolioHistoryFallbackPath("1D");
 const w=portfolioHistoryFallbackPath("1W");
 assert.ok(d?.includes("timeframe=1H"));
 assert.ok(w?.includes("timeframe=1D"));
 assert.equal(portfolioHistoryFallbackPath("1M"),null);
 assert.equal(portfolioHistoryFallbackPath("1Y"),null);
 assert.equal(portfolioHistoryFallbackPath("ALL"),null);
});
