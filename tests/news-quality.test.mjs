import test from "node:test";
import assert from "node:assert/strict";
import {curateResearchNews,decodeNewsText} from "../lib/research/news-quality.ts";

const article=(id,headline,summary="",symbol="AAPL")=>({
 id,symbol,headline,summary,source:"Provider",publishedAt:"2026-10-30T20:00:00Z",
 url:"https://example.com/article/"+id,
});
test("decode HTML numeric and named entities as safe text",()=>{
 assert.equal(decodeNewsText("Apple&#39;s earnings &amp; revenue &quot;rise&quot;"),"Apple's earnings & revenue \"rise\"");
 assert.equal(decodeNewsText("&#x41;APL"),"AAPL");
});
test("company news is prioritized, sector noise is secondary and capped",()=>{
 const rows=[
  article("a","Alphabet Posts Worst Week, Intel Flags PC Slump"),
  article("b","Apple Acquires Ascend.io"),
  article("c","Intel AI Hardware Industry Forecast"),
  article("d","Apple Q3 iPhone Forecast Falls"),
  article("e","Nasdaq Tumbles 3 Percent"),
  article("f","Stock Market Sector Weakness"),
 ];
 const out=curateResearchNews(rows,{AAPL:"Apple Inc. Common Stock"},10);
 assert.deepEqual(out.filter(x=>x.category==="company").map(x=>x.id),["b","d"]);
 assert.ok(out.some(x=>x.category==="sector"));
 assert.equal(out.filter(x=>x.category==="sector").length,3);
});
test("cross-source duplicate Apple acquisition headlines are collapsed",()=>{
 const rows=[
  article("1","Apple Acquires Data-Management Startup Ascend.io"),
  article("2","'Apple Acquires Ascend.io' - MacRumors"),
  article("3","Bank of America Lowers Apple iPhone Forecast"),
 ];
 const result=curateResearchNews(rows,{AAPL:"Apple Inc."},10);
 assert.equal(result.length,2);
 assert.equal(result[0].id,"1");
});
test("whole-word company detection must not match pineapple to Apple",()=>{
 const out=curateResearchNews([article("a","Pineapple harvest season improves")],{AAPL:"Apple Inc."});
 assert.equal(out[0].category,"sector");
});
