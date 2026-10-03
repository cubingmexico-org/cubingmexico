"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";

export const LOAD_MORE_STEP = 10;

export function useLoadMore<T>(items: T[], step = LOAD_MORE_STEP) {
  const [count, setCount] = useState(step);

  return {
    visible: items.slice(0, count),
    loadMore: () => setCount((current) => current + step),
  };
}

export function LoadMoreButton({
  onClick,
  shown,
  total,
}: {
  onClick: () => void;
  shown: number;
  total: number;
}) {
  if (shown >= total) return null;

  return (
    <div className="flex justify-center">
      <Button variant="outline" size="sm" onClick={onClick}>
        Cargar más ({shown} de {total})
      </Button>
    </div>
  );
}
