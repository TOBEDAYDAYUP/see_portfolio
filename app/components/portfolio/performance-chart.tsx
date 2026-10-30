import type { Currency } from "../../../types/app";

export default function DemoChart({range,combined,currency}:{range:string,combined:boolean,currency:Currency}){
 const factor=({ "1M":.28,"3M":.43,"YTD":.55,"1Y":.68,"2Y":.85,"All":1 } as Record<string,number>)[range]||1;
 const count=52;
 const values=Array.from({length:count},(_,i)=>{
   const t=i/(count-1);
   const v=14+factor*(Math.pow(t,2.3)*164-24*Math.exp(-Math.pow((t-.67)/.08,2))+(Math.sin(i*1.7)*5+Math.sin(i*.63)*4)*(.2+t));
   return {x:52+t*700,y:237-Math.max(5,v)};
 });
 const top=(scale:number)=>values.map((p,i)=>(i?"L ":"M ")+p.x.toFixed(1)+" "+(237-(237-p.y)*scale).toFixed(1)).join(" ");
 const shape=(upper:number,lower:number)=>top(upper)+" "+values.slice().reverse().map(p=>"L "+p.x.toFixed(1)+" "+(237-(237-p.y)*lower).toFixed(1)).join(" ")+" Z";
 return <div className="mt-3 overflow-x-auto"><svg viewBox="0 0 800 285" className="min-w-[450px] w-full" role="img" aria-label="Fictional portfolio performance chart">
  <defs><linearGradient id="seeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#66dada" stopOpacity=".4"/><stop offset="100%" stopColor="#66dada" stopOpacity=".02"/></linearGradient></defs>
  {[55,101,146,192,237].map((y,i)=><g key={i}><line x1="52" x2="752" y1={y} y2={y} stroke="#53637a" strokeOpacity=".28" strokeDasharray="4 5"/><text x="44" y={y+4} textAnchor="end" fill="#8793a7" fontSize="11">{(currency==="CNY"?["¥2.88m","¥2.16m","¥1.44m","¥720k","¥0"]:["$400k","$300k","$200k","$100k","$0"])[i]}</text></g>)}
  {combined?<><path d={shape(1,0)} fill="url(#seeFill)"/><path d={top(1)} stroke="#72dcda" fill="none" strokeWidth="3"/></>:<><path d={shape(.44,0)} fill="#a98b5c"/><path d={shape(.67,.44)} fill="#b387c7"/><path d={shape(.84,.67)} fill="#5fcfb6"/><path d={shape(1,.84)} fill="#55a6db"/></>}
  {["2016","2018","2020","2022","2024","2026"].map((y,i)=><text key={y} x={82+i*132} y="275" textAnchor="middle" fill="#8d9aac" fontSize="12">{range==="All"?y:i===0?"Earlier":i===5?"Now":""}</text>)}
 </svg></div>;
}
