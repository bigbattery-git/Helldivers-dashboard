import { parseMarkup, stripMarkup } from "./markup";

const KIND_LABELS: Record<string, string> = {
  dispatch: "디스패치",
  patch: "패치노트",
  announcement: "공지",
};

export const kindLabel = (kind: string) => KIND_LABELS[kind] ?? kind;

// Title and one-line preview for a feed row (F-03-1).
// Dispatches have no title: their `<i=3>` headline becomes it. Steam bodies are HTML;
// only their text is kept here, so nothing from the feed is rendered as markup.
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
  const text = stripMarkup(rest)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    title: title ?? (text.slice(0, 60) || "제목 없음"),
    preview: text.length > 140 ? `${text.slice(0, 140)}…` : text,
  };
}
