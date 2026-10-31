import "server-only";
import {loadPaperPortfolio} from "../alpaca/server";
import {parseCashDividends,parseReceivedDividends,summarizeDividends,
 type DividendSummary,type CashDividend,type ReceivedDividend} from "./dividends";

const PAPER="https://paper-api.alpaca.markets";
const DATA="https://data.alpaca.markets";
function credentials(){
 const id=process.env.ALPACA_PAPER_KEY_ID?.trim(),secret=process.env.ALPACA_PAPER_SECRET_KEY?.trim();
 if(!id||!secret)throw new Error("Missing Alpaca Paper API credentials");
 return {"APCA-API-KEY-ID":id,"APCA-API-SECRET-KEY":secret,Accept:"application/json"};
}
async function read(url:string):Promise<unknown>{
 const response=await fetch(url,{headers:credentials(),cache:"no-store",
  signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error("Dividend data provider unavailable");
 return response.json() as Promise<unknown>;
}
const marketToday=()=>{
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const part=(type:string)=>parts.find(x=>x.type===type)?.value??"";
 return part("year")+"-"+part("month")+"-"+part("day");
};
const dateAdd=(days:number)=>{
 const d=new Date(marketToday()+"T12:00:00Z");
 d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
};
async function corporateActions(symbols:string[]):Promise<{events:CashDividend[];complete:boolean}>{
 if(!symbols.length)return {events:[],complete:true};
 const params=new URLSearchParams({symbols:symbols.join(","),types:"cash_dividend",
  start:dateAdd(-415),end:dateAdd(100),limit:"1000",data_quality:"complete"});
 let token:string|null=null,complete=false;const combined:CashDividend[]=[];
 for(let n=0;n<4;n++){
  if(token)params.set("page_token",token);
  const raw=await read(DATA+"/v1/corporate-actions?"+params.toString());
  combined.push(...parseCashDividends(raw));
  if(!raw||typeof raw!=="object"||Array.isArray(raw))break;
  const next=(raw as Record<string,unknown>).next_page_token;
  token=typeof next==="string"&&next?next:null;
  if(!token){complete=true;break;}
 }
 return {events:[...new Map(combined.map(x=>[x.id,x])).values()],complete};
}
async function accountDividends():Promise<{paid:ReceivedDividend[];complete:boolean}>{
 // Retrieve DIV history only; never read live orders or execute transactions.
 const params=new URLSearchParams({direction:"desc",page_size:"100",after:dateAdd(-365)});
 const paid:ReceivedDividend[]=[];
 let token:string|null=null,complete=false;
 for(let i=0;i<6;i++){
  if(token)params.set("page_token",token);
  const raw=await read(PAPER+"/v2/account/activities/DIV?"+params.toString());
  if(!Array.isArray(raw))break;
  paid.push(...parseReceivedDividends(raw));
  if(raw.length<100){complete=true;break;}
  const last=raw.at(-1);
  if(!last||typeof last!=="object"||typeof last.id!=="string")break;
  token=last.id;
 }
 return {paid:[...new Map(paid.map(x=>[x.id,x])).values()],complete};
}
export type PortfolioDividendsResult=
 |{status:"connected";summary:DividendSummary;fetchedAt:string;eventsComplete:boolean;
   providerStatus:{accountActivities:"ok"|"unavailable";corporateActions:"ok"|"unavailable"}}
 |{status:"not_configured"|"error";message:string};
export async function loadPortfolioDividends():Promise<PortfolioDividendsResult>{
 const portfolio=await loadPaperPortfolio();
 if(portfolio.status!=="connected")return {status:portfolio.status==="not_configured"?"not_configured":"error",
  message:"Alpaca Paper positions cannot be loaded."};
 const symbols=portfolio.positions.filter(p=>p.assetClass==="us_equity"&&p.side==="long")
  .map(p=>p.symbol).slice(0,25);
 const [activities,corporate]=await Promise.allSettled([accountDividends(),corporateActions(symbols)]);
 const paid=activities.status==="fulfilled"?activities.value:{paid:[],complete:false};
 const events=corporate.status==="fulfilled"?corporate.value:{events:[],complete:false};
 const summary=summarizeDividends(portfolio.positions,events.events,paid.paid,paid.complete,
  marketToday());
 if(activities.status==="rejected")summary.warnings.push("Alpaca account DIV activity endpoint unavailable: received dividends are unknown, not zero.");
 if(corporate.status==="rejected")summary.warnings.push("Alpaca cash-dividend corporate actions unavailable: schedules and projections are unknown.");
 if(!events.complete)summary.warnings.push("Corporate action history pagination incomplete: annual run-rate unavailable when records may be missing.");
 // Never claim an annual estimate when corporate actions were not all retrieved.
 if(!events.complete){summary.annualizedRunRateUSD=null;summary.projectedCoveragePct=0;
  summary.rows=summary.rows.map(r=>({...r,annualRateUSD:null,annualRunRateUSD:null}));}
 return {status:"connected",summary,fetchedAt:portfolio.fetchedAt,eventsComplete:events.complete,
  providerStatus:{accountActivities:activities.status==="fulfilled"?"ok":"unavailable",
   corporateActions:corporate.status==="fulfilled"?"ok":"unavailable"}};
}
