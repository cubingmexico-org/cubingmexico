"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { formatAttemptValue, type ResultValueType } from "@/lib/utils";
import {
  hasAverage,
  parseAttemptInput,
  whatIfParamKey,
  type WhatIfOverrides,
} from "@/lib/attempt-input";

type Values = {
  singles: Record<string, number>;
  averages: Record<string, number>;
};

const BASE_PATH = "/persons/nemesis/what-if";

function formatValue(
  eventId: string,
  type: ResultValueType,
  value: number | null | undefined,
) {
  return value ? (formatAttemptValue(eventId, value, type) ?? "") : "";
}

function placeholder(eventId: string, type: ResultValueType) {
  if (eventId === "333mbf") return "10/12 45:30";
  if (eventId === "333fm") return type === "single" ? "25" : "25.33";
  return "0.00";
}

function recordsFor(values: Values | WhatIfOverrides, type: ResultValueType) {
  return type === "single" ? values.singles : values.averages;
}

function initialInputs(
  events: Array<{ id: string }>,
  real: Values,
  overrides: WhatIfOverrides,
) {
  const initial: Record<string, string> = {};
  for (const event of events) {
    for (const type of ["single", "average"] as const) {
      const override = recordsFor(overrides, type)[event.id];
      initial[whatIfParamKey(type, event.id)] = formatValue(
        event.id,
        type,
        override !== undefined ? override : recordsFor(real, type)[event.id],
      );
    }
  }
  return initial;
}

export function WhatIfForm({
  wcaId,
  events,
  real,
  overrides,
}: {
  wcaId: string;
  events: Array<{ id: string; name: string }>;
  real: Values;
  overrides: WhatIfOverrides;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [inputs, setInputs] = useState(() =>
    initialInputs(events, real, overrides),
  );

  function navigate(query: URLSearchParams) {
    startTransition(() => {
      router.push(`${BASE_PATH}?${query.toString()}`, { scroll: false });
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = new URLSearchParams({ id: wcaId });
    const nextErrors = new Set<string>();

    for (const event of events) {
      for (const type of ["single", "average"] as const) {
        if (type === "average" && !hasAverage(event.id)) continue;
        const key = whatIfParamKey(type, event.id);
        const text = (inputs[key] ?? "").trim();
        const realText = formatValue(
          event.id,
          type,
          recordsFor(real, type)[event.id],
        );
        if (text === realText) continue;

        const parsed = parseAttemptInput(event.id, type, text);
        if (parsed === "invalid") {
          nextErrors.add(key);
        } else {
          query.set(key, parsed === null ? "" : String(parsed));
        }
      }
    }

    setErrors(nextErrors);
    if (nextErrors.size === 0) {
      navigate(query);
    }
  }

  function handleReset() {
    setErrors(new Set());
    setInputs(initialInputs(events, real, { singles: {}, averages: {} }));
    navigate(new URLSearchParams({ id: wcaId }));
  }

  function renderInput(eventId: string, type: ResultValueType) {
    const key = whatIfParamKey(type, eventId);
    const value = inputs[key] ?? "";
    const realText = formatValue(
      eventId,
      type,
      recordsFor(real, type)[eventId],
    );
    const edited = value.trim() !== realText;
    const invalid = errors.has(key);

    return (
      <TableCell className="text-center align-top">
        <Input
          value={value}
          onChange={(e) =>
            setInputs((prev) => ({ ...prev, [key]: e.target.value }))
          }
          placeholder={placeholder(eventId, type)}
          aria-invalid={invalid}
          aria-label={`${eventId} ${type}`}
          className={cn(
            "h-8 text-center max-w-36 mx-auto",
            edited && !invalid && "border-blue-600",
          )}
        />
        {invalid ? (
          <div className="text-xs text-destructive mt-1">Formato inválido</div>
        ) : edited ? (
          <div className="text-xs text-muted-foreground mt-1">
            Real: {realText || "sin récord"}
          </div>
        ) : null}
      </TableCell>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead className="text-center">Single</TableHead>
            <TableHead className="text-center">Average</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="align-top pt-4">
                <span className={`cubing-icon event-${event.id}`} />
                <span className="ml-2 hidden md:inline">{event.name}</span>
              </TableCell>
              {renderInput(event.id, "single")}
              {hasAverage(event.id) ? (
                renderInput(event.id, "average")
              ) : (
                <TableCell className="text-center align-top pt-4">
                  <span className="text-muted-foreground font-thin">-</span>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground text-center">
        Deja un campo vacío para quitar ese récord. Multi-Blind usa el formato
        resueltos/intentados m:ss.
      </p>
      <div className="flex justify-center gap-2">
        <Button type="button" variant="outline" onClick={handleReset}>
          <RotateCcw className="size-4" />
          Restablecer
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Simular
        </Button>
      </div>
    </form>
  );
}
