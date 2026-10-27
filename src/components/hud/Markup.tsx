import { parseMarkup } from "@/lib/hd/markup";

// Dispatch and briefing text with `<i=N>` emphasis (F-03-5); line breaks are kept.
export function Markup({ text }: { text: string }) {
  return (
    <span className="whitespace-pre-line">
      {parseMarkup(text).map((s, i) =>
        s.level === null ? (
          s.text
        ) : (
          <strong key={i} className="font-semibold text-strong">
            {s.text}
          </strong>
        ),
      )}
    </span>
  );
}
