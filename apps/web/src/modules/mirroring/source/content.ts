import { load } from "cheerio";
export function plainText(html: string) {
  const $ = load(html);
  $("script,style,iframe,object").remove();
  $("br").replaceWith("\n");
  $("p,div,blockquote,li").each((_, el) => {
    $(el).append("\n");
  });
  $("img").each((_, el) => {
    $(el).replaceWith($(el).attr("alt") ?? "[图片]");
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
