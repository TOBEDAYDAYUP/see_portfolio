import "server-only";
import { NextResponse } from "next/server";
import { extractAssistantContent, validateChatMessages } from "../../../../lib/assistant/chat";

const responseHeaders = { "Cache-Control": "private, no-store, max-age=0" };
const DEFAULT_MODEL = "deepseek-flash";
const SYSTEM_PROMPT = `You are SEE Portfolio's educational investment research assistant. Be concise, accurate, and explicit about uncertainty. Do not claim access to live prices, the user's portfolio, or SEE Portfolio screens unless that information appears in the conversation. Distinguish facts from assumptions and never present general information as personalized investment, legal, tax, or accounting advice. Reply in the user's language.`;

function configuration() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() ?? "";
  const productionEnabled = process.env.NODE_ENV !== "production" || process.env.DEEPSEEK_CHAT_ENABLED === "true";
  return {
    apiKey,
    configured: Boolean(apiKey) && productionEnabled,
    model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL,
    reason: !apiKey
      ? "Add a server-side DeepSeek API key to connect the assistant."
      : !productionEnabled
        ? "Production chat is off until authentication and rate limiting are ready."
        : "",
  };
}
export async function GET() {
  const config = configuration();
  return NextResponse.json({
    status: "ok",
    configured: config.configured,
    model: config.model,
    message: config.reason,
  }, { headers: responseHeaders });
}

export async function POST(request: Request) {
  const config = configuration();
  if (!config.configured)
    return NextResponse.json({ status: "not_configured", message: config.reason }, { status: 503, headers: responseHeaders });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Send a valid JSON request." }, { status: 400, headers: responseHeaders });
  }
  const messages = validateChatMessages((body as { messages?: unknown } | null)?.messages);
  if (!messages.ok)
    return NextResponse.json({ status: "error", message: messages.message }, { status: 400, headers: responseHeaders });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.messages],
        thinking: { type: "disabled" },
        max_tokens: 800,
        temperature: 0.3,
        stream: false,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!upstream.ok)
      return NextResponse.json({ status: "error", message: "The AI service could not complete that request. Check the server configuration and try again." }, { status: 502, headers: responseHeaders });
    const data: unknown = await upstream.json();
    const content = extractAssistantContent(data);
    if (!content)
      return NextResponse.json({ status: "error", message: "The AI service returned an empty response. Please try again." }, { status: 502, headers: responseHeaders });
    return NextResponse.json({ status: "ok", message: { role: "assistant", content }, model: config.model }, { headers: responseHeaders });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json({
      status: "error",
      message: timedOut ? "The AI service took too long to respond. Please try again." : "The AI service is temporarily unavailable. Please try again.",
    }, { status: 502, headers: responseHeaders });
  } finally {
    clearTimeout(timeout);
  }
}
