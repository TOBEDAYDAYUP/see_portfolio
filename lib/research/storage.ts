import type { ResearchAsset } from "./types";

export const MAX_SAVED_RESEARCH_ASSETS = 30;
const validTicker=/^[A-Z0-9][A-Z0-9.\-]{0,15}$/;

/** Never trust values loaded from mutable browser localStorage. */
export function parseSavedResearchAssets(value:unknown):ResearchAsset[]{
  if(!Array.isArray(value))return [];
  const seen=new Set<string>(),out:ResearchAsset[]=[];
  for(const entry of value){
    if(!entry||typeof entry!=="object"||Array.isArray(entry))continue;
    const obj=entry as Record<string,unknown>;
    if(typeof obj.symbol!=="string"||!validTicker.test(obj.symbol)||seen.has(obj.symbol))continue;
    if(typeof obj.name!=="string"||typeof obj.exchange!=="string")continue;
    seen.add(obj.symbol);
    out.push({symbol:obj.symbol,name:obj.name.slice(0,160),
      exchange:obj.exchange.slice(0,30),tradable:obj.tradable===true});
    if(out.length>=MAX_SAVED_RESEARCH_ASSETS)break;
  }
  return out;
}
