"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { AssistantChatMessage } from "../../../lib/assistant/chat";
import type {AssistantEvidence} from "../../../lib/assistant/context";
type ChatWithSources=AssistantChatMessage&{evidence?:AssistantEvidence[];dataNotes?:string[]};
import type { Translator } from "../../../types/app";

type ConnectionState = "checking" | "configured" | "unconfigured" | "error";

export default function AIAssistantWorkspace({ t }: { t: Translator }) {
  const connectionErrorText = t("Could not check the AI connection.", "无法检查 AI 连接。");
  const [connection, setConnection] = useState<ConnectionState>("checking");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [model, setModel] = useState("deepseek-flash");
  const [provider, setProvider] = useState<"ollama" | "deepseek">("deepseek");
  const [connectionCheck, setConnectionCheck] = useState(0);
  const [messages, setMessages] = useState<ChatWithSources[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/assistant/chat", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json() as { configured?: boolean; model?: string; provider?: string; message?: string };
        setModel(data.model || "deepseek-flash");
        setProvider(data.provider === "ollama" ? "ollama" : "deepseek");
        setConnectionMessage(data.message || "");
        setConnection(data.configured ? "configured" : "unconfigured");
      })
      .catch(error => {
        if (error instanceof Error && error.name === "AbortError") return;
        setConnection("error");
        setConnectionMessage(connectionErrorText);
      });
    return () => controller.abort();
  }, [connectionErrorText, connectionCheck]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || sending || connection !== "configured") return;
    const nextMessages: AssistantChatMessage[] = [...messages, { role: "user", content: cleanText }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setSending(true);
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-20).map(({role,content})=>({role,content})) }),
      });
      const data = await response.json() as {
        status?: string;
        message?: AssistantChatMessage | string;
        model?: string;
        evidence?: AssistantEvidence[];
        dataNotes?: string[];
      };
      if (data.status === "not_configured") {
        setConnection("unconfigured");
        setConnectionMessage(typeof data.message === "string" ? data.message : "");
        return;
      }
      if (!response.ok || !data.message || typeof data.message === "string")
        throw new Error(typeof data.message === "string" ? data.message : t("The assistant could not answer.", "AI 助手暂时无法回答。"));
      setMessages(current => [...current, {...data.message as AssistantChatMessage,
        evidence:Array.isArray(data.evidence)?data.evidence:[],
        dataNotes:Array.isArray(data.dataNotes)?data.dataNotes:[]}]);
      if (data.model) setModel(data.model);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("The assistant is temporarily unavailable.", "AI 助手暂时不可用。"));
    } finally {
      setSending(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  };

  const suggestions = [
    t("Explain the difference between P/E and free-cash-flow yield.", "解释市盈率与自由现金流收益率的区别。"),
    t("Show AAPL latest available price, valuation and historical risk with sources.", "引用数据分析 AAPL 最近收盘价、估值和历史风险。"),
    t("What does my Paper portfolio hold, and how much is its unrealized P/L?", "我的 Paper Portfolio 持有哪些股票，浮动盈亏是多少？"),
  ];
  const ready = connection === "configured";

  return <div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#87e5d1]">AI WORKSPACE</p>
        <h1 className="text-3xl font-semibold sm:text-[38px]">AI Assistant</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{t("Ask about stocks and SEE-calculated valuations or risk. Read-only facts are retrieved when relevant; local Ollama can access your Paper holdings only when you ask. No trades are placed.", "可以询问股票行情以及 SEE 计算的估值和风险指标。系统按问题读取只读数据；本地 Ollama 只在你主动询问时读取 Paper 持仓，不会下单。")}</p>
      </div>
      <span className={"rounded-full border px-3 py-2 text-xs font-semibold "+(ready?"border-emerald-300/20 bg-emerald-500/10 text-emerald-200":"border-white/10 bg-[#283950] text-slate-300")}>
        {connection === "checking" ? t("CHECKING CONNECTION", "正在检查连接") : ready ? `${provider === "ollama" ? "Local · " : ""}${model} · ${t("READY", "已连接")}` : t("NOT CONNECTED", "尚未连接")}
      </span>
    </div>

    {!ready && connection !== "checking" && <section className="mb-5 rounded-2xl border border-[#395765] bg-[#19323c] surface-feature p-5 sm:p-6" role="status">
      <div className="flex gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7be2ca] font-black text-[#102139]">AI</span>
        <div>
          <h2 className="font-semibold">{provider === "ollama" ? t("Connect local Ollama", "连接本地 Ollama") : t("Connect DeepSeek when you are ready", "准备好后连接 DeepSeek")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{connectionMessage || t("Add a server-side DeepSeek API key to enable chat. The key never goes to the browser.", "添加仅服务端可见的 DeepSeek API 密钥即可启用对话，密钥不会发送到浏览器。")}</p>
          <p className="mt-3 text-xs leading-5 text-slate-400">{provider === "ollama"
            ? t("Local setup: ASSISTANT_PROVIDER=ollama; install Ollama and pull the model named above. No API key or cloud inference needed.", "本地配置：ASSISTANT_PROVIDER=ollama；安装 Ollama 并下载上方模型，无需 API Key 或云端推理。")
            : t("Server setup: DEEPSEEK_API_KEY. Production access also requires authentication and rate limiting.", "服务端配置：DEEPSEEK_API_KEY。生产环境还需要身份验证和请求限流。")}</p>
          <button type="button" onClick={() => { setConnection("checking"); setConnectionCheck(x => x + 1); }} className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300">
            {t("Recheck connection", "重新检查连接")}
          </button>
        </div>
      </div>
    </section>}

    <section className="surface-panel flex min-h-[570px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#172338]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">{t("Research conversation", "研究对话")}</h2>
          <p className="mt-1 text-[11px] text-slate-500">{provider === "ollama" ? t("Local small model · answers may contain errors", "本地小模型 · 回答可能存在错误") : t("Low-cost non-thinking mode · answers may contain errors", "低成本非思考模式 · 回答可能存在错误")}</p>
        </div>
        {messages.length > 0 && <button type="button" onClick={() => { setMessages([]); setError(""); }} disabled={sending} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50">{t("New chat", "新对话")}</button>}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-7" aria-live="polite">
        {messages.length === 0 && <div className="mx-auto flex max-w-2xl flex-col items-center py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#244d4b] text-lg font-black text-[#b0f2e2]">S·AI</span>
          <h2 className="mt-5 text-xl font-semibold">{t("What would you like to understand?", "你想了解什么？")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{t("Ask about investing concepts, company research, valuation, or portfolio risk.", "可以询问投资概念、公司研究、估值或投资组合风险。")}</p>
          <div className="mt-6 grid w-full gap-2 sm:grid-cols-3">
            {suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => void send(suggestion)} disabled={!ready || sending} className="rounded-xl border border-white/10 bg-[#102035] px-4 py-3 text-left text-xs leading-5 text-slate-300 hover:border-emerald-300/20 hover:bg-[#1d3c44] disabled:cursor-not-allowed disabled:opacity-45">{suggestion}</button>)}
          </div>
        </div>}
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={"flex "+(message.role === "user" ? "justify-end" : "justify-start")}>
          <div className={"max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[76%] "+(message.role === "user" ? "rounded-br-md bg-[#2b635d] text-white" : "rounded-bl-md border border-white/10 bg-[#101d30] text-slate-200")}>
            {message.content}
            {message.role==="assistant"&&((message.evidence?.length??0)>0||(message.dataNotes?.length??0)>0)&&
              <details className="mt-3 whitespace-normal border-t border-white/10 pt-2 text-xs text-slate-400">
                <summary className="cursor-pointer font-semibold">
                  {t("Verified data & sources", "核实数据与来源")} · {message.evidence?.length??0}
                </summary>
                <div className="mt-3 space-y-3 leading-5">
                  {(message.evidence??[]).map(item=><div key={item.id} className="rounded-lg border border-white/10 p-2">
                    <strong className="block text-slate-200">[{item.id}] {item.title}</strong>
                    <p className="mt-1">{item.source} · {item.asOf}</p>
                    <p className="mt-1 whitespace-pre-wrap">{item.summary}</p>
                    {item.url&&<a className="mt-1 inline-block text-[#8de0cc] underline" href={item.url}
                      target="_blank" rel="noopener noreferrer">{t("Original filing/source", "原始来源")}</a>}
                  </div>)}
                  {(message.dataNotes??[]).map((note,i)=><p key={i} className="text-amber-200">{note}</p>)}
                </div>
              </details>}
          </div>
        </div>)}
        {sending && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-white/10 bg-[#101d30] px-4 py-3 text-sm text-slate-400">{t("Thinking…", "正在思考…")}</div></div>}
        <div ref={endRef}/>
      </div>

      <form onSubmit={submit} className="border-t border-white/10 bg-[#101b2d] p-4 sm:p-5">
        {error && <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-xs leading-5 text-rose-200" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}>×</button></div>}
        <div className="flex items-end gap-3">
          <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={handleKeyDown} disabled={!ready || sending} maxLength={4000} rows={2} placeholder={ready ? t("Ask a research question…", "输入研究问题…") : (provider === "ollama" ? t("Start local Ollama to chat", "启动本地 Ollama 后开始对话") : t("Connect DeepSeek to start chatting", "连接 DeepSeek 后开始对话"))} aria-label={t("Message AI Assistant", "给 AI 助手发送消息")} className="surface-field min-h-[52px] flex-1 resize-none rounded-xl border px-4 py-3 text-sm leading-6 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"/>
          <button type="submit" disabled={!ready || sending || !input.trim()} className="h-[52px] rounded-xl bg-[#83e3cd] px-5 text-sm font-bold text-[#102139] transition hover:bg-[#a5f4e2] disabled:cursor-not-allowed disabled:opacity-45">{sending ? "…" : t("Send", "发送")}</button>
        </div>
        <p className="mt-3 text-center text-[10px] leading-4 text-slate-500">{t("AI output is educational and may be inaccurate. Verify important facts independently; this is not investment advice.", "AI 输出仅供学习参考，可能不准确。重要事实请独立核实；这不构成投资建议。")}</p>
      </form>
    </section>
  </div>;
}
