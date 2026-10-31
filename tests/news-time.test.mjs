import test from "node:test";
import assert from "node:assert/strict";
import { formatResearchNewsTimestamp } from "../lib/research/news-time.ts";

test("formats Alpaca UTC timestamp to exact hour and minute during EDT",()=>{
 assert.equal(formatResearchNewsTimestamp("2026-10-30T18:35:42Z"),"Oct 30, 2026 · 2:35 PM EDT");
});
test("automatically changes to EST after Toronto daylight saving time ends",()=>{
 assert.equal(formatResearchNewsTimestamp("2026-11-02T18:35:42Z"),"Nov 2, 2026 · 1:35 PM EST");
});
test("provider timestamps with explicit offsets preserve the minute",()=>{
 assert.equal(formatResearchNewsTimestamp("2026-10-30T14:35:50-04:00"),"Oct 30, 2026 · 2:35 PM EDT");
});
test("date-only, timezone-less and corrupt timestamps never fabricate a publishing time",()=>{
 for(const value of ["2026-10-30","2026-10-30T14:35:50","not a date","", "2026-13-99T17:40:00Z"]){
  assert.equal(formatResearchNewsTimestamp(value),"Time unavailable");
 }
});
