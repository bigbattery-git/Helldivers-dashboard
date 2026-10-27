import { parseMarkup, stripMarkup } from "./markup";

const KIND_LABELS: Record<string, string> = {
  dispatch: "디스패치",
  patch: "패치노트",
  announcement: "공지",
};

export const kindLabel = (kind: string) => KIND_LABELS[kind] ?? kind;

const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
};

// Full body of a Steam post as plain paragraphs (news page). Steam's API sends BBCode
// ([p], [list][*], [url=...]) and the Korean RSS sends HTML; neither is rendered:
// block ends become line breaks, list items get a bullet, every other tag is dropped.
export function steamText(body: string) {
  return body
    .replace(/\[img\][\s\S]*?\[\/img\]/gi, "")
    .replace(/\[\/(p|h\d|list|olist|\*)\]/gi, "\n")
    .replace(/\[\*\]/g, "• ")
    .replace(/\[\/?[a-z0-9]+(=[^\]]*)?\]/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (_, e: string) => ENTITIES[e])
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Title and one-line preview for a feed row (F-03-1).
// Dispatches have no title: their `<i=3>` headline becomes it. Steam bodies are HTML or
// BBCode; only their text is kept here, so nothing from the feed is rendered as markup.
export function newsPreview(entry: {
  title: string | null;
  body: string | null;
}) {
  const body = entry.body ?? "";
  let title = entry.title;
  let rest = body;
  if (!title) {
    const head = parseMarkup(body).find((s) => s.level === 3);
    title = head?.text ?? null;
    if (head) rest = body.replace(`<i=3>${head.text}</i>`, "");
  }
  const text = steamText(stripMarkup(rest)).replace(/\s+/g, " ").trim();
  return {
    title: title ?? (text.slice(0, 60) || "제목 없음"),
    preview: text.length > 140 ? `${text.slice(0, 140)}…` : text,
  };
}
