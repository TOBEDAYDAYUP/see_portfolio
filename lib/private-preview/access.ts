import {createHash,createHmac,randomBytes,timingSafeEqual} from "node:crypto";

export const PREVIEW_COOKIE="see_private_preview";
export const PREVIEW_SESSION_SECONDS=12*60*60;
const SAFE_SESSION=/^(\d{10,13})\.([a-f0-9]{24})\.([a-f0-9]{64})$/;
const secureEqual=(a:string,b:string):boolean=>{
 const left=Buffer.from(a),right=Buffer.from(b);
 return left.length===right.length&&timingSafeEqual(left,right);
};
export function isPreviewConfigured(env:NodeJS.ProcessEnv=process.env):boolean{
 const url=env.UPSTASH_REDIS_REST_URL??"";
 let host="";
 try{const parsed=new URL(url);if(parsed.protocol==="https:")host=parsed.hostname;}catch{}
 return (env.SEE_PREVIEW_PASSWORD?.length??0)>=20
  &&(env.SEE_PREVIEW_SESSION_SECRET?.length??0)>=32
  &&host.endsWith(".upstash.io")
  &&!!env.UPSTASH_REDIS_REST_TOKEN;
}
function signature(input:string,secret:string):string{
 return createHmac("sha256",secret).update(input).digest("hex");
}
export function issuePreviewSession(secret:string,now=Date.now()):string{
 const expiry=Math.floor(now/1000)+PREVIEW_SESSION_SECONDS;
 const data=expiry+"."+randomBytes(12).toString("hex");
 return data+"."+signature(data,secret);
}
export function verifyPreviewSession(cookie:string|undefined,secret:string|undefined,now=Date.now()):boolean{
 if(!secret||secret.length<32||!cookie||cookie.length>160)return false;
 const match=cookie.match(SAFE_SESSION);
 if(!match)return false;
 const expires=Number(match[1]),nowSeconds=Math.floor(now/1000);
 if(!Number.isSafeInteger(expires)||expires<=nowSeconds||
    expires>nowSeconds+PREVIEW_SESSION_SECONDS)return false;
 const data=match[1]+"."+match[2];
 return secureEqual(match[3],signature(data,secret));
}
export function verifyPreviewPassword(value:unknown,correct:string|undefined):boolean{
 if(typeof value!=="string"||value.length>256||!correct||correct.length<20)return false;
 const hashed=(s:string)=>createHash("sha256").update(s).digest("hex");
 return secureEqual(hashed(value),hashed(correct));
}
export function getCookieValue(header:string|null,name=PREVIEW_COOKIE):string|undefined{
 if(!header)return undefined;
 const pair=header.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
 const encoded=pair?.slice(name.length+1);
 if(!encoded)return undefined;
 try{return decodeURIComponent(encoded);}catch{return undefined;}
}
export function hasPrivatePreviewSession(request:Request):boolean{
 if(process.env.NODE_ENV!=="production")return true;
 if(!isPreviewConfigured())return false;
 return verifyPreviewSession(getCookieValue(request.headers.get("cookie")),
  process.env.SEE_PREVIEW_SESSION_SECRET);
}
export function canUsePrivateResearch(request:Request):boolean{
 return process.env.NODE_ENV==="development"||hasPrivatePreviewSession(request);
}
