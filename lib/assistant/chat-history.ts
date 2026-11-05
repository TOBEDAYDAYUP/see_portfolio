import type {AssistantChatMessage} from "./chat";
import type {AssistantEvidence} from "./context";

export type SavedAssistantMessage=AssistantChatMessage&{
 evidence?:AssistantEvidence[];dataNotes?:string[];format?:"see_quant_v1";
};
export type AssistantThread={
 id:string;title:string;updatedAt:number;messages:SavedAssistantMessage[];
};
export type AssistantHistory={activeId:string;threads:AssistantThread[]};
export const ASSISTANT_HISTORY_KEY="see-assistant-threads-local-v1";
const MAX_THREADS=24;
const MAX_MESSAGES=30;
const MAX_MESSAGE_CHARS=4000;
const defaultTitle="New chat";
export function freshAssistantThread(id:string):AssistantThread{
 return {id,title:defaultTitle,updatedAt:Date.now(),messages:[]};
}
export function titleForAssistantMessage(text:string):string{
 const plain=text.replace(/\s+/g," ").trim();
 return plain.length>38?plain.slice(0,38)+"…":plain||defaultTitle;
}
export function appendAssistantMessage(history:AssistantHistory,id:string,message:SavedAssistantMessage):AssistantHistory{
 const threads=history.threads.map(thread=>{
  if(thread.id!==id)return thread;
  const userFirst=thread.messages.every(m=>m.role!=="user")&&message.role==="user";
  return {...thread,title:userFirst?titleForAssistantMessage(message.content):thread.title,
   updatedAt:Date.now(),messages:[...thread.messages,message].slice(-MAX_MESSAGES)};
 });
 return {...history,threads};
}
export function parseAssistantHistory(raw:unknown):AssistantHistory|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const value=raw as Record<string,unknown>;
 if(!Array.isArray(value.threads))return null;
 const ids=new Set<string>();
 const threads:AssistantThread[]=[];
 for(const item of value.threads.slice(0,MAX_THREADS)){
  if(!item||typeof item!=="object"||Array.isArray(item))continue;
  const thread=item as Record<string,unknown>;
  if(typeof thread.id!=="string"||thread.id.length>96||!thread.id||ids.has(thread.id))continue;
  if(!Array.isArray(thread.messages))continue;
  ids.add(thread.id);
  const messages:SavedAssistantMessage[]=[];
  for(const rawMessage of thread.messages.slice(-MAX_MESSAGES)){
   if(!rawMessage||typeof rawMessage!=="object"||Array.isArray(rawMessage))continue;
   const msg=rawMessage as Record<string,unknown>;
   if((msg.role!=="assistant"&&msg.role!=="user")||typeof msg.content!=="string"||
     msg.content.length>MAX_MESSAGE_CHARS)continue;
   const sources:Array<AssistantEvidence>=[];
   if(Array.isArray(msg.evidence)){
    for(const v of msg.evidence.slice(0,8)){
     if(!v||typeof v!=="object"||Array.isArray(v))continue;
     const e=v as Record<string,unknown>;
     if(typeof e.id==="string"&&typeof e.title==="string"&&typeof e.source==="string"&&
       typeof e.asOf==="string"&&typeof e.summary==="string"){
      const url=typeof e.url==="string"&&/^https:\/\//.test(e.url)&&e.url.length<600?e.url:undefined;
      sources.push({id:e.id.slice(0,10),title:e.title.slice(0,130),
       source:e.source.slice(0,130),asOf:e.asOf.slice(0,80),summary:e.summary.slice(0,1400),
       ...(url?{url}:{})});
     }
    }
   }
   const dataNotes=Array.isArray(msg.dataNotes)?msg.dataNotes.filter(
    (x):x is string=>typeof x==="string").slice(0,5).map(x=>x.slice(0,400)):[];
   messages.push({role:msg.role,content:msg.content,
    ...(msg.format==="see_quant_v1"?{format:"see_quant_v1" as const}:{}),
    ...(sources.length?{evidence:sources}:{}),...(dataNotes.length?{dataNotes}:{})});
  }
  threads.push({id:thread.id,title:typeof thread.title==="string"?
   thread.title.slice(0,80):defaultTitle,updatedAt:typeof thread.updatedAt==="number"&&
   Number.isFinite(thread.updatedAt)?thread.updatedAt:0,messages});
 }
 if(!threads.length)return null;
 return {activeId:typeof value.activeId==="string"&&threads.some(t=>t.id===value.activeId)
   ?value.activeId:threads[0].id,threads};
}
