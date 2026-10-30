import { NextResponse } from "next/server";
import { loadActiveResearchAssets, loadResearchNews, validateResearchSymbol } from "../../../../lib/research/server";
import { MAX_RESEARCH_WATCHLIST } from "../../../../lib/research/types";
import type { ResearchArticle } from "../../../../lib/research/types";
const headers={"Cache-Control":"private, no-store, max-age=0"};
export async function GET(request:Request){
  if(process.env.NODE_ENV!=="development")
    return NextResponse.json({status:"error",message:"Research is disabled until user authentication is available."},
      {status:403,headers});
  const input=new URL(request.url).searchParams.get("symbols")??"";
  const symbols=[...new Set(input.split(",").map(x=>x.trim().toUpperCase()).filter(Boolean))];
  if(!symbols.length||symbols.length>MAX_RESEARCH_WATCHLIST||
      symbols.some(s=>validateResearchSymbol(s)!==s))
    return NextResponse.json({status:"error",message:"Select 1–30 valid research symbols."},
      {status:400,headers});
  if(!process.env.ALPACA_PAPER_KEY_ID||!process.env.ALPACA_PAPER_SECRET_KEY)
    return NextResponse.json({status:"not_configured",message:"Configure Alpaca Paper credentials in .env.local."},{headers});
  try{
    const assets=await loadActiveResearchAssets();
    const allowed=new Set(assets.map(a=>a.symbol));
    if(symbols.some(s=>!allowed.has(s)))
      return NextResponse.json({status:"error",message:"Some watchlist tickers are no longer active US equities."},{status:400,headers});
    const news=await loadResearchNews(symbols,20);
    return NextResponse.json({status:"ok",data:news},{headers});
  }catch{
    return NextResponse.json({status:"error",message:"Watchlist news is temporarily unavailable."},{status:502,headers});
  }
}
