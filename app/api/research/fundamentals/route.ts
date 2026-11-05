import { NextResponse } from "next/server";
import {canUsePrivateResearch} from "../../../../lib/private-preview/access";
import { hasSECContact,loadFundamentals } from "../../../../lib/research/sec-server";
import { symbolPattern } from "../../../../lib/research/types";

const headers={"Cache-Control":"private, no-store, max-age=0"};
export async function GET(request:Request){
 if(!canUsePrivateResearch(request)){
  return NextResponse.json({status:"error",message:"Company fundamentals remain disabled in production until authentication is configured."}
   ,{status:403,headers});
 }
 const symbol=new URL(request.url).searchParams.get("symbol")?.toUpperCase().trim()??"";
 if(!symbolPattern.test(symbol))return NextResponse.json({
   status:"error",message:"Enter a valid US listed stock symbol."
 },{status:400,headers});
 const asOf=new URL(request.url).searchParams.get("asOf")??new Date().toISOString().slice(0,10);
 const asOfTime=Date.parse(asOf+"T00:00:00Z");
 const age=Date.now()-asOfTime;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||!Number.isFinite(asOfTime)||age< -86400000||age>45*86400000){
  return NextResponse.json({status:"error",message:"Invalid or stale research price date."},{status:400,headers});
 }
 if(!hasSECContact()){
  return NextResponse.json({status:"not_configured",message:
    "SEC identification is required: add SEC_USER_AGENT=\"SEE Portfolio Research your-real-email@example.com\" to your local .env.local, using your own email address. Restart npm run dev. Never put this in client code."
  },{headers});
 }
 try{
  const data=await loadFundamentals(symbol,asOf);
  if(!data)return NextResponse.json({status:"not_available",
   message:"This ticker has no supported SEC 10-K US-GAAP annual financial facts. Some ETFs, foreign issuers and special listings do not file comparable 10-K financials."
  },{headers});
  return NextResponse.json({status:"ok",data},{headers});
 }catch{
  return NextResponse.json({status:"error",message:
   "SEC EDGAR financials are temporarily unavailable. Check SEC_USER_AGENT, fair-access restrictions and connectivity."
  },{status:502,headers});
 }
}
