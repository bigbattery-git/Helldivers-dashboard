"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/hd/format";

// "2일 14시간" until `to` (ISO), refreshed every minute. Empty on the server like Countdown.
export function RemainingTime({ to }: { to: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(new Date(to).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [to]);
  return (
    <span className="tabular-nums">
      {left === null ? "—" : formatDuration(left)}
    </span>
  );
}
