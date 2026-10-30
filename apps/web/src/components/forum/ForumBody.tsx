import { Fragment } from "react";
import Image from "next/image";
import emoticons from "@/src/lib/byr-emoticons.json";
import { parseForumBody } from "@/src/lib/forum-content";
const known = new Set(emoticons);
function inline(text: string) {
  return text.split(/(\[em[a-c]?\d+\]|(?<![a-zA-Z0-9_])em[a-c]?\d+(?![a-zA-Z0-9_]))/g).map((part, index) => {
    const name = part.replace(/^\[|\]$/g, "");
    return known.has(name) ? <Image key={index} unoptimized src={`/emoticons/byr/${name}.gif`} alt={`[${name}]`} width={name.startsWith("em") && /^em\d/.test(name)?20:40} height={name.startsWith("em") && /^em\d/.test(name)?20:40} className="mx-0.5 inline-block h-auto max-h-10 w-auto max-w-10 align-middle" /> : <Fragment key={index}>{part}</Fragment>;
  });
}
export function ForumBody({ body }: { body: string }) {
  return <div className="space-y-3 whitespace-pre-wrap break-words">{parseForumBody(body).map((block,index)=>block.type==='quote'?<blockquote key={index} className="my-3 border-l border-[color:var(--hairline)] pl-4 text-sm leading-6 text-[color:var(--ink-secondary)]"><div className="mb-1 font-medium">引用 {block.author} 的回复</div><div>{inline(block.text)}</div></blockquote>:<div key={index}>{inline(block.text)}</div>)}</div>;
}
