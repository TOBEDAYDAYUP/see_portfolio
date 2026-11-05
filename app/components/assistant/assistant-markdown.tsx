"use client";

import type {ReactNode} from "react";
import {parseAssistantInline,parseAssistantMarkdown} from "../../../lib/assistant/markdown";

/** No dangerouslySetInnerHTML and no model-provided links/actions.
 * React escapes all untrusted answer text by default. */
function inline(content:string):ReactNode[]{
 return parseAssistantInline(content).map((part,i)=>{
  if(part.kind==="strong")return <strong key={i} className="font-semibold">{part.text}</strong>;
  if(part.kind==="em")return <em key={i}>{part.text}</em>;
  if(part.kind==="code")return <code key={i} className="rounded bg-slate-500/10 px-1 py-0.5 font-mono text-[.9em]">{part.text}</code>;
  return <span key={i}>{part.text}</span>;
 });
}

const headingClasses:Record<number,string>={
 1:"text-lg font-bold",2:"text-base font-bold",
 3:"text-[15px] font-semibold",4:"text-sm font-semibold",
 5:"text-sm font-semibold",6:"text-sm font-semibold",
};
export default function AssistantMarkdown({content}:{content:string}){
 const blocks=parseAssistantMarkdown(content);
 return <div className="space-y-3 whitespace-normal break-words text-sm leading-7">
  {blocks.map((block,i)=>{
   if(block.kind==="heading"){
    const style="mt-1 leading-6 "+headingClasses[block.level];
    if(block.level===1)return <h2 key={i} className={style}>{inline(block.text)}</h2>;
    if(block.level===2)return <h3 key={i} className={style}>{inline(block.text)}</h3>;
    return <h4 key={i} className={style}>{inline(block.text)}</h4>;
   }
   if(block.kind==="list")return <ul key={i} className="space-y-2">
    {block.items.map((item,n)=><li key={n} className="flex items-start gap-2"
     style={{paddingInlineStart:item.depth*16}}>
     <span aria-hidden="true" className="w-4 shrink-0 text-right opacity-65">
      {item.ordered?item.ordinal+".":"•"}
     </span>
     <span className="min-w-0 flex-1 whitespace-pre-line">{inline(item.text)}</span>
    </li>)}
   </ul>;
   if(block.kind==="code")return <pre key={i}
    className="overflow-x-auto rounded-lg border border-current/10 bg-slate-500/10 px-3 py-2 text-xs leading-5">
    <code>{block.text}</code>
   </pre>;
   if(block.kind==="quote")return <blockquote key={i}
    className="whitespace-pre-line border-l-2 border-emerald-500/50 pl-3 italic opacity-85">
    {inline(block.text)}
   </blockquote>;
   if(block.kind==="rule")return <hr key={i} className="border-current/15"/>;
   return <p key={i} className="whitespace-pre-line">{inline(block.text)}</p>;
  })}
 </div>;
}
