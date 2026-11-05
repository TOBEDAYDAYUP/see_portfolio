import type { ResearchAsset } from "../research/types";

export type AssistantEvidence = {
  id: string;
  title: string;
  source: string;
  asOf: string;
  summary: string;
  url?: string;
};
export type AssistantDataNeeds = {
  symbols: string[];
  portfolio: boolean;
  portfolioRisk: boolean;
  portfolioValuation: boolean;
  portfolioDividends: boolean;
  companyNews: boolean;
};
const aliases: ReadonlyArray<[RegExp,string]> = [
  [/\bapple\b|苹果/i,"AAPL"],
  [/\bnvidia\b|英伟达/i,"NVDA"],
  [/\bmicrosoft\b|微软/i,"MSFT"],
  [/\balphabet\b|\bgoogle\b|谷歌/i,"GOOGL"],
  [/\btesla\b|特斯拉/i,"TSLA"],
  [/\bamazon\b|亚马逊/i,"AMZN"],
  [/\bmeta\s+(?:platforms)?\b|\bfacebook\b|脸书/i,"META"],
  [/\bnike\b|耐克/i,"NKE"],
  [/\bjohnson\s*(?:&|and)\s*johnson\b|强生/i,"JNJ"],
  [/\bberkshire\b|伯克希尔/i,"BRK.B"],
];
const stopwords = new Set([
  "AI","API","USD","SEC","TTM","DCF","EPS","FCF","ROE","P/E","ETF","IEX","SIP",
  "NYSE","NASDAQ","PE","PB","PS","PM","ES","VAR","RISK","THE","WITH","FOR","MY","AND",
  "YOU","CAN","HOW","WHAT","WHY","IS","IT","DO","WE","SHORT","LONG","BUY","SELL",
]);
const unique = (items:string[])=>[...new Set(items)].slice(0,2);
const escapeRegexp=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const mentions=(query:string,needle:string):boolean=>{
  if(!needle)return false;
  const re=new RegExp("(^|[^a-z0-9])"+escapeRegexp(needle)+"($|[^a-z0-9])","i");
  return re.test(query);
};
const normalizeCompany=(name:string)=>name.toLowerCase()
  .replace(/\b(common stock|ordinary shares|class [a-z]|incorporated|corporation|inc|corp|limited|ltd|plc|holdings)\b/g," ")
  .replace(/[^a-z0-9]+/g," ").trim();

/**
 * Deterministic ticker routing, never model-generated tool names or symbols.
 * Supports verified catalog symbols, well-known exact company aliases and
 * explicit cashtags. Unidentified abbreviations do not trigger private tools.
 */
export function findAssistantSymbols(query:string,assets:readonly ResearchAsset[]=[]):string[]{
  const symbols:string[]=[];
  const catalog=new Set(assets.map(a=>a.symbol));
  for(const m of query.matchAll(/\$([A-Za-z]{1,5}(?:[.\-][A-Za-z])?)/g)){
    const sym=m[1].toUpperCase();if(!assets.length||catalog.has(sym))symbols.push(sym);
  }
  for(const m of query.matchAll(/\b[A-Z]{2,5}(?:[.\-][A-Z])?\b/g)){
    const sym=m[0];
    if(!stopwords.has(sym)&&(!assets.length||catalog.has(sym)))symbols.push(sym);
  }
  for(const [pattern,symbol] of aliases)if(pattern.test(query)&&
    (!assets.length||catalog.has(symbol)))symbols.push(symbol);
  if(assets.length){
    // Company-name matching uses verified assets only. Requiring >=2
    // meaningful tokens prevents generic names from triggering extra calls.
    const lower=query.toLowerCase();
    for(const asset of assets){
      if(symbols.length>=2)break;
      const company=normalizeCompany(asset.name);
      const terms=company.split(" ").filter(x=>x.length>=3);
      if(terms.length>=2&&mentions(lower,terms.slice(0,2).join(" ")))
        symbols.push(asset.symbol);
    }
  }
  return unique(symbols);
}
export function classifyAssistantDataNeeds(latest:string,recentUserText="",assets:readonly ResearchAsset[]=[]):AssistantDataNeeds{
  const portfolio=/\b(my|our)\s+(portfolio|holdings|position|positions|account|stocks)\b|\bportfolio\s+(health|risk|valuation|return|dividends)\b|我的?(?:投资组合|持仓|账户)|组合(?:风险|估值|收益|分红)|持仓情况/i.test(latest);
  const portfolioRisk=portfolio&&/risk|var|expected shortfall|volatility|drawdown|diversif|风险|波动|回撤|分散|持仓分析/i.test(latest);
  const portfolioValuation=portfolio&&/valuation|p\/e|pe\b|fcf|fair value|multiple|估值|市盈|现金流|便宜|昂贵/i.test(latest);
  const portfolioDividends=portfolio&&/dividend|income|payout|分红|股息|派息/i.test(latest);
  const companyNews=/\bnews\b|headline|announcement|latest story|新闻|消息|公告/i.test(latest);
  // Most recent user request has priority. Previous user request is only
  // useful for follow-up pronouns such as 'it'/'that company'.
  const current=findAssistantSymbols(latest,assets);
  const prior=current.length?[]:findAssistantSymbols(recentUserText,assets);
  return {symbols:unique(current.length?current:prior),
    portfolio,portfolioRisk,portfolioValuation,portfolioDividends,companyNews};
}
export function formatAssistantEvidence(evidence:readonly AssistantEvidence[]):string{
  return evidence.slice(0,8).map(item=>
    "["+item.id+"] "+item.title+" | SOURCE: "+item.source+
    " | AS OF: "+item.asOf+"\n"+item.summary.slice(0,1400)+
    (item.url?"\nSOURCE URL: "+item.url:"")
  ).join("\n\n").slice(0,7800);
}
