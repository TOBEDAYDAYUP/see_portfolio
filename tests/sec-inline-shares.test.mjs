import test from "node:test";
import assert from "node:assert/strict";
import {parseSECInlineShares,selectSECPrimaryFiling} from "../lib/research/sec-inline-shares.ts";

const context=(id,member,instant="2026-09-28")=>
 `<xbrli:context id="${id}"><xbrli:entity><xbrli:segment><xbrldi:explicitMember dimension="dei:LegalEntityAxis">${member}</xbrldi:explicitMember></xbrli:segment></xbrli:entity><xbrli:period><xbrli:instant>${instant}</xbrli:instant></xbrli:period></xbrli:context>`;
const fact=(ctx,value)=>
 `<ix:nonFraction name="dei:EntityCommonStockSharesOutstanding" contextRef="${ctx}" scale="0">${value}</ix:nonFraction>`;
test("SEC original Inline XBRL sums independently identified Class A/B issuer shares",()=>{
 const raw=context("class-a","nke:ClassAMember")+context("class-b","nke:ClassBMember")+
  fact("class-a","281,387,752")+fact("class-b","1,203,921,077");
 const p=parseSECInlineShares(raw,"2026-10-30","2026-10-01","https://www.sec.gov/Archives/test.htm");
 assert.equal(p?.value,1485308829);
 assert.equal(p?.asOf,"2026-09-28");
 assert.equal(p?.source,"SEC filing inline XBRL");
});
test("No blind extrapolation from one class or cross-period figures",()=>{
 assert.equal(parseSECInlineShares(context("a","A")+fact("a","281,387,752"),
   "2026-10-30","2026-10-01","https://www.sec.gov/"),null);
 const mixed=context("a","A","2026-09-28")+context("b","B","2026-08-31")+
  fact("a","281,387,752")+fact("b","1,203,921,077");
 assert.equal(parseSECInlineShares(mixed,"2026-10-30","2026-10-01","https://www.sec.gov/"),null);
});
test("Select latest filing disclosed by the price reference day, never future filing",()=>{
 const recent={filings:{recent:{
  form:["10-Q","10-Q","8-K"],filingDate:["2026-11-02","2026-10-01","2026-09-30"],
  accessionNumber:["0000320187-26-000205","0000320187-26-000193","0000320187-26-000180"],
  primaryDocument:["nke-20261102.htm","nke-20260831.htm","8k.htm"]
 }}};
 const result=selectSECPrimaryFiling(recent,"2026-10-30","0000320187");
 assert.equal(result?.filed,"2026-10-01");
 assert.ok(result?.url.endsWith("/000032018726000193/nke-20260831.htm"));
});
