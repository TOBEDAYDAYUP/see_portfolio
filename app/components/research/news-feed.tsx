import type { ResearchArticle } from "../../../lib/research/types";

export default function ResearchNewsFeed({articles,emptyMessage="No recent articles found for this selection."}:{
  articles:ResearchArticle[];emptyMessage?:string;
}){
  if(!articles.length)return <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">{emptyMessage}</p>;
  return <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
    {articles.map(article=><article key={article.id} className="px-5 py-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <strong className="font-semibold text-[#9cebd6]">{article.symbol}</strong>
        <span>{article.source}</span><span>·</span>
        <time dateTime={article.publishedAt}>{article.publishedAt?new Date(article.publishedAt).toLocaleDateString("en-CA"):"Date unavailable"}</time>
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
