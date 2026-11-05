import test from "node:test";
import assert from "node:assert/strict";
import {interpretConnectionCheck} from "../lib/alpaca/connection-check.ts";

test("valid Alpaca account JSON shows connected and actual position count",()=>{
 const result=interpretConnectionCheck(200,JSON.stringify({status:"connected",positions:[{symbol:"AAPL"}]}));
 assert.deepEqual(result,{state:"connected",message:"Alpaca Paper connection successful. Open positions: 1."});
});
test("missing local credentials are not mistaken for an HTTP/network failure",()=>{
 const result=interpretConnectionCheck(200,JSON.stringify({status:"not_configured"}));
 assert.equal(result.state,"not_configured");
 assert.match(result.message,/\.env\.local/);
});
test("backend authentication and upstream failures preserve safe app messages",()=>{
 const result=interpretConnectionCheck(502,JSON.stringify({
  status:"error",code:"auth_failed",message:"Alpaca rejected these paper credentials.",
 }));
 assert.equal(result.state,"error");
 assert.match(result.message,/rejected/);
});
test("Next dev 404 or 500 HTML are differentiated from Alpaca key errors",()=>{
 const missing=interpretConnectionCheck(404,"<!DOCTYPE html><html>Not found</html>");
 assert.match(missing.message,/route was not found/);
 const server=interpretConnectionCheck(500,"Internal Server Error");
 assert.match(server.message,/HTTP 500/);
 assert.match(server.message,/Next\.js/);
});
test("unexpected or malformed JSON cannot fake a successful account connection",()=>{
 assert.equal(interpretConnectionCheck(200,"broken").state,"error");
 assert.equal(interpretConnectionCheck(200,JSON.stringify({hello:"world"})).state,"error");
 assert.equal(interpretConnectionCheck(502,JSON.stringify({status:"connected"})).state,"error");
});
