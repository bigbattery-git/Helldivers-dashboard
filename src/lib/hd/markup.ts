// Dispatch markup `<i=N>text</i>` (F-03-5). N is the emphasis level: 3 headline, 1 highlight.
export type Segment = { text: string; level: number | null };

export function parseMarkup(source: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of source.matchAll(/<i=(\d+)>([\s\S]*?)<\/i>/g)) {
    if (m.index > last)
      out.push({ text: source.slice(last, m.index), level: null });
    out.push({ text: m[2], level: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < source.length) out.push({ text: source.slice(last), level: null });
  // Unpaired tags would show as raw text; drop them.
  return out
    .map((s) => ({ ...s, text: s.text.replace(/<\/?i(=\d+)?>/g, "") }))
    .filter((s) => s.text);
}

export const stripMarkup = (source: string) =>
  parseMarkup(source)
    .map((s) => s.text)
    .join("");
