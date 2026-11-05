import "server-only";
import { parseAlpacaSearchSnapshots } from "./search-quotes";
import type { ResearchSearchQuote } from "./types";

const HOST="https://data.alpaca.markets/v2/stocks/snapshots";
const cache=new Map<string,{until:number;quotes:Record<string,ResearchSearchQuote>}>();
const pending=new Map<string,Promise<Record<string,ResearchSearchQuote>>>();
/** One batched IEX market data request for every search result page, never
 * one remote request per ticker. Small cache prevents repeated API hits while
 * a user edits the search box. API keys are server-only. */
export async function loadResearchSearchQuotes(symbols:string[]){
 if(!symbols.length||symbols.length>20||
  symbols.some(s=>!/^[A-Z0-9][A-Z0-9.\-]{0,15}$/.test(s)))
  throw new Error("Invalid quote symbol list.");
 const keyId=process.env.ALPACA_PAPER_KEY_ID?.trim();
 const secret=process.env.ALPACA_PAPER_SECRET_KEY?.trim();
 if(!keyId||!secret)throw new Error("Missing Alpaca Paper credentials.");
 const unique=[...new Set(symbols)];
 const key=[...unique].sort().join(",");
 const cached=cache.get(key);
 if(cached&&cached.until>Date.now())return cached.quotes;
 const inFlight=pending.get(key);
 if(inFlight)return inFlight;
 const work=(async()=>{
  const params=new URLSearchParams({symbols:key,feed:"iex"});
  const response=await fetch(HOST+"?"+params.toString(),{
   method:"GET",cache:"no-store",
   headers:{"APCA-API-KEY-ID":keyId,"APCA-API-SECRET-KEY":secret,Accept:"application/json"},
   signal:AbortSignal.timeout(12000),
  });
  if(!response.ok)throw new Error("Alpaca IEX snapshot unavailable");
  const raw:unknown=await response.json();
  const quotes=parseAlpacaSearchSnapshots(raw,unique);
  if(cache.size>80)cache.clear();
  cache.set(key,{quotes,until:Date.now()+25_000});
  return quotes;
 })();
 pending.set(key,work);
 try{return await work;}finally{pending.delete(key);}
}
