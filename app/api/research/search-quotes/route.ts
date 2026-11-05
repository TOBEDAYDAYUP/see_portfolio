import { NextResponse } from "next/server";
import { loadResearchSearchQuotes } from "../../../../lib/research/search-quotes-server";

const headers={"Cache-Control":"private, no-store, max-age=0"};
export async function GET(request:Request){
 if(process.env.NODE_ENV!=="development")
  return NextResponse.json({status:"error",message:"Research quotes are disabled until user authentication is available."},{status:403,headers});
 const raw=new URL(request.url).searchParams.get("symbols")??"";
 const symbols=raw.split(",").map(s=>s.trim().toUpperCase());
 if(!symbols.length||symbols.length>20||
   symbols.some(s=>!/^[A-Z0-9][A-Z0-9.\-]{0,15}$/.test(s))){
  return NextResponse.json({status:"error",message:"Request 1–20 valid stock symbols."},{status:400,headers});
 }
 if(!process.env.ALPACA_PAPER_KEY_ID||!process.env.ALPACA_PAPER_SECRET_KEY)
  return NextResponse.json({status:"not_configured",message:"Alpaca Paper credentials are not configured."},{headers});
 try{
  const data=await loadResearchSearchQuotes(symbols);
  return NextResponse.json({status:"ok",data},{headers});
 }catch{
  return NextResponse.json({status:"error",message:"IEX price snapshots temporarily unavailable. Stock search remains usable."},{status:502,headers});
 }
}
