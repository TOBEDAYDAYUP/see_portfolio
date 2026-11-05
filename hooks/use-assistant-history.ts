"use client";
import {useEffect,useState} from "react";
import {
 ASSISTANT_HISTORY_KEY,appendAssistantMessage,freshAssistantThread,parseAssistantHistory,
 type AssistantHistory,type SavedAssistantMessage,
} from "../lib/assistant/chat-history";
const initial:AssistantHistory={activeId:"welcome",threads:[{
 id:"welcome",title:"New chat",updatedAt:0,messages:[],
}]};
const makeId=()=>typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"?
 crypto.randomUUID():"chat-"+Date.now()+"-"+Math.random().toString(36).slice(2);
export function useAssistantHistory(){
 const [state,setState]=useState<AssistantHistory>(initial);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{
  try{
   const raw=localStorage.getItem(ASSISTANT_HISTORY_KEY);
   if(raw){
    const parsed=parseAssistantHistory(JSON.parse(raw) as unknown);
    if(parsed)setState(parsed);
   }
  }catch{/* Browser storage is optional; in-memory history still works. */}
  setLoaded(true);
 },[]);
 useEffect(()=>{
  if(!loaded)return;
  try{localStorage.setItem(ASSISTANT_HISTORY_KEY,JSON.stringify(state));}
  catch{/* Quota or privacy mode: preserve this session's in-memory chat. */}
 },[loaded,state]);
 const append=(id:string,message:SavedAssistantMessage)=>
  setState(previous=>appendAssistantMessage(previous,id,message));
 const select=(id:string)=>setState(previous=>previous.threads.some(t=>t.id===id)?
  {...previous,activeId:id}:previous);
 const start=()=>{
  const id=makeId();
  setState(previous=>({activeId:id,
   threads:[freshAssistantThread(id),...previous.threads].slice(0,24)}));
 };
 const remove=(id:string)=>setState(previous=>{
  const threads=previous.threads.filter(t=>t.id!==id);
  if(!threads.length){const next=freshAssistantThread(makeId());return {activeId:next.id,threads:[next]};}
  return {threads,activeId:previous.activeId===id?threads[0].id:previous.activeId};
 });
 return {...state,loaded,append,select,start,remove,
  messages:state.threads.find(t=>t.id===state.activeId)?.messages??[]};
}
