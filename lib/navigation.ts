import type { PortfolioSection } from "../types/app";

export const portfolioLinks: {id:PortfolioSection;label:string;zh:string;symbol:string}[] = [
  {id:"holdings",label:"Holdings",zh:"持仓",symbol:"▥"},
  {id:"analysis",label:"Analysis",zh:"分析",symbol:"◈"},
  {id:"valuations",label:"Valuations",zh:"估值",symbol:"◇"},
  {id:"dividends",label:"Dividends",zh:"分红",symbol:"↗"},
  {id:"returns",label:"Returns",zh:"收益",symbol:"⌁"},
  {id:"updates",label:"Updates",zh:"动态",symbol:"◉"},
];


export const researchLinks: {id:import("../types/app").ResearchSection;label:string;zh:string;symbol:string}[] = [
  {id:"search",label:"Stock Search",zh:"股票搜索",symbol:"⌕"},
  {id:"watchlist",label:"My Watchlist",zh:"我的关注",symbol:"☆"},
  {id:"reports",label:"Stock Reports",zh:"个股报告",symbol:"▤"},
  {id:"news",label:"News & Updates",zh:"新闻动态",symbol:"◉"},
];
