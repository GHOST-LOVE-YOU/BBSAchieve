import { load } from "cheerio";
import emoticons from "@/src/lib/byr-emoticons.json";
const knownEmoticons = new Set(emoticons);
export function plainText(html: string) {
  const $ = load(html);
  $("script,style,iframe,object").remove();
  $("br").replaceWith("\n");
  $("p,div,blockquote,li").each((_, el) => {
    $(el).append("\n");
  });
  $("img").each((_, el) => {
    const alt = $(el).attr("alt") ?? "";
    const match = ($(el).attr("src") ?? "").match(/\/img\/ubb\/(em[a-c]?)\/(\d+)\.gif(?:\?.*)?$/);
    const name = match ? match[1] + match[2] : alt.replace(/^\[|\]$/g, "");
    $(el).replaceWith(knownEmoticons.has(name) ? `[${name}]` : alt || "[图片]");
  });
  $("a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text();
    if (/^https?:\/\//i.test(href) && text !== href)
      $(el).replaceWith(`${text} (${href})`);
  });
  return $.root()
    .text()
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
