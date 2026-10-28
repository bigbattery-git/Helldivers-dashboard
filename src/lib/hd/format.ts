// Display formats from the design system (README "문구"); every time is shown in KST (F-05-3).

const kstParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// "10.24 21:00"; dateOnly gives "10.24".
export function formatKst(at: Date | string, dateOnly = false) {
  const p = Object.fromEntries(
    kstParts.formatToParts(new Date(at)).map((x) => [x.type, x.value]),
  );
  const date = `${p.month}.${p.day}`;
  return dateOnly ? date : `${date} ${p.hour}:${p.minute}`;
}

// Remaining or elapsed time: "2일 3시간", "3시간 12분", "12분", "1분 미만".
export function formatDuration(ms: number) {
  const min = Math.floor(Math.max(0, ms) / 60_000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d) return h ? `${d}일 ${h}시간` : `${d}일`;
  if (h) return m ? `${h}시간 ${m}분` : `${h}시간`;
  return m ? `${m}분` : "1분 미만";
}

// "18:42:07"; hours keep counting past a day ("49:13:00").
export function formatCountdown(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

// "84,210"
export const formatNumber = (n: number) => n.toLocaleString("en-US");

// 0.6234 -> "62%"
export const formatPercent = (ratio: number, digits = 0) =>
  `${(ratio * 100).toFixed(digits)}%`;

// Change of a 0..1 ratio per hour: 0.024 -> "+2.4%/h"
export function formatRate(perHour: number, digits = 1) {
  const pct = (perHour * 100).toFixed(digits);
  return `${Number(pct) > 0 ? "+" : ""}${Number(pct) === 0 ? (0).toFixed(digits) : pct}%/h`;
}
