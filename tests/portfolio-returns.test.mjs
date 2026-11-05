import test from "node:test";
import assert from "node:assert/strict";
import {parseReturnsHistory,summarizeReportedPnlMovement,summarizeOpenUnrealized}
 from "../lib/portfolio/returns.ts";

test("source-aligned Alpaca profit/loss history excludes unknown or invalid timestamps",()=>{
 const raw={timestamp:[200,100,300,400,500],equity:[101,100,102,103,null],
  profit_loss:[1,0,2,null,4]};
 const allowed=new Set([100,200,300,400,500]);
 const points=parseReturnsHistory(raw,allowed);
 assert.deepEqual(points,[
  {timestamp:100,equity:100,profitLossUsd:0},
  {timestamp:200,equity:101,profitLossUsd:1},
  {timestamp:300,equity:102,profitLossUsd:2},
 ]);
 assert.deepEqual(parseReturnsHistory(raw,new Set([200])),[
  {timestamp:200,equity:101,profitLossUsd:1},
 ]);
});
test("never manufacture returns when Alpaca profit_loss array is missing",()=>{
 assert.deepEqual(parseReturnsHistory({timestamp:[100,200],equity:[100,200]},new Set([100,200])),[]);
 assert.deepEqual(parseReturnsHistory(null,new Set()),[]);
 assert.equal(summarizeReportedPnlMovement([]),null);
 assert.equal(summarizeReportedPnlMovement([{timestamp:1,equity:100,profitLossUsd:0}]),null);
});
test("reported P/L movement rebases from first observed actual point, not deposits-adjusted TWR",()=>{
 const s=summarizeReportedPnlMovement([
  {timestamp:100,equity:10000,profitLossUsd:50},
  {timestamp:200,equity:10100,profitLossUsd:80},
  {timestamp:300,equity:10200,profitLossUsd:150},
 ]);
 assert.ok(s);
 assert.equal(s.changeUsd,100);
 assert.equal(s.changePctOfOpeningEquity,1);
 assert.equal(s.observations,3);
});
test("summary refuses invalid time sequences and zero starting equity",()=>{
 assert.equal(summarizeReportedPnlMovement([
  {timestamp:2,equity:0,profitLossUsd:1},
  {timestamp:3,equity:4,profitLossUsd:2},
 ]),null);
});
const position=(overrides={})=>({
 symbol:"AAPL",assetClass:"us_equity",side:"long",qty:2,
 avgEntryPrice:100,currentPrice:120,marketValue:240,costBasis:200,
 unrealizedPl:40,unrealizedPlPct:.2,changeTodayPct:.01,...overrides,
});
test("unrealized returns use only current Alpaca positions, not a DCF estimate",()=>{
 assert.deepEqual(summarizeOpenUnrealized([]),{
  openCount:0,unrealizedUsd:0,unrealizedPctOfCost:0,
 });
 const result=summarizeOpenUnrealized([
  position(),position({symbol:"MSFT",costBasis:300,unrealizedPl:-10}),
 ]);
 assert.equal(result.openCount,2);
 assert.equal(result.unrealizedUsd,30);
 assert.equal(result.unrealizedPctOfCost,6);
});
test("unknown position costs or P/L remain unknown and never zero-fill",()=>{
 const result=summarizeOpenUnrealized([position(),position({symbol:"NKE",unrealizedPl:null})]);
 assert.equal(result.unrealizedUsd,null);
 assert.equal(result.unrealizedPctOfCost,null);
});
