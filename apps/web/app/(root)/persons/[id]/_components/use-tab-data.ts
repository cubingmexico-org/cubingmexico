"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";

/**
 * Loads a tab's data the first time the tab is `active`, and again whenever `key`
 * changes while it is. Returns null until the data for the current key arrives.
 */
export function useTabData<T>(
  active: boolean,
  key: string,
  load: () => Promise<T>,
): T | null {
  const [loaded, setLoaded] = useState<{ key: string; data: T } | null>(null);
  const [, startTransition] = useTransition();
  const loadData = useEffectEvent(load);
  const isLoaded = loaded?.key === key;

  useEffect(() => {
    if (!active || isLoaded) {
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void loadData().then((data) => {
        if (!cancelled) {
          setLoaded({ key, data });
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [active, key, isLoaded]);

  return isLoaded ? loaded.data : null;
}
