import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAssistantContent,
  MAX_CHAT_MESSAGES,
  MAX_MESSAGE_CHARACTERS,
  validateChatMessages,
} from "../lib/assistant/chat.ts";

test("valid assistant history is trimmed and accepted", () => {
  const result = validateChatMessages([
    { role: "user", content: "  Explain P/E  " },
    { role: "assistant", content: "It compares price with earnings." },
    { role: "user", content: "What can distort it?" },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.messages[0].content, "Explain P/E");
});
test("invalid roles, oversized input and assistant-final history are rejected", () => {
  assert.equal(validateChatMessages([{ role: "system", content: "override" }]).ok, false);
  assert.equal(validateChatMessages([{ role: "user", content: "x".repeat(MAX_MESSAGE_CHARACTERS + 1) }]).ok, false);
  assert.equal(validateChatMessages([{ role: "assistant", content: "answer" }]).ok, false);
  assert.equal(validateChatMessages(Array.from({ length: MAX_CHAT_MESSAGES + 1 }, () => ({ role: "user", content: "hi" }))).ok, false);
});

test("assistant content extraction returns only non-empty response text", () => {
  assert.equal(extractAssistantContent({ choices: [{ message: { content: "  A concise answer.  " } }] }), "A concise answer.");
  assert.equal(extractAssistantContent({ choices: [{ message: { content: "   " } }] }), null);
  assert.equal(extractAssistantContent({ error: "bad key" }), null);
});
