import type { ResearchArticle } from "../../../lib/research/types";
import { formatResearchNewsTimestamp } from "../../../lib/research/news-time";

function Group({articles}:{articles:ResearchArticle[]}){
 return <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
  {articles.map(article=><article key={article.id} className="px-5 py-4">
   <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
    <strong className="font-semibold text-[#9cebd6]">{article.symbol}</strong>
    <span>{article.source}</span><span>·</span>
    <time dateTime={article.publishedAt||undefined} title="Alpaca news provider timestamp (not independently verified publisher time)">
     {formatResearchNewsTimestamp(article.publishedAt)}
    </time>
   </div>
   <h3 className="text-sm font-semibold leading-6 text-slate-100">{article.headline}</h3>
   {article.summary&&<p className="mt-1 text-xs leading-5 text-slate-400">{article.summary}</p>}
   {article.url&&<a href={article.url} target="_blank" rel="noopener noreferrer"
    className="mt-2 inline-flex text-xs font-semibold text-[#85dbc9] hover:underline">
    Read original source ↗
   </a>}
  </article>)}
 </div>;
}
export default function ResearchNewsFeed({articles,emptyMessage="No recent articles found for this selection."}:{
 articles:ResearchArticle[];emptyMessage?:string;
}){
 if(!articles.length)return <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">{emptyMessage}</p>;
 const company=articles.filter(a=>a.category!=="sector");
 const sector=articles.filter(a=>a.category==="sector");
 return <div className="space-y-5">
  {company.length>0&&<section aria-label="Company news">
   <h3 className="mb-3 text-sm font-semibold">Company News</h3>
   <Group articles={company}/>
  </section>}
  {sector.length>0&&<details className="rounded-xl border border-white/10 p-4">
   <summary className="cursor-pointer text-sm font-medium">Market &amp; Sector News · {sector.length}</summary>
   <p className="mb-3 mt-2 text-xs text-slate-400">Tagged by the news provider, but not primarily focused on this company.</p>
   <Group articles={sector}/>
  </details>}
 </div>;
}
