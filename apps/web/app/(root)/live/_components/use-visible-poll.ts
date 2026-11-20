"use client";

import { useEffect, useRef } from "react";

const DEFAULT_INTERVAL_MS = 15_000;

/**
 * Call `onPoll` every `intervalMs` while the document is visible.
 * Also fires once when the tab becomes visible again.
 */
export function useVisiblePoll(
  onPoll: () => void | Promise<void>,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): void {
  const onPollRef = useRef(onPoll);

  useEffect(() => {
    onPollRef.current = onPoll;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const clear = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const tick = () => {
      void onPollRef.current();
    };

    const start = () => {
      clear();
      if (document.visibilityState !== "visible") return;
      timer = setInterval(tick, intervalMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
        start();
      } else {
        clear();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}
