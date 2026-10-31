export type SECInlineShares={
 value:number;asOf:string;filedAt:string;tag:"EntityCommonStockSharesOutstanding";
 source:"SEC filing inline XBRL";sourceUrl:string;
};
type Fact={value:number;instant:string;member:string|null};
const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 !Number.isNaN(Date.parse(s+"T00:00:00Z"));
const attr=(raw:string,name:string)=>{
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 return new RegExp("(?:^|\\s)"+escaped+"\\s*=\\s*[\"']([^\"']+)[\"']","i").exec(raw)?.[1]??"";
};
/** Parse only DEI cover-page Inline XBRL common shares, never income EPS shares.
 * Consolidate dimensioned class values only if they share the same instant. */
export function parseSECInlineShares(html:string,asOfDate:string,filedAt:string,
 sourceUrl:string):SECInlineShares|null{
 const contexts=new Map<string,{instant:string;member:string|null}>();
 for(const m of html.matchAll(/<(?:xbrli:)?context\b([^>]*)>([\s\S]*?)<\/(?:xbrli:)?context\s*>/gi)){
  const id=attr(m[1],"id");
  const instant=/<(?:xbrli:)?instant\s*>(\d{4}-\d{2}-\d{2})<\/(?:xbrli:)?instant>/i.exec(m[2])?.[1]??"";
  const member=/<(?:xbrldi:)?explicitMember\b[^>]*>([^<]+)<\/(?:xbrldi:)?explicitMember>/i.exec(m[2])?.[1]??null;
  if(id&&date(instant)&&instant<=asOfDate)contexts.set(id,{instant,member:member?.trim()??null});
 }
 const all:Fact[]=[];
 for(const m of html.matchAll(/<ix:nonfraction\b([^>]*)>([\s\S]*?)<\/ix:nonfraction\s*>/gi)){
  const name=attr(m[1],"name"),ctx=contexts.get(attr(m[1],"contextref"));
  if(!/^dei:EntityCommonStockSharesOutstanding$/i.test(name)||!ctx)continue;
  const scale=Number(attr(m[1],"scale")||"0");
  if(!Number.isInteger(scale)||Math.abs(scale)>9)continue;
  const body=m[2].replace(/<[^>]*>/g,"").replace(/&#160;|&nbsp;/gi," ").replace(/,/g,"").trim();
  if(!/^\d+(?:\.\d+)?$/.test(body))continue;
  const value=Number(body)*10**scale;
  if(!Number.isSafeInteger(value)||value<=0)continue;
  all.push({value,instant:ctx.instant,member:ctx.member});
 }
 if(!all.length)return null;
 const last=all.map(x=>x.instant).sort().at(-1)!;
 const latest=all.filter(x=>x.instant===last);
 const noClass=latest.filter(x=>!x.member);
 const whole=noClass.length>0&&noClass.every(x=>x.value===noClass[0].value)?noClass[0].value:null;
 const grouped=new Map<string,number>();
 for(const x of latest.filter(x=>x.member)){
  if(grouped.has(x.member)&&grouped.get(x.member)!==x.value)return null;
  grouped.set(x.member,x.value);
 }
 let value:number|null=whole;
 if(value===null&&grouped.size>=2){
  const sum=[...grouped.values()].reduce((n,x)=>n+x,0);
  if(Number.isSafeInteger(sum))value=sum;
 }
 // Single class fact alone cannot safely stand for all issuer common shares.
 if(value===null||value<=0)return null;
 return {value,asOf:last,filedAt,tag:"EntityCommonStockSharesOutstanding",
  source:"SEC filing inline XBRL",sourceUrl};
}
type Listing=Record<string,unknown>;
const obj=(x:unknown):x is Listing=>!!x&&typeof x==="object"&&!Array.isArray(x);
export function selectSECPrimaryFiling(raw:unknown,asOfDate:string,cik:string){
 if(!obj(raw)||!obj(raw.filings)||!obj(raw.filings.recent))return null;
 const r=raw.filings.recent as Listing;
 for(let i=0;i<Math.min(15,Array.isArray(r.form)?r.form.length:0);i++){
  const form=(r.form as unknown[])[i],filed=(r.filingDate as unknown[]|undefined)?.[i],
   accession=(r.accessionNumber as unknown[]|undefined)?.[i],
   primary=(r.primaryDocument as unknown[]|undefined)?.[i];
  if(!["10-Q","10-K","10-Q/A","10-K/A"].includes(String(form))||
    typeof filed!=="string"||!date(filed)||filed>asOfDate||
    typeof accession!=="string"||!/^\d{10}-\d{2}-\d{6}$/.test(accession)||
    typeof primary!=="string"||!/^[a-zA-Z0-9._-]+\.html?$/.test(primary))continue;
  return {filed,url:"https://www.sec.gov/Archives/edgar/data/"+Number(cik)+"/"+
   accession.replaceAll("-","")+"/"+primary};
 }
 return null;
}
