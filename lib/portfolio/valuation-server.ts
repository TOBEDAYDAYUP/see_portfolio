import "server-only";
import { loadPaperPortfolio } from "../alpaca/server";
import { loadDailyStockCloses } from "../alpaca/market-data";
import { loadFundamentals,hasSECContact } from "../research/sec-server";
import { calculateCurrentValuation } from "../research/valuation-current";
import { summarizePortfolioValuation, type ValuationSummary } from "./valuation";

export type PortfolioValuationResult=
 |{status:"connected";summary:ValuationSummary;fetchedAt:string;notes:string[]}
 |{status:"not_configured";message:string}
 |{status:"error";message:string};
export async function loadPortfolioValuation():Promise<PortfolioValuationResult>{
 if(!hasSECContact())return {status:"not_configured",
   message:"Set your own SEC_USER_AGENT in .env.local to enable SEC fundamentals. Optional FMP_API_KEY supplements missing shares."};
 const account=await loadPaperPortfolio();
 if(account.status!=="connected")return {status:account.status==="not_configured"?"not_configured":"error",
  message:"Alpaca Paper positions unavailable or credentials not configured."};
 const eligible=account.positions.filter(p=>p.assetClass==="us_equity"&&p.side==="long"&&
  p.marketValue!==null&&p.marketValue>0);
 // Cap requests to bound SEC rate, and explicitly disclose exclusions.
 const MAX=12;
 const selected=eligible.slice(0,MAX);
 let prices:Record<string,{date:string;close:number}[]>={};
 try{
  if(selected.length)prices=await loadDailyStockCloses(selected.map(p=>p.symbol));
 }catch{/* Missing quotes only disable affected multiples. */}
 const inputs:{position:typeof account.positions[number];valuation:null|ReturnType<typeof calculateCurrentValuation>;reason?:string}[]=[];
 for(let i=0;i<selected.length;i+=3){
  const group=selected.slice(i,i+3);
  const results=await Promise.all(group.map(async position=>{
   const last=prices[position.symbol]?.at(-1);
   if(!last)return {position,valuation:null,reason:"Historical IEX reference close unavailable."};
   try{
    const fundamentals=await loadFundamentals(position.symbol,last.date);
    if(!fundamentals)return {position,valuation:null,reason:"No compatible SEC 10-K US-GAAP fundamentals (foreign/ETF/unsupported)."};
    return {position,valuation:calculateCurrentValuation(fundamentals,last.close,last.date,"Alpaca IEX")};
   }catch{return {position,valuation:null,reason:"Fundamental source unavailable or unsupported."};}
  }));
  inputs.push(...results);
 }
 for(const position of eligible.slice(MAX))
  inputs.push({position,valuation:null,reason:"Beyond per-request 12-symbol API safety limit."});
 return {status:"connected",fetchedAt:account.fetchedAt,
  summary:summarizePortfolioValuation(inputs),
  notes:[
   "Only eligible long US equities are evaluated; cash, ETFs, shorts and non-equities are outside the denominator.",
   "Portfolio P/E is weighted by earnings yield over covered profitable positions, not the arithmetic average of P/Es.",
   "Coverage percentages are fractions of eligible invested market value; unavailable earnings are never treated as zero.",
   "Valuation reference uses IEX daily close; position weights use separately timestamped Alpaca Paper mark-to-market values.",
   "SEC 10-K/10-Q is primary. A configured FMP API key can supplement missing total shares; provider and dates are shown.",
   "These are valuation multiples, not DCF intrinsic values or price targets.",
  ]};
}
