"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { refreshDelay } from "@/lib/hd/refresh";

// Open tabs pull the new render after each collection (SRS v6 A-01, A-02).
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    let pending = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        // Hidden tabs wait until they are shown again, then refresh once.
        if (document.hidden) pending = true;
        else router.refresh();
        schedule();
      }, refreshDelay(Date.now()));
    };
    const onVisible = () => {
      if (document.hidden || !pending) return;
      pending = false;
      router.refresh();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);
  return null;
}
