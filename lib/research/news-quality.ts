import type { ResearchArticle } from "./types";

const named:Record<string,string>={
 amp:"&",quot:'"',apos:"'",lt:"<",gt:">",nbsp:" ",
};
export function decodeNewsText(value:string):string{
 return value.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|amp|quot|apos|lt|gt|nbsp);/gi,(text,raw:string)=>{
  const tag=raw.toLowerCase();
  if(tag in named)return named[tag];
  const base=tag.startsWith("#x")?16:10;
  const code=Number.parseInt(tag.slice(base===16?2:1),base);
  return Number.isInteger(code)&&code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?
   String.fromCodePoint(code):text;
 });
}
const words=(value:string)=>decodeNewsText(value).toLowerCase()
 .replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean);
const firmSuffix=new Set(["inc","incorporated","corp","corporation","common","stock","class","the","ltd","limited","plc","holdings","group","company"]);
function issuerTerms(name:string):string[]{
 const cleaned=words(name).filter(w=>!firmSuffix.has(w));
 return cleaned.length?cleaned.slice(0,3):[];
}
function titleMatches(headline:string,symbol:string,companyName:string):boolean{
 const h=words(headline);
 if(h.includes(symbol.toLowerCase()))return true;
 const issuer=issuerTerms(companyName);
 if(!issuer.length)return false;
 // Multiword names must match as a phrase; avoid matching unrelated titles
 // such as any article mentioning a generic first company token.
 const search=h.join(" ");
 const phrase=issuer.join(" ");
 return (" "+search+" ").includes(" "+phrase+" ");
}
const stopwords=new Set(["the","a","an","for","of","to","on","at","in","from","by","and","or","with","as","says","report"]);
function tokens(headline:string){
 return [...new Set(words(headline).filter(w=>w.length>=3&&!stopwords.has(w)))];
}
function nearDuplicate(a:string,b:string){
 const x=tokens(a),y=tokens(b),set=new Set(x);
 const shared=y.filter(w=>set.has(w)).length;
 const union=new Set([...x,...y]).size;
 const generic=new Set(["startup","shares","stock","market","today","company","report","earnings","revenue","forecast"]);
 const sharedTopic=x.slice(2).some(w=>!generic.has(w)&&y.slice(2).includes(w));
 return (shared>=3&&union>0&&shared/union>=0.4&&sharedTopic)||
  (x.slice(0,5).join(" ")===y.slice(0,5).join(" ")&&x.length>=5);
}
/** Keep on-topic company items first and sector items distinctly labeled. */
export function curateResearchNews(rows:ResearchArticle[],names:Record<string,string>,
 limit=12):ResearchArticle[]{
 const accepted:ResearchArticle[]=[];
 for(const article of rows){
  const headline=decodeNewsText(article.headline).trim();
  if(!headline)continue;
  const cleaned:ResearchArticle={...article,headline,
   summary:decodeNewsText(article.summary).trim(),
   category:titleMatches(headline,article.symbol,names[article.symbol]??"")?"company":"sector"};
  if(accepted.some(prev=>prev.url!==null&&cleaned.url===prev.url||
    nearDuplicate(prev.headline,cleaned.headline)))continue;
  accepted.push(cleaned);
 }
 const company=accepted.filter(a=>a.category==="company");
 const sector=accepted.filter(a=>a.category==="sector");
 // Avoid displacing direct company articles with broad macro news.
 return [...company,...sector.slice(0,Math.min(3,Math.ceil(limit/4)))].slice(0,limit);
}
