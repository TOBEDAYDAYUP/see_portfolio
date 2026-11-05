import { NextResponse } from "next/server";
import {canUsePrivateResearch} from "../../../../lib/private-preview/access";
import { loadStockChart } from "../../../../lib/research/chart-server";
import { validateResearchSymbol } from "../../../../lib/research/server";
import { CHART_RANGES } from "../../../../lib/research/chart-utils";
import type { ChartRange } from "../../../../lib/research/chart-utils";
const headers={"Cache-Control":"private, no-store, max-age=0"};
export async function GET(request:Request){
  if(!canUsePrivateResearch(request))
    return NextResponse.json({status:"error",message:"Research charts require user authentication before production deployment."},{status:403,headers});
  const url=new URL(request.url);
  const symbol=validateResearchSymbol(url.searchParams.get("symbol")??"");
  const range=url.searchParams.get("range")??"1M";
  if(!symbol||!CHART_RANGES.includes(range as ChartRange))
    return NextResponse.json({status:"error",message:"Choose a valid symbol and chart range."},{status:400,headers});
  if(!process.env.ALPACA_PAPER_KEY_ID||!process.env.ALPACA_PAPER_SECRET_KEY)
    return NextResponse.json({status:"not_configured",message:"Alpaca Paper API keys are not configured."},{headers});
  try{
    return NextResponse.json({status:"ok",data:await loadStockChart(symbol,range as ChartRange)},{headers});
  }catch{
    return NextResponse.json({status:"error",message:"Historical price/volume chart is temporarily unavailable for this interval."},{status:502,headers});
  }
}
