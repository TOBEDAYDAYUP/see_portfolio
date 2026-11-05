import { NextResponse } from "next/server";
import {canUsePrivateResearch} from "../../../../lib/private-preview/access";
import { loadActiveResearchAssets, rankResearchMatches } from "../../../../lib/research/server";

const headers={"Cache-Control":"private, no-store, max-age=0"};
export async function GET(request:Request){
  if(!canUsePrivateResearch(request))
    return NextResponse.json({status:"error",message:"Research is disabled until user authentication is available."},
      {status:403,headers});
  const q=new URL(request.url).searchParams.get("q")?.trim()??"";
  if(q.length<1||q.length>60)
    return NextResponse.json({status:"error",message:"Enter 1–60 characters to search."},
      {status:400,headers});
  if(!process.env.ALPACA_PAPER_KEY_ID||!process.env.ALPACA_PAPER_SECRET_KEY)
    return NextResponse.json({status:"not_configured",message:"Configure Alpaca Paper credentials in .env.local."},{headers});
  try{
    const assets=await loadActiveResearchAssets();
    return NextResponse.json({status:"ok",data:rankResearchMatches(assets,q)},{headers});
  }catch{
    return NextResponse.json({status:"error",message:"Stock directory is temporarily unavailable."},{status:502,headers});
  }
}
