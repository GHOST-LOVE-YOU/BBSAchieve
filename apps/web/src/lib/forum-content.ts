export type BodyBlock = { type: "text"; text: string } | { type: "quote"; author: string; text: string };
export function parseForumBody(body: string): BodyBlock[] {
  const lines = body.replace(/\r\n?/g, "\n").split("\n").filter(line => line.trim() !== "--");
  while (lines.length && !lines.at(-1)?.trim()) lines.pop();
  if (lines.at(-1)?.trim() === "--") lines.pop();
  const blocks: BodyBlock[] = [];
  let text: string[] = [];
  const flush = () => { if (text.join("\n").trim()) blocks.push({ type: "text", text: text.join("\n").trim() }); text = []; };
  for (let i = 0; i < lines.length; i++) {
    const marker = lines[i].match(/^\s*【\s*在\s+(.+?)\s*的(?:大作中)?提到\s*[:：]\s*】\s*[:：]?\s*$/);
    if (!marker) { text.push(lines[i]); continue; }
    let j = i + 1;
    const quoted: string[] = [];
    while (j < lines.length) {
      const line = lines[j];
      if (!line.trim()) { quoted.push(""); j++; continue; }
      if (!/^\s*[:：]/.test(line)) break;
      quoted.push(line.replace(/^\s*[:：]\s?/, "")); j++;
    }
    if (!quoted.some(line=>line.trim())) { text.push(lines[i]); continue; }
    flush();
    blocks.push({ type: "quote", author: marker[1].replace(/\s*\(null\)\s*/g, "").trim(), text: quoted.join("\n").trim() });
    i = j - 1;
  }
  flush();
  return blocks;
}
