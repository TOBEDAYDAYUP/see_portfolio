import "server-only";

/** Uses a fixed-window Redis EVAL so all Vercel instances share one atomic
 * request budget. Missing Redis credentials or a failed REST call blocks paid
 * requests; unlike in-memory counters it cannot silently reset on cold start. */
const LUA="local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]);end;return n";
const limits={minute:{seconds:60,max:6},day:{seconds:86400,max:60},
  loginMinute:{seconds:900,max:12},loginGlobal:{seconds:900,max:50}} as const;
export type LimitName=keyof typeof limits;

export function limitBucket(name:LimitName,now=Date.now()):string{
 const limit=limits[name];
 return "see:preview:"+name+":"+Math.floor(now/(limit.seconds*1000));
}
export async function reservePrivateQuota(name:LimitName):Promise<boolean>{
 const url=process.env.UPSTASH_REDIS_REST_URL;
 const token=process.env.UPSTASH_REDIS_REST_TOKEN;
 if(!url||!token)return false;
 let parsed:URL;
 try{parsed=new URL(url);}catch{return false;}
 if(parsed.protocol!=="https:"||!parsed.hostname.endsWith(".upstash.io"))return false;
 const {seconds,max}=limits[name];
 try{
  const response=await fetch(parsed.origin,{
   method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify(["EVAL",LUA,"1",limitBucket(name),String(seconds+5)]),
   cache:"no-store",signal:AbortSignal.timeout(3000),
  });
  if(!response.ok)return false;
  const body:unknown=await response.json();
  if(!body||typeof body!=="object"||!("result" in body))return false;
  const count=(body as {result:unknown}).result;
  return typeof count==="number"&&Number.isFinite(count)&&count>=1&&count<=max;
 }catch{return false;}
}
export async function reserveAssistantBudget():Promise<boolean>{
 // Both limits always run; a failed or exhausted one denies the provider call.
 const minute=await reservePrivateQuota("minute");
 if(!minute)return false;
 return reservePrivateQuota("day");
}
export async function reserveLoginBudget():Promise<boolean>{
 const global=await reservePrivateQuota("loginGlobal");
 if(!global)return false;
 return reservePrivateQuota("loginMinute");
}
