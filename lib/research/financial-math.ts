import type { AnnualMetric,AnnualFinancialRow } from "./fundamentals-types";

type Fact=Record<string,unknown>;
export type SECUnitEntry={
 start?:string;end?:string;val?:number;fy?:number;fp?:string;
 form?:string;filed?:string;accn?:string;
};
export const METRIC_TAGS:Record<AnnualMetric,readonly string[]>={
  revenue:["RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues","SalesRevenueNet","RevenueFromContractWithCustomerIncludingAssessedTax"],
  netIncome:["NetIncomeLoss"],
  operatingIncome:["OperatingIncomeLoss"],
  operatingCashFlow:["NetCashProvidedByUsedInOperatingActivities"],
  capitalExpenditure:["PaymentsToAcquirePropertyPlantAndEquipment"],
  totalAssets:["Assets"],
  totalLiabilities:["Liabilities"],
  cash:["CashAndCashEquivalentsAtCarryingValue","CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
  dilutedEps:["EarningsPerShareDiluted"],
  dilutedWeightedShares:["WeightedAverageNumberOfDilutedSharesOutstanding"],
  stockholdersEquity:["StockholdersEquity"],
};
const isRecord=(v:unknown):v is Fact=>typeof v==="object" && v!==null && !Array.isArray(v);
const iso=(s:unknown):s is string=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"));
const elapsed=(a:string,b:string)=>(Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000;
const validForm=(v:unknown)=>v==="10-K"||v==="10-K/A";
const unitFor=(metric:AnnualMetric)=>metric==="dilutedEps"?"USD/shares":
 metric==="dilutedWeightedShares"?"shares":"USD";
function factRows(doc:unknown,tags:readonly string[],flow:boolean,unit:string,asOfDate:string):{tag:string;fact:SECUnitEntry}[]{
 if(!isRecord(doc)||!isRecord(doc.facts)||!isRecord(doc.facts["us-gaap"]))return [];
 const gaap=doc.facts["us-gaap"] as Fact;
 const output:{tag:string;fact:SECUnitEntry}[]=[];
 for(const tag of tags){
  const concept=gaap[tag];
  if(!isRecord(concept)||!isRecord(concept.units)||!Array.isArray(concept.units[unit]))continue;
  for(const raw of concept.units[unit] as unknown[]){
   if(!isRecord(raw)||!iso(raw.end)||!iso(raw.filed)||!validForm(raw.form)||
      typeof raw.val!=="number"||!Number.isFinite(raw.val)||raw.filed>asOfDate)continue;
   if(flow){
    if(!iso(raw.start)||raw.fp!=="FY")continue;
    const duration=elapsed(raw.start,raw.end);
    if(duration<330||duration>380)continue;
   }else if(raw.start!==undefined)continue;
   output.push({tag,fact:raw as SECUnitEntry});
  }
 }
 return output;
}
function pickAnnual(doc:unknown,tags:readonly string[],flow:boolean,unit:string,asOfDate:string):Map<string,{
 value:number;filed:string;accn:string|null
}>{
 const items=factRows(doc,tags,flow,unit,asOfDate);
 const map=new Map<string,{value:number;filed:string;accn:string|null;priority:number}>();
 for(const {tag,fact} of items){
  const end=fact.end!;
  const candidate={value:fact.val!,filed:fact.filed!,accn:typeof fact.accn==="string"?fact.accn:null,
    priority:tags.indexOf(tag)};
  const current=map.get(end);
  // Prefer a consistent US-GAAP tag; within a tag, newest filing wins (restatements).
  if(!current||candidate.priority<current.priority||
     (candidate.priority===current.priority&&candidate.filed>current.filed))map.set(end,candidate);
 }
 return map;
}
export const ratioPercent=(num:number|null,den:number|null):number|null=>
 typeof num==="number"&&Number.isFinite(num)&&typeof den==="number"&&Number.isFinite(den)&&den>0
 ? num/den*100:null;
/** Restrict comparisons to consecutive annual ends approximately 1 fiscal year apart. */
export function revenueGrowthPct(rows:AnnualFinancialRow[]):number|null{
 if(rows.length<2)return null;
 const [a,b]=rows;
 const days=elapsed(b.fiscalYearEnd,a.fiscalYearEnd);
 if(days<330||days>400)return null;
 const base=b.metrics.revenue,next=a.metrics.revenue;
 if(base===null||next===null)return null;
 return ratioPercent(next-base,base);
}
export function freeCashFlow(ocf:number|null,capex:number|null):number|null{
 if(ocf===null||capex===null||!Number.isFinite(ocf)||!Number.isFinite(capex)||capex<0)return null;
 return ocf-capex;
}
function filingUrl(cik:string,accn:string|null):string|null{
 if(!accn||!/^\d{10}-\d{2}-\d{6}$/.test(accn))return null;
 return "https://www.sec.gov/Archives/edgar/data/"+String(Number(cik))+"/"+accn.replaceAll("-","")+"/";
}
/** Select annual full-year periods, no 9-month YTD or mixed 10-Q interim facts. */
export function parseSECAnnualFinancials(doc:unknown,cik:string,asOfDate="9999-12-31"):AnnualFinancialRow[]{
 const lookup=Object.fromEntries(
  (Object.entries(METRIC_TAGS) as [AnnualMetric,readonly string[]][]).map(([metric,tags])=>
   [metric,pickAnnual(doc,tags,!["totalAssets","totalLiabilities","cash","stockholdersEquity"].includes(metric),unitFor(metric),asOfDate)])
 ) as Record<AnnualMetric,ReturnType<typeof pickAnnual>>;
 const ends=[...new Set([...lookup.revenue.keys(),...lookup.netIncome.keys(),
   ...lookup.operatingCashFlow.keys(),...lookup.dilutedEps.keys()])].sort().reverse();
 return ends.slice(0,4).map(end=>{
  const metrics=Object.fromEntries(
   (Object.keys(METRIC_TAGS) as AnnualMetric[]).map(key=>[key,lookup[key].get(end)?.value??null])
  ) as Record<AnnualMetric,number|null>;
  const provenance=lookup.revenue.get(end)??lookup.netIncome.get(end)??
   lookup.operatingCashFlow.get(end)??lookup.dilutedEps.get(end);
  const filed=provenance?.filed??end;
  return {
   fiscalYear:Number(end.slice(0,4)),fiscalYearEnd:end,filedAt:filed,metrics,
   filingUrl:filingUrl(cik,provenance?.accn??null),
  };
 });
}
