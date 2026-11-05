import {NextRequest,NextResponse} from "next/server";
import {hasPrivatePreviewSession} from "./lib/private-preview/access";

/** Owner-only Private Beta; public signup is intentionally not enabled here.
 * Every document and API needs an authenticated signed session in production.
 * Static Next.js assets carry no personalized data. */
export function proxy(request:NextRequest){
 if(process.env.NODE_ENV!=="production")return NextResponse.next();
 const path=request.nextUrl.pathname;
 if(path==="/private-preview"||path==="/api/private-preview/session")return NextResponse.next();
 if(hasPrivatePreviewSession(request))return NextResponse.next();
 if(path.startsWith("/api/")){
  return NextResponse.json({status:"unauthorized",
   message:"Private Beta login required before accessing SEE Portfolio APIs."},
   {status:401,headers:{"Cache-Control":"private, no-store"}});
 }
 const url=request.nextUrl.clone();
 url.pathname="/private-preview";
 url.search="";
 return NextResponse.redirect(url);
}
export const config={
 matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)).*)"],
};
