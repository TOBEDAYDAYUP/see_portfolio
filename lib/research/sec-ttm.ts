import type { AnnualFinancialRow } from "./fundamentals-types";
import { METRIC_TAGS, type SECUnitEntry } from "./financial-math.ts";

/** All computations use SEC facts filed on or before asOfDate. */
export type SECPoint = {value:number;asOf:string;filedAt:string;tag:string};
export type ResearchTTM = {
  periodEnd:string; filedAt:string; fiscalPeriod:"Q1"|"Q2"|"Q3";
  revenue:number|null; netIncome:number|null; operatingCashFlow:number|null;
  capex:number|null; dilutedEpsApprox:number|null;
  freeCashFlow:number|null;
};
export type RecentSECData = {
  ttm:ResearchTTM|null;
  sharesOutstanding:SECPoint|null;
  bookEquity:SECPoint|null;
  assets:SECPoint|null;
  liabilities:SECPoint|null;
  coverage:{latestFiled10Q:string|null;latest10QPeriodEnd:string|null;latestSECShareDate:string|null;latestSECBookDate:string|null};
  notes:string[];
};
type Obj=Record<string,unknown>;
const object=(x:unknown):x is Obj=>typeof x==="object"&&x!==null&&!Array.isArray(x);
const date=(x:unknown):x is string=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+"T00:00:00Z"));
const days=(a:string,b:string)=>(Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000;
const form=(x:unknown)=>x==="10-K"||x==="10-K/A"||x==="10-Q"||x==="10-Q/A";
type Candidate={tag:string;row:SECUnitEntry};
function facts(raw:unknown,taxonomy:string,tags:readonly string[],unit:string,
  asOfDate:string,instant:boolean):Candidate[]{
 if(!object(raw)||!object(raw.facts)||!object(raw.facts[taxonomy]))return [];
 const dictionary=raw.facts[taxonomy] as Obj;
 const list:Candidate[]=[];
 for(const tag of tags){
  const concept=dictionary[tag];
  if(!object(concept)||!object(concept.units))continue;
  const entries=concept.units[unit];
  if(!Array.isArray(entries))continue;
  for(const entry of entries){
   if(!object(entry)||!form(entry.form)||!date(entry.end)||!date(entry.filed)||
     entry.filed>asOfDate||entry.end>asOfDate||entry.filed<entry.end||
     typeof entry.val!=="number"||!Number.isFinite(entry.val))continue;
   if(instant ? entry.start!==undefined : !date(entry.start))continue;
   list.push({tag,row:entry as SECUnitEntry});
  }
 }
 return list;
}
function latestInstant(raw:unknown,taxonomy:string,tags:readonly string[],
  unit:string,asOfDate:string):SECPoint|null{
 const rows=facts(raw,taxonomy,tags,unit,asOfDate,true)
  .filter(({row})=>row.val!==undefined && (unit!=="shares"||row.val>0))
  .sort((a,b)=>b.row.end!.localeCompare(a.row.end!)||
    b.row.filed!.localeCompare(a.row.filed!)||tags.indexOf(a.tag)-tags.indexOf(b.tag));
 const first=rows[0];
 return first?{value:first.row.val!,asOf:first.row.end!,filedAt:first.row.filed!,tag:first.tag}:null;
}
function ytdFact(raw:unknown,tags:readonly string[],unit:string,
  start:string,end:string,asOfDate:string):number|null{
 const rows=facts(raw,"us-gaap",tags,unit,asOfDate,false).filter(({row})=>
  row.start===start&&row.end===end&&
  (row.form==="10-Q"||row.form==="10-Q/A"));
 rows.sort((a,b)=>tags.indexOf(a.tag)-tags.indexOf(b.tag)||
  b.row.filed!.localeCompare(a.row.filed!));
 return rows[0]?.row.val??null;
}
function bestPrior(raw:unknown,tags:readonly string[],unit:string,
  currentStart:string,currentEnd:string,asOfDate:string):number|null {
 const length=days(currentStart,currentEnd);
 const options=facts(raw,"us-gaap",tags,unit,asOfDate,false)
  .filter(({row})=>(row.form==="10-Q"||row.form==="10-Q/A")&&
    days(row.start!,currentStart)>=330&&days(row.start!,currentStart)<=400&&
    days(row.end!,currentEnd)>=330&&days(row.end!,currentEnd)<=400&&
    Math.abs(days(row.start!,row.end!)-length)<=15);
 options.sort((a,b)=>Math.abs(days(a.row.end!,currentEnd)-365)-
  Math.abs(days(b.row.end!,currentEnd)-365)||
  tags.indexOf(a.tag)-tags.indexOf(b.tag)||
  b.row.filed!.localeCompare(a.row.filed!));
 return options[0]?.row.val??null;
}
const diff=(a:number|null,b:number|null,c:number|null)=>
 a!==null&&b!==null&&c!==null&&Number.isFinite(a+b-c)?a+b-c:null;
/** TTM = FY 10-K + latest fiscal YTD 10-Q - comparable prior-year YTD 10-Q. */
export function parseSECTTM(raw:unknown,annual:AnnualFinancialRow[],
  asOfDate:string):ResearchTTM|null {
 const fy=annual[0];
 if(!fy||fy.filedAt>asOfDate)return null;
 const candidates=facts(raw,"us-gaap",[
  ...METRIC_TAGS.revenue,...METRIC_TAGS.netIncome], "USD",asOfDate,false)
  .filter(({row})=>(row.form==="10-Q"||row.form==="10-Q/A")&&
    days(fy.fiscalYearEnd,row.start!)>=1&&days(fy.fiscalYearEnd,row.start!)<=15&&
    days(fy.fiscalYearEnd,row.end!)>=55&&days(fy.fiscalYearEnd,row.end!)<=320&&
    days(row.start!,row.end!)>=55&&days(row.start!,row.end!)<=310);
 candidates.sort((a,b)=>b.row.end!.localeCompare(a.row.end!)||b.row.filed!.localeCompare(a.row.filed!));
 const pick=candidates[0]?.row;
 if(!pick)return null;
 const periodLength=days(pick.start!,pick.end!);
 const fiscalPeriod:ResearchTTM["fiscalPeriod"]=periodLength<=115?"Q1":
 periodLength<=220?"Q2":"Q3";
 const value=(key:"revenue"|"netIncome"|"operatingCashFlow"|"capitalExpenditure"|"dilutedEps")=>{
  const unit=key==="dilutedEps"?"USD/shares":"USD";
  const tags=METRIC_TAGS[key];
  return diff(fy.metrics[key],ytdFact(raw,tags,unit,pick.start!,pick.end!,asOfDate),
   bestPrior(raw,tags,unit,pick.start!,pick.end!,asOfDate));
 };
 const ocf=value("operatingCashFlow"),capex=value("capitalExpenditure");
 const data:ResearchTTM={
  periodEnd:pick.end!,filedAt:pick.filed!,fiscalPeriod,
  revenue:value("revenue"),netIncome:value("netIncome"),
  operatingCashFlow:ocf,capex,
  dilutedEpsApprox:value("dilutedEps"),
  freeCashFlow:ocf!==null&&capex!==null&&capex>=0?ocf-capex:null,
 };
 // If nothing reconciles, avoid an empty TTM object masquerading as a report.
 return [data.revenue,data.netIncome,data.operatingCashFlow,data.dilutedEpsApprox]
  .some(v=>v!==null)?data:null;
}
export function parseSECRecentData(raw:unknown,annual:AnnualFinancialRow[],
 asOfDate:string):RecentSECData{
 const ttm=parseSECTTM(raw,annual,asOfDate);
 const shares=latestInstant(raw,"dei",["EntityCommonStockSharesOutstanding"],
  "shares",asOfDate)??latestInstant(raw,"us-gaap",["CommonStockSharesOutstanding"],"shares",asOfDate);
 const book=latestInstant(raw,"us-gaap",["StockholdersEquity"],"USD",asOfDate);
 const quarterly=[...facts(raw,"us-gaap",METRIC_TAGS.revenue,"USD",asOfDate,false),
  ...facts(raw,"us-gaap",METRIC_TAGS.netIncome,"USD",asOfDate,false)]
  .filter(({row})=>row.form==="10-Q"||row.form==="10-Q/A")
  .sort((a,b)=>b.row.end!.localeCompare(a.row.end!)||b.row.filed!.localeCompare(a.row.filed!));
 const latest10Q=quarterly[0]?.row;
 return {
  ttm,sharesOutstanding:shares,bookEquity:book,
  coverage:{latestFiled10Q:latest10Q?.filed??null,latest10QPeriodEnd:latest10Q?.end??null,
   latestSECShareDate:shares?.asOf??null,latestSECBookDate:book?.asOf??null},
  assets:latestInstant(raw,"us-gaap",["Assets"],"USD",asOfDate),
  liabilities:latestInstant(raw,"us-gaap",["Liabilities"],"USD",asOfDate),
  notes:[
   "TTM line items = latest audited fiscal year + current 10-Q year-to-date - prior 10-Q comparable year-to-date.",
   "TTM diluted EPS is an approximation: summing rounded diluted EPS periods may differ from a fully recomputed diluted EPS.",
   "Shares outstanding are a dated SEC snapshot, not a live count. Share-class reporting may differ.",
   "Missing or unalignable US-GAAP facts remain unavailable. 10-Q/10-K filing dates gate all inputs.",
  ],
 };
}
