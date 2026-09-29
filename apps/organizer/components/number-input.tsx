"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@workspace/ui/components/input";

type NumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: number;
  onValueChange: (value: number) => void;
};

/**
 * Number input that lets the field be emptied while typing. Valid numbers are
 * reported as they are typed; on blur the text snaps back to `value`.
 */
export function NumberInput({
  value,
  onValueChange,
  onFocus,
  onBlur,
  ...props
}: NumberInputProps) {
  const [text, setText] = useState(() => String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  return (
    <Input
      {...props}
      type="number"
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (next.trim() === "") return;
        const parsed = Number(next);
        if (Number.isFinite(parsed)) onValueChange(parsed);
      }}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setText(String(value));
        onBlur?.(e);
      }}
    />
  );
}
