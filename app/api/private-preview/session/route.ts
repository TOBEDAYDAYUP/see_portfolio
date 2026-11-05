import {NextResponse} from "next/server";
import {PREVIEW_COOKIE,PREVIEW_SESSION_SECONDS,hasPrivatePreviewSession,
  isPreviewConfigured,issuePreviewSession,verifyPreviewPassword} from "../../../../lib/private-preview/access";
import {reserveLoginBudget} from "../../../../lib/private-preview/limits";

const headers={"Cache-Control":"private, no-store, max-age=0"};
function originAllowed(request:Request):boolean{
 const origin=request.headers.get("origin");
 if(!origin)return true; // non-browser clients cannot read the HttpOnly session
 try{return new URL(origin).origin===new URL(request.url).origin;}catch{return false;}
}
export async function GET(request:Request){
 return NextResponse.json({
  status:"ok",configured:isPreviewConfigured(),authenticated:hasPrivatePreviewSession(request),
 },{headers});
}
export async function POST(request:Request){
 if(process.env.NODE_ENV!=="production")
  return NextResponse.json({status:"error",message:"This login is for cloud Private Beta only."},
   {status:400,headers});
 if(!isPreviewConfigured())
  return NextResponse.json({status:"not_configured",
   message:"Private Beta requires owner access password, signing secret and Upstash Redis in Vercel environment variables."},
   {status:503,headers});
 if(!originAllowed(request))
  return NextResponse.json({status:"error",message:"Invalid request origin."},{status:403,headers});
 if(!(await reserveLoginBudget()))
  return NextResponse.json({status:"error",message:"Login is temporarily rate-limited or unavailable."},
   {status:429,headers});
 let password:unknown;
 try{password=(await request.json() as Record<string,unknown>).password;}catch{
  return NextResponse.json({status:"error",message:"Invalid login request."},{status:400,headers});
 }
 if(!verifyPreviewPassword(password,process.env.SEE_PREVIEW_PASSWORD))
  return NextResponse.json({status:"error",message:"Invalid access password."},{status:401,headers});
 const response=NextResponse.json({status:"ok"},{headers});
 response.cookies.set(PREVIEW_COOKIE,issuePreviewSession(process.env.SEE_PREVIEW_SESSION_SECRET!),{
  path:"/",httpOnly:true,secure:true,sameSite:"strict",maxAge:PREVIEW_SESSION_SECONDS,
 });
 return response;
}
export async function DELETE(request:Request){
 if(!originAllowed(request))return NextResponse.json({status:"error"},{status:403,headers});
 const response=NextResponse.json({status:"ok"},{headers});
 response.cookies.set(PREVIEW_COOKIE,"",{path:"/",httpOnly:true,secure:true,sameSite:"strict",maxAge:0});
 return response;
}
