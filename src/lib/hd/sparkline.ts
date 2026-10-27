// SVG path for a small line chart; min/max feed the text alternative (F-04-1, Q-03).
export function sparkline(values: number[], width: number, height: number) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const r = (n: number) => Math.round(n * 10) / 10;
  const path = values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${r(i * step)},${r(height - ((v - min) / span) * height)}`,
    )
    .join("");
  return { path, min, max };
}
