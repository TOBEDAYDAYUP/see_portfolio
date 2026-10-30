import type { Company, Story } from "../../types/app";

/** Fictional demo content; never use these numbers as live market data. */
export const companies: Company[] = [
  {ticker:"NVDA",name:"NVIDIA"},{ticker:"AAPL",name:"Apple"},{ticker:"MSFT",name:"Microsoft"},
  {ticker:"GOOGL",name:"Alphabet"},{ticker:"TSLA",name:"Tesla"},{ticker:"AMD",name:"AMD"},
  {ticker:"AMZN",name:"Amazon"},{ticker:"SHOP",name:"Shopify"},{ticker:"META",name:"Meta"},
  {ticker:"TSM",name:"TSMC"},
];
export const stories: Story[] = [
  {ticker:"NVDA",category:"Earnings",title:"Hypothetical earnings-guidance revision",detail:"An illustrative change in guidance could influence future valuation assumptions. Source filings would be needed to assess the impact.",score:92,tone:"Mixed"},
  {ticker:"TSLA",category:"Margins",title:"Hypothetical pricing-pressure scenario",detail:"Sample scenario: pricing changes may affect profit margins depending on volumes and production costs.",score:85,tone:"Negative"},
  {ticker:"AAPL",category:"Operations",title:"Hypothetical supply-chain development",detail:"An illustrative supplier-capacity event. Its financial impact remains unknown.",score:78,tone:"Mixed"},
  {ticker:"MSFT",category:"Growth",title:"Hypothetical cloud-demand update",detail:"Sample scenario: stronger customer demand may support growth, subject to expenses and valuation.",score:74,tone:"Positive"},
  {ticker:"GOOGL",category:"Regulation",title:"Hypothetical regulatory development",detail:"A fictional event demonstrating why context matters more than the headline alone.",score:68,tone:"Mixed"},
  {ticker:"AMZN",category:"Retail",title:"Hypothetical retail-demand change",detail:"A fictional demand shift for testing company-related summaries.",score:66,tone:"Positive"},
  {ticker:"AMD",category:"Industry",title:"Hypothetical chip-industry event",detail:"A fictional industry development used to test news relevance.",score:62,tone:"Mixed"},
  {ticker:"SHOP",category:"Growth",title:"Hypothetical merchant-growth update",detail:"A sample business-momentum event for interface testing.",score:72,tone:"Positive"},
  {ticker:"META",category:"Advertising",title:"Hypothetical advertising-market trend",detail:"An illustrative example of a changing advertising market.",score:64,tone:"Mixed"},
  {ticker:"TSM",category:"Operations",title:"Hypothetical foundry-capacity change",detail:"A fictional supply-chain update involving the semiconductor industry.",score:81,tone:"Mixed"},
];
