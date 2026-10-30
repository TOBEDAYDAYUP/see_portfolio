import test from "node:test";
import assert from "node:assert/strict";
import { rankResearchMatches } from "../lib/research/search-ranking.ts";
import { parseSavedResearchAssets, MAX_SAVED_RESEARCH_ASSETS } from "../lib/research/storage.ts";
import { parseResearchAsset, parseResearchAssetDirectory } from "../lib/research/asset-parser.ts";

const items=[
  {symbol:"NVDA",name:"NVIDIA Corporation",exchange:"NASDAQ",tradable:true},
  {symbol:"NVDL",name:"GraniteShares 2x NVIDIA",exchange:"NASDAQ",tradable:true},
  {symbol:"MSFT",name:"Microsoft Corporation",exchange:"NASDAQ",tradable:true},
  {symbol:"AAPL",name:"Apple Inc.",exchange:"NASDAQ",tradable:true},
  {symbol:"AMZN",name:"Amazon.com, Inc.",exchange:"NASDAQ",tradable:true},
];
test("asset directory ranks exact ticker above symbol prefix and name match",()=>{
  assert.deepEqual(rankResearchMatches(items,"nvda").map(x=>x.symbol),["NVDA"]);
  assert.deepEqual(rankResearchMatches(items,"nvd").map(x=>x.symbol),["NVDA","NVDL"]);
  assert.deepEqual(rankResearchMatches(items,"nvidia").map(x=>x.symbol),["NVDA","NVDL"]);
});
test("search by company name is case-insensitive and limited",()=>{
  assert.equal(rankResearchMatches(items,"apple")[0]?.symbol,"AAPL");
  assert.equal(rankResearchMatches(items,"  MICROSOFT ")[0]?.symbol,"MSFT");
  assert.equal(rankResearchMatches(items,"a",1).length,1);
  assert.deepEqual(rankResearchMatches(items,"nosuchcompany"),[]);
});
test("search does not return anything for oversized/blank queries",()=>{
  assert.deepEqual(rankResearchMatches(items,""),[]);
  assert.deepEqual(rankResearchMatches(items,"a".repeat(61)),[]);
  assert.deepEqual(rankResearchMatches(items,"A",0),[]);
});
test("research localStorage drops malformed, duplicate and invalid symbols",()=>{
  const saved=parseSavedResearchAssets([
    items[0],items[0],null,{symbol:"bad ticker",name:"bad",exchange:"NYSE"},
    {symbol:"ABC",name:5,exchange:"NYSE"},items[3],
  ]);
  assert.deepEqual(saved.map(s=>s.symbol),["NVDA","AAPL"]);
});
test("research watchlist remains capped and never mutates input",()=>{
  const rows=Array.from({length:40},(_,i)=>({
    symbol:"T"+String(i).padStart(3,"0"),name:"Sample "+i,exchange:"NASDAQ",tradable:true,
  }));
  const result=parseSavedResearchAssets(rows);
  assert.equal(result.length,MAX_SAVED_RESEARCH_ASSETS);
  assert.equal(rows.length,40);
});
test("research storage only accepts properly shaped asset arrays",()=>{
  assert.deepEqual(parseSavedResearchAssets({symbol:"AAPL"}),[]);
  assert.deepEqual(parseSavedResearchAssets("AAPL"),[]);
  assert.equal(parseSavedResearchAssets([{symbol:"AAPL",name:"Apple",exchange:"NASDAQ",tradable:1}])[0].tradable,false);
});

test("official Alpaca /v2/assets class field yields Apple and NVIDIA instead of an empty directory",()=>{
  const assets=parseResearchAssetDirectory([
    {symbol:"AAPL",name:"Apple Inc. Common Stock",class:"us_equity",exchange:"NASDAQ",status:"active",tradable:true},
    {symbol:"NVDA",name:"NVIDIA Corporation",class:"us_equity",exchange:"NASDAQ",status:"active",tradable:true},
  ]);
  assert.deepEqual(assets.map(a=>a.symbol),["AAPL","NVDA"]);
  assert.equal(rankResearchMatches(assets,"Apple")[0]?.symbol,"AAPL");
});

test("asset parser handles alternate asset_class field without accepting crypto or inactive assets",()=>{
  assert.equal(parseResearchAsset({symbol:"MSFT",name:"Microsoft",asset_class:"us_equity",status:"active",exchange:"NASDAQ",tradable:true})?.symbol,"MSFT");
  assert.equal(parseResearchAsset({symbol:"ETHUSD",class:"crypto",status:"active",name:"Ether"}),null);
  assert.equal(parseResearchAsset({symbol:"AAPL",class:"us_equity",status:"inactive",name:"Apple"}),null);
  assert.equal(parseResearchAsset({symbol:"BAD TICKER",class:"us_equity",status:"active"}),null);
});

test("asset directory rejects unexpected non-array responses",()=>{
  assert.throws(()=>parseResearchAssetDirectory({message:"unexpected"}));
  assert.deepEqual(parseResearchAssetDirectory([]),[]);
});
