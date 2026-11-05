"use client";

import { useState } from "react";
import {interpretConnectionCheck} from "../../../lib/alpaca/connection-check";

type CheckResult = "idle" | "checking" | "connected" | "not_configured" | "error";
export default function AlpacaConnection() {
  const [state,setState]=useState<CheckResult>("idle");
  const [message,setMessage]=useState("");
  const check=()=>{
    setState("checking");
    setMessage("");
    void (async()=>{
      try{
        const response=await fetch("/api/alpaca/portfolio",{cache:"no-store"});
        const responseText=await response.text();
        const result=interpretConnectionCheck(response.status,responseText);
        setState(result.state);
        setMessage(result.message);
      }catch(error){
        setState("error");
        setMessage(error instanceof TypeError
          ?"Network request failed. Verify that the local Next.js dev server is running, then try again."
          :"Could not read the local Alpaca API response. Check the npm run dev terminal and browser Network tab.");
      }
    })();
  };
  return <section className="surface-panel rounded-2xl border border-white/10 bg-[#172338] p-5 sm:p-6 2xl:col-span-2">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="mb-2 text-[11px] font-semibold tracking-[.15em] text-[#8fe7d1]">CONNECTIONS</p><h2 className="text-lg font-semibold">Alpaca Paper Trading</h2><p className="mt-2 text-xs leading-6 text-slate-400">One place to find and change your API configuration. Your keys stay on your Mac, not in GitHub or browser storage.</p></div>
      <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">Read-only · Paper</span>
    </div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold">1. Edit this local file</h3>
        <code className="mt-2 block break-all rounded-lg bg-[#102035] px-3 py-3 text-xs text-slate-200">~/Documents/see_portfolio/.env.local</code>
        <p className="mt-3 text-xs leading-6 text-slate-400">Create or edit it in VS Code, paste your own paper Key and Secret on the corresponding lines, save, then stop and restart <code>npm run dev</code>. Never commit this file.</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold">2. Environment variable names</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-[#102035] p-3 text-xs leading-6 text-slate-200">ALPACA_PAPER_KEY_ID=PASTE_YOUR_KEY
ALPACA_PAPER_SECRET_KEY=PASTE_YOUR_SECRET</pre>
        <p className="mt-3 text-xs leading-6 text-slate-400">If you rotate credentials later, change only these two values in the same file. You do not need to edit TypeScript code.</p>
      </div>
    </div>
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
      <button type="button" onClick={check} disabled={state==="checking"} className="rounded-xl bg-[#83e3cd] px-4 py-2.5 text-xs font-semibold text-[#102139]">{state==="checking"?"Testing…":"Test Alpaca connection"}</button>
      <span role="status" aria-live="polite" className={"text-xs "+(state==="connected"?"text-emerald-300":state==="error"?"text-rose-300":"text-slate-400")}>{message || "Not tested yet. Test after restarting the dev server."}</span>
    </div>
    <p className="mt-4 text-xs leading-5 text-slate-500">For your security, portfolio access is enabled only on your local development server. Public deployment requires account authentication first.</p>
  </section>;
}
