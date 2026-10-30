import "server-only";
import { loadDailyStockCloses } from "../alpaca/market-data";
import { calculateRisk } from "../analytics/risk";
import { MAX_RESEARCH_WATCHLIST, symbolPattern } from "./types";
export { rankResearchMatches } from "./search-ranking";
import type { ResearchAsset, ResearchArticle, StockReport } from "./types";

const PAPER = "https://paper-api.alpaca.markets";
const DATA = "https://data.alpaca.markets";
const TIMEOUT_MS = 12000;
const ASSET_CACHE_MS = 15 * 60 * 1000;
type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown): string => typeof value === "string" ? value : "";
const credentials = () => {
  const key = process.env.ALPACA_PAPER_KEY_ID?.trim();
  const secret = process.env.ALPACA_PAPER_SECRET_KEY?.trim();
  if (!key || !secret) throw new Error("Alpaca Paper credentials have not been configured.");
  return { "APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret, Accept:"application/json" };
};
async function getAlpaca(url:string):Promise<unknown>{
  const response = await fetch(url,{
    method:"GET",headers:credentials(),cache:"no-store",
    signal:AbortSignal.timeout(TIMEOUT_MS),
  });
  if(!response.ok) throw new Error("Alpaca market data is temporarily unavailable.");
  return response.json() as Promise<unknown>;
}
function parseAsset(raw: unknown):ResearchAsset | null {
  if(!isRecord(raw))return null;
  const symbol=str(raw.symbol).toUpperCase();
  if(!symbolPattern.test(symbol) || str(raw.asset_class)!=="us_equity" ||
     str(raw.status)!=="active")return null;
  return {symbol,name:str(raw.name)||symbol,exchange:str(raw.exchange)||"US",
    tradable:raw.tradable===true};
}
let assetCache:{until:number; data:ResearchAsset[]}|null=null;
let pending:Promise<ResearchAsset[]>|null=null;
/** Alpaca /v2/assets has no company-name query; filter the verified asset catalog here. */
export async function loadActiveResearchAssets():Promise<ResearchAsset[]>{
  const now=Date.now();
  if(assetCache && assetCache.until>now) return assetCache.data;
  if(pending)return pending;
  pending=(async()=>{
    const raw=await getAlpaca(PAPER+"/v2/assets?status=active&asset_class=us_equity");
    if(!Array.isArray(raw)) throw new Error("Unexpected asset-directory response.");
    const result=raw.map(parseAsset).filter((a):a is ResearchAsset=>a!==null);
    if(!result.length) throw new Error("No research assets were returned.");
    assetCache={until:Date.now()+ASSET_CACHE_MS,data:result};
    return result;
  })();
  try{return await pending;}finally{pending=null;}
}
export function validateResearchSymbol(value:string):string|null {
  const symbol=value.toUpperCase().trim();
  return symbolPattern.test(symbol)?symbol:null;
}

export async function loadResearchNews(symbols:string[],limit=12):Promise<ResearchArticle[]>{
  if(!symbols.length)return [];
  if(symbols.length>MAX_RESEARCH_WATCHLIST ||
    symbols.some(s=>!symbolPattern.test(s))) throw new Error("Invalid requested news symbols.");
  const params=new URLSearchParams({
    symbols:symbols.join(","),limit:String(Math.min(30,Math.max(1,limit))),
    sort:"desc",exclude_contentless:"false",
  });
  // News defaults can be as short as today's articles; specify last 30 calendar days.
  const start=new Date();start.setUTCDate(start.getUTCDate()-30);
  params.set("start",start.toISOString().slice(0,10));
  const raw=await getAlpaca(DATA+"/v1beta1/news?"+params.toString());
  if(!isRecord(raw) || !Array.isArray(raw.news)) throw new Error("Unexpected research news response.");
  const unique=new Set<string>();
  const articles:ResearchArticle[]=[];
  for(const item of raw.news){
    if(!isRecord(item))continue;
    const headline=str(item.headline).trim(), source=str(item.source).trim();
    const publishedAt=str(item.created_at);
    const id=typeof item.id==="number"||typeof item.id==="string"?String(item.id):"";
    if(!headline||!id||unique.has(id))continue;
    unique.add(id);
    const urlRaw=str(item.url);
    let url:string|null=null;
    try{
      const parsed=new URL(urlRaw);
      if(["https:","http:"].includes(parsed.protocol)) url=parsed.href;
    }catch{}
    const mentioned=Array.isArray(item.symbols)?item.symbols.filter((s):s is string=>typeof s==="string"):[];
    articles.push({id,symbol:mentioned.find(s=>symbols.includes(s))||symbols[0],
      headline,summary:str(item.summary).slice(0,500),source:source||"Unknown source",
      publishedAt,url});
  }
  return articles;
}

export async function loadResearchReport(symbol:string):Promise<StockReport|null>{
  const assets=await loadActiveResearchAssets();
  const asset=assets.find(a=>a.symbol===symbol);
  if(!asset)return null;
  const [historical,headlines]=await Promise.allSettled([
    loadDailyStockCloses([symbol]),loadResearchNews([symbol],10),
  ]);
  const warnings:string[]=[];
  const prices=historical.status==="fulfilled"?historical.value[symbol]??[]:[];
  const series=[...new Map(prices.map(p=>[p.date,p.close])).entries()]
    .map(([date,close])=>({date,close})).sort((a,b)=>a.date.localeCompare(b.date));
  if(historical.status==="rejected"||!series.length)
    warnings.push("Historical IEX closing prices are unavailable; risk statistics cannot be computed.");
  let risk:StockReport["risk"]=null;
  if(series.length>=2){
    // A $100 notional is an analysis-only mathematical input, not a held position.
    const r=calculateRisk([{symbol,marketValue:100}],{[symbol]:series});
    risk={
      annualizedVolatilityPct:r.annualizedVolatilityPct,
      maxDrawdownPct:r.maxDrawdownPct,
      var95Pct:r.var95Pct,
      expectedShortfall95Pct:r.expectedShortfall95Pct,
      observations:r.dailyReturnObservations,
    };
  }
  if(headlines.status==="rejected")
    warnings.push("Recent Alpaca news could not be retrieved. Prices and risk may still be available.");
  const latest=series.at(-1)?.close??null, previous=series.at(-2)?.close??null;
  return {
    asset,asOf:series.at(-1)?.date??new Date().toISOString().slice(0,10),
    closeCurrency:"USD",latestClose:latest,previousClose:previous,
    changePct:latest!==null&&previous!==null&&previous>0?(latest/previous-1)*100:null,
    chart:series.slice(-130),risk,
    news:headlines.status==="fulfilled"?headlines.value:[],
    warnings,
  };
}
