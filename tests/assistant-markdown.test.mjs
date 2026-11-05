import test from "node:test";
import assert from "node:assert/strict";
import {parseAssistantInline,parseAssistantMarkdown} from "../lib/assistant/markdown.ts";

test("assistant markdown renders the Chinese equity-analysis example as real headings and nested bullet items",()=>{
 const input=`关于 Apple (AAPL) 的分析：

### 1. 核心基本面事实 (Verified Facts)
* **营收与盈利表现**：根据 SEC 财报...
    * **市盈率 (P/E)**：约 38.7×。
* **每股指标**：股价为 **$349.56**。

### 2. 市场表现与风险特征
- **RSI (14)**：57.74。
- **MACD**：柱状图为负值。`;
 const blocks=parseAssistantMarkdown(input);
 assert.deepEqual(blocks.map(x=>x.kind),["paragraph","heading","list","heading","list"]);
 assert.equal(blocks[1].level,3);
 assert.equal(blocks[1].text,"1. 核心基本面事实 (Verified Facts)");
 assert.equal(blocks[2].items.length,3);
 assert.equal(blocks[2].items[1].depth,2);
 assert.equal(blocks[4].items.length,2);
 const tokens=parseAssistantInline(blocks[2].items[0].text);
 assert.equal(tokens.some(x=>x.kind==="strong"&&x.text==="营收与盈利表现"),true);
 assert.equal(tokens.some(x=>x.kind==="text"&&x.text.includes("SEC 财报")),true);
});
test("bold, inline code, italic and escaped stars are parsed without raw markers",()=>{
 const parts=parseAssistantInline("**Risk** is *high*. Use `VaR`. Literal \\*asterisk\\*.");
 assert.deepEqual(parts.filter(x=>x.kind!=="text").map(x=>x.kind),["strong","em","code"]);
 assert.equal(parts.filter(x=>x.kind==="text").map(x=>x.text).join("")," is . Use . Literal *asterisk*.");
});
test("plain URLs, HTML and malicious script tags remain text, not executable markup or links",()=>{
 const input=`### Review
<script>alert('XSS')</script>
[click here](javascript:alert(1))
* **AAPL** data [S1]`;
 const blocks=parseAssistantMarkdown(input);
 assert.equal(blocks[1].kind,"paragraph");
 assert.match(blocks[1].text,/script/);
 assert.match(blocks[1].text,/javascript:/);
 assert.equal(parseAssistantInline(blocks[1].text).every(p=>p.kind==="text"),true);
 assert.equal(blocks[2].items[0].text,"**AAPL** data [S1]");
});
test("fenced code preserves literal Markdown markers and ordered lists use original numbering",()=>{
 const blocks=parseAssistantMarkdown("1. First\n2. Second\n\n```ts\nconst x = \"**raw**\";\n### literal\n```");
 assert.equal(blocks[0].kind,"list");
 assert.deepEqual(blocks[0].items.map(x=>x.ordinal),[1,2]);
 assert.equal(blocks[1].kind,"code");
 assert.equal(blocks[1].language,"ts");
 assert.match(blocks[1].text,/### literal/);
 assert.match(blocks[1].text,/\*\*raw\*\*/);
});
test("hash signs inside prose and normal financial multiplication stay intact",()=>{
 const blocks=parseAssistantMarkdown("The #1 risk is concentration. Price * 100 is not italic.");
 assert.equal(blocks.length,1);
 assert.equal(blocks[0].kind,"paragraph");
 assert.equal(parseAssistantInline(blocks[0].text).every(x=>x.kind==="text"),true);
});
