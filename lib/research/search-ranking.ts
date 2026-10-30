import type { ResearchAsset } from "./types";

/** Deterministic, testable local ranking over Alpaca's verified asset directory. */
export function rankResearchMatches(assets:ResearchAsset[],query:string,limit=20):ResearchAsset[]{
  const q=query.trim().toUpperCase();
  if(!q||q.length>60||limit<1)return [];
  return assets.map(asset=>{
    const ticker=asset.symbol.toUpperCase(),name=asset.name.toUpperCase();
    const rank=ticker===q?0:ticker.startsWith(q)?1:
      name.startsWith(q)?2:name.includes(q)?3:ticker.includes(q)?4:99;
    return {asset,rank};
  }).filter(x=>x.rank<99)
    .sort((a,b)=>a.rank-b.rank||a.asset.symbol.localeCompare(b.asset.symbol))
    .slice(0,limit).map(x=>x.asset);
}
