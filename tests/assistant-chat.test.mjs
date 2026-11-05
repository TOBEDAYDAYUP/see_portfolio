import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAssistantContent,
  extractOllamaContent,
  hasInstalledOllamaModel,
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

test("Ollama assistant response extracts only visible text, not thinking metadata", () => {
  assert.equal(extractOllamaContent({
    model:"qwen3:0.6b",message:{role:"assistant",content:"  Hello from this Mac.  ",thinking:"private reasoning"},
  }),"Hello from this Mac.");
  assert.equal(extractOllamaContent({message:{content:"  "}}),null);
  assert.equal(extractOllamaContent({response:"not a chat result"}),null);
  assert.equal(extractOllamaContent(null),null);
});

test("Local model availability requires an exact installed name", () => {
  const installed={models:[{name:"qwen3:0.6b"},{name:"qwen3:1.7b"}]};
  assert.equal(hasInstalledOllamaModel(installed,"qwen3:0.6b"),true);
  assert.equal(hasInstalledOllamaModel(installed,"qwen3:0.8b"),false);
  assert.equal(hasInstalledOllamaModel({models:[]},"qwen3:0.6b"),false);
  assert.equal(hasInstalledOllamaModel({models:[{name:null}]},"qwen3:0.6b"),false);
  assert.equal(hasInstalledOllamaModel("invalid","qwen3:0.6b"),false);
});
