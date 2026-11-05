"use client";

import {useState} from "react";

export default function PrivatePreviewLogin(){
 const [password,setPassword]=useState("");
 const [pending,setPending]=useState(false);
 const [message,setMessage]=useState("");
 async function signIn(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!password||pending)return;
  setPending(true);setMessage("");
  try{
   const response=await fetch("/api/private-preview/session",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({password}),cache:"no-store",
   });
   if(response.ok){setPassword("");window.location.assign("/");return;}
   const data=await response.json() as {message?:string};
   setMessage(data.message||"Unable to sign in.");
  }catch{setMessage("Connection failed. Please retry.");}
  finally{setPending(false);}
 }
 return <main className="flex min-h-screen items-center justify-center bg-[#0b1424] px-5 py-14 text-slate-100">
  <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16273a] p-7 shadow-2xl sm:p-9">
   <div className="mb-8 flex items-center gap-3">
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#83e3cd] text-xl font-bold text-[#10263b]">S.</span>
    <div><p className="font-semibold">SEE Portfolio</p>
      <p className="text-[10px] tracking-[.18em] text-slate-400">INVESTMENT INTELLIGENCE</p></div>
   </div>
   <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#83e3cd]">Private Beta</p>
   <h1 className="mt-3 text-2xl font-semibold">Owner access</h1>
   <p className="mt-3 text-sm leading-6 text-slate-400">
    This deployment is for private testing. Public accounts and email verification are not enabled yet.
   </p>
   <form onSubmit={signIn} className="mt-7 space-y-4">
    <label className="block text-sm font-medium" htmlFor="see-owner-password">Access password</label>
    <input id="see-owner-password" type="password" required autoComplete="current-password"
      className="w-full rounded-xl border border-white/20 bg-[#0d1b2a] px-4 py-3 text-base text-white outline-none focus:border-[#83e3cd]"
      value={password} onChange={e=>setPassword(e.target.value)} placeholder="Owner access password"/>
    {message&&<p role="alert" className="text-sm leading-6 text-rose-300">{message}</p>}
    <button type="submit" disabled={pending||password.length===0}
      className="w-full rounded-xl bg-[#83e3cd] px-4 py-3 font-semibold text-[#0b263b] transition-opacity disabled:opacity-50">
      {pending?"Checking access…":"Unlock private preview"}
    </button>
   </form>
   <p className="mt-6 text-xs leading-5 text-slate-500">
    No public signup or trading. Session expires after 12 hours. Keep your password private.
   </p>
  </div>
 </main>;
}
