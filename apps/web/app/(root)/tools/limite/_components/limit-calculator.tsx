"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { cn } from "@workspace/ui/lib/utils";
import {
  digitsToCentiseconds,
  formatDigitTime,
  formatDigitsDisplay,
  remainingCentiseconds,
  sanitizeDigitInput,
} from "@/lib/digit-time";

const ATTEMPT_COUNTS = ["3", "5"] as const;

type AttemptCount = (typeof ATTEMPT_COUNTS)[number];

function DigitTimeInput({
  id,
  label,
  placeholder,
  digits,
  onDigitsChange,
  hint,
  autoFocus,
}: {
  id: string;
  label: string;
  placeholder: string;
  digits: string;
  onDigitsChange: (digits: string) => void;
  hint?: string;
  autoFocus?: boolean;
}) {
  const display = formatDigitsDisplay(digits);
  const parsed = digitsToCentiseconds(digits);
  const invalid = parsed === "invalid";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = e.target.value;
    const nextDigits = sanitizeDigitInput(incoming);

    // Deleting a formatting character (":" / ".") leaves the same digits;
    // treat that as removing the last digit (digit-pad backspace).
    if (
      incoming.length < display.length &&
      nextDigits.length >= digits.length
    ) {
      onDigitsChange(digits.slice(0, -1));
      return;
    }

    onDigitsChange(nextDigits);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    onDigitsChange(sanitizeDigitInput(e.clipboardData.getData("text")));
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={display}
        aria-invalid={invalid || undefined}
        className={cn(invalid && "border-destructive")}
        onChange={handleChange}
        onPaste={handlePaste}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function LimitCalculator() {
  const [attemptCount, setAttemptCount] = useState<AttemptCount>("3");
  const [limitDigits, setLimitDigits] = useState("");
  const [attempts, setAttempts] = useState<string[]>(["", "", ""]);

  const count = Number(attemptCount);

  function setAttemptCountValue(value: AttemptCount) {
    setAttemptCount(value);
    const nextCount = Number(value);
    setAttempts((prev) => {
      if (prev.length === nextCount) return prev;
      if (prev.length < nextCount) {
        return [...prev, ...Array(nextCount - prev.length).fill("")];
      }
      return prev.slice(0, nextCount);
    });
  }

  function setAttempt(index: number, digits: string) {
    setAttempts((prev) => prev.map((v, i) => (i === index ? digits : v)));
  }

  function reset() {
    setLimitDigits("");
    setAttempts(Array(count).fill(""));
  }

  const remaining = remainingCentiseconds(
    limitDigits,
    attempts.slice(0, count),
  );
  const remainingLabel =
    remaining === null ? "--.--" : formatDigitTime(remaining);

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border p-6">
      <ToggleGroup
        type="single"
        variant="outline"
        value={attemptCount}
        onValueChange={(value) => {
          if (value === "3" || value === "5") {
            setAttemptCountValue(value);
          }
        }}
        className="w-full"
      >
        <ToggleGroupItem value="3" className="flex-1">
          3 intentos
        </ToggleGroupItem>
        <ToggleGroupItem value="5" className="flex-1">
          5 intentos
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="space-y-4">
        <DigitTimeInput
          id="limit"
          label="Límite total"
          placeholder="Límite total (ej. 50000 = 5:00.00)"
          digits={limitDigits}
          onDigitsChange={setLimitDigits}
          autoFocus
        />

        {attempts.slice(0, count).map((digits, index) => (
          <DigitTimeInput
            key={index}
            id={`attempt-${index + 1}`}
            label={`Intento ${index + 1}`}
            placeholder={`Intento ${index + 1}`}
            digits={digits}
            onDigitsChange={(value) => setAttempt(index, value)}
            hint={
              index === 0
                ? "Escribe solo números (4534 es 45.34 y 23454 es 2:34.54)."
                : undefined
            }
          />
        ))}
      </div>

      <div className="flex items-center justify-between rounded-md bg-muted/60 px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">
          Tiempo disponible
        </span>
        <strong className="text-xl tabular-nums">{remainingLabel}</strong>
      </div>

      <Button type="button" variant="outline" onClick={reset}>
        Restablecer
      </Button>
    </div>
  );
}
