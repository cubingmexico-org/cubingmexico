"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { StateFlag } from "@/components/state-flag";
import { applyPersonStateGuesses } from "../../_lib/actions";
import type {
  PersonStateGuess,
  PersonStateGuessConfidence,
} from "../../_lib/queries";

type StateOption = { id: string; name: string };

function confidenceBadgeVariant(
  confidence: PersonStateGuessConfidence,
): "default" | "secondary" | "outline" {
  if (confidence === "high") return "default";
  if (confidence === "medium") return "secondary";
  return "outline";
}

function confidenceLabel(confidence: PersonStateGuessConfidence) {
  if (confidence === "high") return "Alta";
  if (confidence === "medium") return "Media";
  return "Baja";
}

export function StateGuessTable({
  guesses,
  states,
}: {
  guesses: PersonStateGuess[];
  states: StateOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [stateByPerson, setStateByPerson] = React.useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {};
    for (const guess of guesses) {
      if (guess.suggestedStateId) {
        initial[guess.wcaId] = guess.suggestedStateId;
      }
    }
    return initial;
  });
  const [selected, setSelected] = React.useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const guess of guesses) {
        if (guess.confidence === "high" && guess.suggestedStateId) {
          initial[guess.wcaId] = true;
        }
      }
      return initial;
    },
  );

  const selectedIds = guesses
    .map((guess) => guess.wcaId)
    .filter((id) => selected[id] && stateByPerson[id]);

  function selectHigh() {
    const next: Record<string, boolean> = {};
    for (const guess of guesses) {
      if (guess.confidence === "high" && stateByPerson[guess.wcaId]) {
        next[guess.wcaId] = true;
      }
    }
    setSelected(next);
  }

  async function onApply() {
    const assignments = selectedIds.map((personId) => ({
      personId,
      stateId: stateByPerson[personId]!,
    }));

    if (assignments.length === 0) {
      toast.error("Selecciona al menos una persona con estado");
      return;
    }

    setPending(true);
    const result = await applyPersonStateGuesses({ assignments });
    setPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    const applied = result.data?.applied ?? 0;
    const skipped = result.data?.skipped ?? 0;
    toast.success(
      skipped > 0
        ? `Asignadas ${applied} personas (${skipped} omitidas)`
        : `Asignadas ${applied} personas`,
    );
    router.refresh();
  }

  if (guesses.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay personas sin estado en este filtro.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || selectedIds.length === 0}
          onClick={() => void onApply()}
        >
          {pending
            ? "Aplicando..."
            : `Aplicar seleccionadas (${selectedIds.length})`}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={selectHigh}
        >
          Seleccionar altas
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Seleccionar</span>
              </TableHead>
              <TableHead>Persona</TableHead>
              <TableHead className="text-right">NR 333</TableHead>
              <TableHead className="text-right">Comps</TableHead>
              <TableHead className="min-w-44">Estado sugerido</TableHead>
              <TableHead>Evidencia</TableHead>
              <TableHead>Confianza</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guesses.map((guess) => {
              const stateId = stateByPerson[guess.wcaId] ?? "";
              const checked = Boolean(selected[guess.wcaId]);
              const evidenceParts = [guess.breakdown || "Sin comps MX"];
              if (
                guess.firstStateId &&
                guess.suggestedStateId &&
                guess.firstStateId !== guess.suggestedStateId
              ) {
                evidenceParts.push(`1ª: ${guess.firstStateId}`);
              }

              return (
                <TableRow key={guess.wcaId}>
                  <TableCell>
                    <Checkbox
                      checked={checked}
                      disabled={!stateId || pending}
                      onCheckedChange={(value) => {
                        setSelected((prev) => ({
                          ...prev,
                          [guess.wcaId]: value === true,
                        }));
                      }}
                      aria-label={`Seleccionar ${guess.name ?? guess.wcaId}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{guess.name ?? "—"}</p>
                      <Link
                        href={`/persons/${guess.wcaId}`}
                        className="text-muted-foreground hover:text-foreground font-mono text-xs underline-offset-4 hover:underline"
                      >
                        {guess.wcaId}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {guess.countryRank333 ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {guess.competitionCount}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={stateId || undefined}
                      disabled={pending}
                      onValueChange={(value) => {
                        setStateByPerson((prev) => ({
                          ...prev,
                          [guess.wcaId]: value,
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full min-w-40">
                        <SelectValue placeholder="Sin sugerencia" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.id} value={state.id}>
                            <span className="inline-flex items-center gap-1.5">
                              <StateFlag stateId={state.id} />
                              {state.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-56 text-xs">
                    {evidenceParts.join(" · ")}
                    {guess.totalMxComps > 0 ? (
                      <span className="mt-0.5 block">
                        {guess.suggestedComps}/{guess.totalMxComps} (
                        {Math.round(guess.share * 100)}%)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={confidenceBadgeVariant(guess.confidence)}>
                      {confidenceLabel(guess.confidence)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
