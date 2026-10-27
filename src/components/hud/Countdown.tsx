"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/hd/format";

// Time left until `to` (ISO), ticking every second. Rendered empty on the server:
// the cached HTML cannot know the current time (SRS v4 §3).
export function Countdown({ to }: { to: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(new Date(to).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [to]);
  return (
    <span className="font-mono tabular-nums">
      {left === null ? "--:--:--" : formatCountdown(left)}
    </span>
  );
}
