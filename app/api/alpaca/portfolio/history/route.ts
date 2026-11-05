import {NextResponse} from "next/server";
import {loadPaperHistory} from "../../../../../lib/alpaca/server";
import {isPortfolioHistoryRange} from "../../../../../lib/alpaca/history-range";

const headers={"Cache-Control":"private, no-store, max-age=0"};
/** Private paper account history; do not expose on unauthenticated production sites. */
export async function GET(request:Request){
 if(process.env.NODE_ENV!=="development"){
  return NextResponse.json({status:"error",message:
   "Account history is disabled in production until user authentication is implemented."
  },{status:403,headers});
 }
 const rawRange=new URL(request.url).searchParams.get("range")??"1M";
 if(!isPortfolioHistoryRange(rawRange)){
  return NextResponse.json({status:"error",message:"Unsupported history range."},
   {status:400,headers});
 }
 const result=await loadPaperHistory(rawRange);
 return NextResponse.json(result,{
  status:result.status==="error"?502:200,
  headers,
 });
}
