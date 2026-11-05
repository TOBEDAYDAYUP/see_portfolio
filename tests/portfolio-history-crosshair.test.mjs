import test from "node:test";
import assert from "node:assert/strict";
import {nearestHistoryObservation,formatHistoryCrosshairTime}
 from "../lib/alpaca/history-crosshair.ts";

const line=[{x:100,y:150},{x:300,y:150},{x:500,y:90}];

test("hit tolerance selects an actual observation on the curve",()=>{
 assert.equal(nearestHistoryObservation({x:100,y:150},line,24),0);
 assert.equal(nearestHistoryObservation({x:299,y:160},line,24),1);
 assert.equal(nearestHistoryObservation({x:450,y:105},line,24),2);
 assert.equal(nearestHistoryObservation({x:200,y:163},line,24),1); // midpoint snaps to later observation
});
test("a mouse near a line segment works without hitting a 3px stroke",()=>{
 // At the middle of the segment, 20 SVG units away, still selectable.
 assert.equal(nearestHistoryObservation({x:250,y:170},line,24),1);
 // No selection if farther than the explicit 24-unit tolerance.
 assert.equal(nearestHistoryObservation({x:250,y:190},line,24),null);
});
test("do not produce a fake interpolated equity observation",()=>{
 // The helper returns only indexes from the supplied points array.
 const idx=nearestHistoryObservation({x:400,y:120},line,25);
 assert.ok(idx===1||idx===2);
 assert.ok(line[idx].x===300||line[idx].x===500);
});
test("single point, empty series, invalid pointer, invalid tolerance",()=>{
 assert.equal(nearestHistoryObservation({x:20,y:10},[{x:20,y:10}],1),0);
 assert.equal(nearestHistoryObservation({x:20,y:10},[],24),null);
 assert.equal(nearestHistoryObservation({x:NaN,y:10},line,24),null);
 assert.equal(nearestHistoryObservation({x:1,y:2},line,-1),null);
 assert.equal(nearestHistoryObservation({x:1,y:2},line,NaN),null);
});
test("timestamp uses New York local hour and handles daylight savings",()=>{
 const winter=formatHistoryCrosshairTime(Date.parse("2026-11-04T20:30:00Z")/1000);
 const summer=formatHistoryCrosshairTime(Date.parse("2026-07-04T20:30:00Z")/1000);
 assert.ok(winter.includes("Nov 4, 2026"));
 assert.ok(winter.includes("3:30 PM"));
 assert.ok(winter.includes("EST"));
 assert.ok(summer.includes("4:30 PM"));
 assert.ok(summer.includes("EDT"));
 assert.equal(formatHistoryCrosshairTime(Number.NaN),"Time unavailable");
});
