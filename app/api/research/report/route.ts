import { NextResponse } from "next/server";
import { loadResearchReport, validateResearchSymbol } from "../../../../lib/research/server";
import type { StockReport } from "../../../../lib/research/types";

const headers={"Cache-Control":"private, no-store, max-age=0"};
export async function GET(request:Request){
  if(process.env.NODE_ENV!=="development")
    return NextResponse.json({status:"error",message:"Research is disabled until user authentication is available."},
      {status:403,headers});
  const symbol=validateResearchSymbol(new URL(request.url).searchParams.get("symbol")??"");
  if(!symbol)return NextResponse.json({status:"error",message:"Invalid stock symbol."},
    {status:400,headers});
  if(!process.env.ALPACA_PAPER_KEY_ID||!process.env.ALPACA_PAPER_SECRET_KEY)
    return NextResponse.json({status:"not_configured",message:"Configure Alpaca Paper credentials in .env.local."},{headers});
  try{
    const report=await loadResearchReport(symbol);
    if(!report)return NextResponse.json({status:"error",message:"No active US equity found for this ticker."},{status:404,headers});
    return NextResponse.json({status:"ok",data:report},{headers});
  }catch{
    return NextResponse.json({status:"error",message:"Company report is temporarily unavailable."},{status:502,headers});
  }
}
