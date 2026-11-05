/** Minimal, data-only Markdown parsing for untrusted LLM replies.
 * JSX renderer uses React text nodes, never raw HTML or model-selected URLs.
 * Deliberately supports only formatting we need in the chat UI. */
export type InlinePart =
  | {kind:"text";text:string}
  | {kind:"strong"|"em"|"code";text:string};
export type ListPart={text:string;depth:number;ordered:boolean;ordinal:number};
export type MarkdownBlock =
  | {kind:"heading";level:1|2|3|4|5|6;text:string}
  | {kind:"paragraph";text:string}
  | {kind:"list";items:ListPart[]}
  | {kind:"code";language:string;text:string}
  | {kind:"quote";text:string}
  | {kind:"rule"};

const INLINE=/\\([\\`*_])|`([^`\n]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;
export function parseAssistantInline(input:string):InlinePart[]{
 const parts:InlinePart[]=[];
 let cursor=0;
 for(const match of input.matchAll(INLINE)){
  const at=match.index??0;
  if(at>cursor)parts.push({kind:"text",text:input.slice(cursor,at)});
  if(match[1]!==undefined)parts.push({kind:"text",text:match[1]});
  else if(match[2]!==undefined)parts.push({kind:"code",text:match[2]});
  else if(match[3]!==undefined||match[4]!==undefined)
   parts.push({kind:"strong",text:match[3]??match[4]});
  else parts.push({kind:"em",text:match[5]??match[6]??""});
  cursor=at+match[0].length;
 }
 if(cursor<input.length)parts.push({kind:"text",text:input.slice(cursor)});
 return parts.length?parts:[{kind:"text",text:input}];
}
const heading=(line:string)=>line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)\s*$/);
const bullet=(line:string)=>line.match(/^([ \t]*)([-+*]|\d{1,3}[.)])[ \t]+(.+)$/);
const fence=(line:string)=>line.match(/^ {0,3}```([\w-]*)\s*$/);
const rule=(line:string)=>/^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line);

export function parseAssistantMarkdown(input:string):MarkdownBlock[]{
 const lines=input.replace(/\r\n?/g,"\n").split("\n");
 const blocks:MarkdownBlock[]=[];
 let i=0;
 while(i<lines.length){
  const line=lines[i];
  if(!line.trim()){i++;continue;}
  const open=fence(line);
  if(open){
   const code:string[]=[];
   i++;
   while(i<lines.length&&!/^ {0,3}```\s*$/.test(lines[i]))code.push(lines[i++]);
   if(i<lines.length)i++;
   blocks.push({kind:"code",language:open[1],text:code.join("\n")});
   continue;
  }
  const h=heading(line);
  if(h){
   blocks.push({kind:"heading",level:h[1].length as 1|2|3|4|5|6,text:h[2]});
   i++;continue;
  }
  if(rule(line)){blocks.push({kind:"rule"});i++;continue;}
  const li=bullet(line);
  if(li){
   const items:ListPart[]=[];
   while(i<lines.length&&lines[i].trim()){
    const found=bullet(lines[i]);
    if(!found){
     const last=items[items.length-1];
     if(last&&/^\s{2,}\S/.test(lines[i])){
      last.text+=" "+lines[i].trim();i++;continue;
     }
     break;
    }
    const prefix=found[1].replace(/\t/g,"    ");
    const marker=found[2];
    const ordered=/^\d/.test(marker);
    items.push({
     text:found[3],depth:Math.min(4,Math.floor(prefix.length/2)),
     ordered,ordinal:ordered?Number.parseInt(marker,10):0,
    });
    i++;
   }
   blocks.push({kind:"list",items});
   continue;
  }
  if(/^\s{0,3}>\s?/.test(line)){
   const quoted:string[]=[];
   while(i<lines.length&&/^\s{0,3}>\s?/.test(lines[i])){
    quoted.push(lines[i].replace(/^\s{0,3}>\s?/,""));
    i++;
   }
   blocks.push({kind:"quote",text:quoted.join("\n")});
   continue;
  }
  const para:string[]=[];
  while(i<lines.length&&lines[i].trim()&&!heading(lines[i])&&!bullet(lines[i])&&!fence(lines[i])&&!rule(lines[i])&&!/^\s{0,3}>\s?/.test(lines[i])){
   para.push(lines[i]);i++;
  }
  if(para.length)blocks.push({kind:"paragraph",text:para.join("\n")});
 }
 return blocks;
}
