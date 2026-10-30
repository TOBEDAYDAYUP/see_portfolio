import type { PortfolioSection } from "../../types/app";

/** All values here are illustrative placeholders, not brokerage holdings. */
export type Holding={ticker:string,name:string,price:number,fair:number,day:number,gain:number,value:number,cost:number};
export const holdings:Holding[]=[
{ticker:"NVDA",name:"NVIDIA",price:184.25,fair:201.4,day:2.34,gain:155.6,value:53780,cost:21040},
{ticker:"MSFT",name:"Microsoft",price:519.36,fair:568.5,day:1.18,gain:82.9,value:48120,cost:26310},
{ticker:"AAPL",name:"Apple",price:251.8,fair:262.3,day:-0.71,gain:48.5,value:38640,cost:26020},
{ticker:"META",name:"Meta Platforms",price:641.19,fair:715.8,day:2.0,gain:270.7,value:53084,cost:14336},
{ticker:"GOOGL",name:"Alphabet",price:205.62,fair:224.1,day:0.86,gain:93.4,value:46780,cost:24188},
{ticker:"AMZN",name:"Amazon",price:232.15,fair:243.9,day:0.39,gain:62.8,value:43210,cost:26542},
{ticker:"TSLA",name:"Tesla",price:326.14,fair:310,day:-1.42,gain:-12.3,value:32475,cost:37030},
];
export const labels:Record<PortfolioSection,string>={
holdings:"",
analysis:"Risk, concentration and diversification",
valuations:"Fair-value scenarios and assumptions",
dividends:"Distribution history and future income",
returns:"Performance, contribution and benchmarks",
updates:"Research events that affect your holdings",
};
export const money=(v:number,currency:"USD"|"CNY")=>(currency==="CNY"?"¥":"US$")+Math.round(Math.abs(v)*(currency==="CNY"?7.20:1)).toLocaleString("en-US");
export const pct=(v:number)=>(v>0?"+":"")+v.toFixed(1)+"%";
export const ranges=["1M","3M","YTD","1Y","2Y","All"];
