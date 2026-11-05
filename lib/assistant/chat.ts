export type AssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const MAX_CHAT_MESSAGES = 20;
export const MAX_MESSAGE_CHARACTERS = 4_000;
export const MAX_CONVERSATION_CHARACTERS = 16_000;

type ValidationResult =
  | { ok: true; messages: AssistantChatMessage[] }
  | { ok: false; message: string };

/** Validate and minimize browser-provided chat history before it reaches a paid provider. */
export function validateChatMessages(value: unknown): ValidationResult {
  if (!Array.isArray(value) || value.length < 1)
    return { ok: false, message: "Send at least one message." };
  if (value.length > MAX_CHAT_MESSAGES)
    return { ok: false, message: `Keep the conversation to ${MAX_CHAT_MESSAGES} messages or fewer.` };

  const messages: AssistantChatMessage[] = [];
  let totalCharacters = 0;
  for (const entry of value) {
    if (!entry || typeof entry !== "object")
      return { ok: false, message: "Every message must contain a role and text." };
    const { role, content } = entry as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string")
      return { ok: false, message: "Messages may only use user or assistant text roles." };
    const cleanContent = content.trim();
    if (!cleanContent || cleanContent.length > MAX_MESSAGE_CHARACTERS)
      return { ok: false, message: `Each message must contain 1–${MAX_MESSAGE_CHARACTERS.toLocaleString("en-US")} characters.` };
    totalCharacters += cleanContent.length;
    messages.push({ role, content: cleanContent });
  }
  if (totalCharacters > MAX_CONVERSATION_CHARACTERS)
    return { ok: false, message: "This conversation is too long. Start a new chat and try again." };
  if (messages.at(-1)?.role !== "user")
    return { ok: false, message: "The latest message must be from you." };
  return { ok: true, messages };
}
/** Extract only the final text field from a Chat Completions response. */
export function extractAssistantContent(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const choices = (value as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") return null;
  const message = (choices[0] as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}

/** Extract a non-streaming Ollama /api/chat response without exposing
 * the model's internal "thinking" field to the user. */
export function extractOllamaContent(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const message = (value as Record<string, unknown>).message;
  if (!message || typeof message !== "object" || Array.isArray(message)) return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}

/** GET /api/tags response lists models already pulled locally; never trigger
 * a model download implicitly from a browser request. */
export function hasInstalledOllamaModel(value: unknown, name: string): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const models = (value as Record<string, unknown>).models;
  return Array.isArray(models) && models.some((entry: unknown) =>
    entry && typeof entry === "object" && !Array.isArray(entry)
    && (entry as Record<string, unknown>).name === name);
}
