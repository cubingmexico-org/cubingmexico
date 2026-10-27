"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@workspace/ui/lib/utils";

function Progress({
  className,
  value: rawValue,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const max = props.max ?? 100;
  // Radix rejects NaN and out-of-range values (e.g. a ratio over an empty list).
  const value =
    typeof rawValue === "number" && Number.isFinite(rawValue)
      ? Math.min(Math.max(rawValue, 0), max)
      : null;

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
