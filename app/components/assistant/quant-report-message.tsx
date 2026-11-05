"use client";

/** Render the server-produced SEE Quant briefing as actual report sections.
 * No HTML/Markdown interpretation: even untrusted source text is plain text. */
export default function QuantReportMessage({content}:{content:string}){
 const parts=content.split(/\n\s*\n/).filter(Boolean);
 return <article className="space-y-5" aria-label="SEE Quant evidence-based stock report">
  {parts.map((part,index)=>{
   const lines=part.split("\n").filter(Boolean);
   const header=lines[0]??"";
   const isSection=/^\d+\.\s+/.test(header);
   if(index===0)return <header key={index} className="border-b border-white/10 pb-3">
    <h3 className="text-base font-bold leading-6">{header}</h3>
    {lines.slice(1).map((line,i)=><p key={i} className="mt-1 text-xs text-slate-500">{line}</p>)}
   </header>;
   if(isSection)return <section key={index} className="space-y-2">
    <h4 className="text-sm font-semibold">{header}</h4>
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6">
     {lines.slice(1).map((line,i)=><li key={i}>{line.startsWith("• ")?line.slice(2):line}</li>)}
    </ul>
   </section>;
   return <p key={index} className="text-xs leading-6 text-slate-500">{part}</p>;
  })}
 </article>;
}
