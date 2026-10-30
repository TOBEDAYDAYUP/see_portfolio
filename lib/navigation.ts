import type { PortfolioSection } from "../types/app";

export const portfolioLinks: {id:PortfolioSection;label:string;zh:string;symbol:string}[] = [
  {id:"holdings",label:"Holdings",zh:"持仓",symbol:"▥"},
  {id:"analysis",label:"Analysis",zh:"分析",symbol:"◈"},
  {id:"valuations",label:"Valuations",zh:"估值",symbol:"◇"},
  {id:"dividends",label:"Dividends",zh:"分红",symbol:"↗"},
  {id:"returns",label:"Returns",zh:"收益",symbol:"⌁"},
  {id:"updates",label:"Updates",zh:"动态",symbol:"◉"},
];

