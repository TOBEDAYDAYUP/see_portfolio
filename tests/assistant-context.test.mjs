import test from "node:test";
import assert from "node:assert/strict";
import {findAssistantSymbols,classifyAssistantDataNeeds,formatAssistantEvidence}
 from "../lib/assistant/context.ts";
const assets=[
 {symbol:"AAPL",name:"Apple Inc. Common Stock",exchange:"NASDAQ",tradable:true},
 {symbol:"NVDA",name:"NVIDIA Corporation Common Stock",exchange:"NASDAQ",tradable:true},
 {symbol:"MSFT",name:"Microsoft Corporation Common Stock",exchange:"NASDAQ",tradable:true},
 {symbol:"JNJ",name:"Johnson & Johnson Common Stock",exchange:"NYSE",tradable:true},
 {symbol:"PLTR",name:"Palantir Technologies Inc. Class A Common Stock",exchange:"NASDAQ",tradable:true},
 {symbol:"GOOGL",name:"Alphabet Inc. Class A Common Stock",exchange:"NASDAQ",tradable:true},
];
test("Assistant resolves Apple and exact ticker mentions without LLM hallucination",()=>{
 assert.deepEqual(findAssistantSymbols("Should we short Apple?",assets),["AAPL"]);
 assert.deepEqual(findAssistantSymbols("Analyze $AAPL now",assets),["AAPL"]);
 assert.deepEqual(findAssistantSymbols("Compare AAPL and NVDA",assets),["AAPL","NVDA"]);
 assert.deepEqual(findAssistantSymbols("What about Palantir Technologies?",assets),["PLTR"]);
});
test("No generic financial abbreviations or unknown tickers trigger external data",()=>{
 assert.deepEqual(findAssistantSymbols("What is TTM P/E and how does DCF work?",assets),[]);
 assert.deepEqual(findAssistantSymbols("Compare XYZ with cash",assets),[]);
 assert.deepEqual(findAssistantSymbols("Does API mean real-time data?",assets),[]);
});
test("Portfolio intent and data types remain on-demand and read-only",()=>{
 const v=classifyAssistantDataNeeds("What is my portfolio P/E and downside risk?", "", assets);
 assert.equal(v.portfolio,true);
 assert.equal(v.portfolioRisk,true);
 assert.equal(v.portfolioValuation,true);
 assert.equal(v.portfolioDividends,false);
 assert.deepEqual(v.symbols,[]);
 const p=classifyAssistantDataNeeds("What dividend income can my portfolio generate?", "",assets);
 assert.equal(p.portfolio,true);
 assert.equal(p.portfolioDividends,true);
 const single=classifyAssistantDataNeeds("What is Apple's revenue?", "",assets);
 assert.equal(single.portfolio,false);
 assert.deepEqual(single.symbols,["AAPL"]);
});
test("Follow-up can reuse the previous user-mentioned company without inventing another",()=>{
 const follow=classifyAssistantDataNeeds("Do you have recent information for it?","Analyze AAPL",assets);
 assert.deepEqual(follow.symbols,["AAPL"]);
 const explicit=classifyAssistantDataNeeds("How about NVDA?","Analyze AAPL",assets);
 assert.deepEqual(explicit.symbols,["NVDA"]);
});
test("Market evidence preserves source and as-of date while bounding context",()=>{
 const text=formatAssistantEvidence([{id:"S1",title:"AAPL historical price",
  source:"Alpaca IEX",asOf:"2026-10-30",summary:"IEX close USD 344.77",
  url:"https://www.alpaca.markets/"}]);
 assert.match(text,/\[S1\] AAPL historical price/);
 assert.match(text,/SOURCE: Alpaca IEX/);
 assert.match(text,/AS OF: 2026-10-30/);
 assert.match(text,/IEX close USD 344.77/);
 assert.equal(formatAssistantEvidence([]),"");
 assert.ok(formatAssistantEvidence(Array.from({length:20},(_,i)=>({
  id:"S"+i,title:"test",source:"Alpaca IEX",asOf:"2026-10-30",summary:"x".repeat(3000)
 }))).length<=7800);
});
