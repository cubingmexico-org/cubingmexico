"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { hasAverage, parseAttemptInput } from "@/lib/attempt-input";
import { formatAttemptValue } from "@/lib/utils";
import {
  COUNT_METRIC_LABELS,
  COUNT_METRICS,
  EVENT_COUNT_METRICS,
  GOAL_TYPE_LABELS,
  GOAL_TYPES,
  MAX_CUSTOM_GOAL_LENGTH,
  MOLLERZ_TIERS,
  type CountMetric,
  type GoalTarget,
  type GoalType,
} from "@/lib/goals/types";
import { createGoalAction, updateGoalAction } from "../_lib/actions";

type EventOption = { id: string; name: string };
type Kind = "single" | "average";

const ALL_EVENTS = "all";

type FormState = {
  type: GoalType;
  eventId: string;
  kind: Kind;
  value: string;
  region: "national" | "state";
  maxRank: string;
  metric: CountMetric;
  count: string;
  /** ALL_EVENTS or the event a podium count is limited to. */
  countEventId: string;
  tier: (typeof MOLLERZ_TIERS)[number];
  maxNemeses: string;
  kinchScore: string;
  sorSum: string;
  text: string;
};

function initialState(events: EventOption[], target?: GoalTarget): FormState {
  const state: FormState = {
    type: "result",
    eventId: events[0]?.id ?? "333",
    kind: "average",
    value: "",
    region: "national",
    maxRank: "",
    metric: "competitions",
    count: "",
    countEventId: ALL_EVENTS,
    tier: "Plata",
    maxNemeses: "0",
    kinchScore: "",
    sorSum: "",
    text: "",
  };
  if (!target) return state;

  state.type = target.type;
  switch (target.type) {
    case "result":
      state.eventId = target.eventId;
      state.kind = target.kind;
      state.value =
        formatAttemptValue(target.eventId, target.value, target.kind) ?? "";
      break;
    case "rank":
      state.eventId = target.eventId;
      state.kind = target.kind;
      state.region = target.region;
      state.maxRank = String(target.maxRank);
      break;
    case "count":
      state.metric = target.metric;
      state.count = String(target.value);
      state.countEventId = target.eventId ?? ALL_EVENTS;
      break;
    case "mollerz":
      state.tier = target.tier;
      break;
    case "nemesis":
      state.maxNemeses = String(target.maxNemeses);
      break;
    case "kinch":
      state.kinchScore = target.minScore.toFixed(2);
      break;
    case "sor":
      state.kind = target.kind;
      state.sorSum = String(target.maxSum);
      break;
    case "custom":
      state.text = target.text;
      break;
  }
  return state;
}

function valuePlaceholder(eventId: string, kind: Kind) {
  if (eventId === "333mbf") return "10/12 45:30";
  if (eventId === "333fm") return kind === "single" ? "25" : "25.33";
  return "10.00";
}

const positive = (text: string) =>
  /^\d+$/.test(text.trim()) && Number(text) > 0;

function buildTarget(
  state: FormState,
): { target: GoalTarget } | { error: string } {
  switch (state.type) {
    case "result": {
      const value = parseAttemptInput(state.eventId, state.kind, state.value);
      if (value === null || value === "invalid") {
        return { error: "Escribe un resultado válido." };
      }
      return {
        target: {
          type: "result",
          eventId: state.eventId,
          kind: state.kind,
          value,
        },
      };
    }
    case "rank":
      if (!positive(state.maxRank))
        return { error: "Escribe un lugar válido." };
      return {
        target: {
          type: "rank",
          eventId: state.eventId,
          kind: state.kind,
          region: state.region,
          maxRank: Number(state.maxRank),
        },
      };
    case "count":
      if (!positive(state.count))
        return { error: "Escribe una cantidad válida." };
      return {
        target: {
          type: "count",
          metric: state.metric,
          value: Number(state.count),
          ...(EVENT_COUNT_METRICS.includes(state.metric) &&
          state.countEventId !== ALL_EVENTS
            ? { eventId: state.countEventId }
            : {}),
        },
      };
    case "mollerz":
      return { target: { type: "mollerz", tier: state.tier } };
    case "nemesis":
      if (!/^\d+$/.test(state.maxNemeses.trim())) {
        return { error: "Escribe una cantidad válida." };
      }
      return {
        target: { type: "nemesis", maxNemeses: Number(state.maxNemeses) },
      };
    case "kinch": {
      const text = state.kinchScore.trim();
      const score = Number(text);
      if (!/^\d+(\.\d{1,2})?$/.test(text) || score <= 0 || score > 100) {
        return { error: "Escribe un Kinch entre 0 y 100." };
      }
      return { target: { type: "kinch", minScore: score } };
    }
    case "sor":
      if (!positive(state.sorSum)) {
        return { error: "Escribe una suma válida." };
      }
      return {
        target: { type: "sor", kind: state.kind, maxSum: Number(state.sorSum) },
      };
    case "custom":
      if (!state.text.trim()) return { error: "Describe tu meta." };
      return { target: { type: "custom", text: state.text.trim() } };
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function GoalForm({
  year,
  events,
  goalId,
  target,
  onDone,
}: {
  year: number;
  events: EventOption[];
  /** Set when editing an existing goal. */
  goalId?: string;
  target?: GoalTarget;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState(() => initialState(events, target));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  function selectEvent(eventId: string) {
    setState((prev) => ({
      ...prev,
      eventId,
      kind: hasAverage(eventId) ? prev.kind : "single",
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const built = buildTarget(state);
    if ("error" in built) {
      setError(built.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = goalId
        ? await updateGoalAction(goalId, built.target)
        : await createGoalAction(year, built.target);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(goalId ? "Meta actualizada." : "Meta agregada.");
      if (!goalId) setState(initialState(events));
      onDone?.();
      router.refresh();
    });
  }

  const eventSelect = (
    <Field label="Evento">
      <Select value={state.eventId} onValueChange={selectEvent}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {events.map((event) => (
            <SelectItem key={event.id} value={event.id}>
              <span className={`cubing-icon event-${event.id}`} />
              {event.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  const kindSelect = (
    <Field label="Tipo">
      <Select value={state.kind} onValueChange={(v) => set("kind", v as Kind)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="single">Single</SelectItem>
          {hasAverage(state.eventId) && (
            <SelectItem value="average">Promedio</SelectItem>
          )}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <Field label="Meta">
        <Select
          value={state.type}
          onValueChange={(v) => set("type", v as GoalType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GOAL_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {GOAL_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {state.type === "result" && (
        <div className="grid sm:grid-cols-3 gap-4">
          {eventSelect}
          {kindSelect}
          <Field label={state.eventId === "333mbf" ? "Al menos" : "Debajo de"}>
            <Input
              value={state.value}
              onChange={(e) => set("value", e.target.value)}
              placeholder={valuePlaceholder(state.eventId, state.kind)}
            />
          </Field>
        </div>
      )}

      {state.type === "rank" && (
        <div className="grid sm:grid-cols-2 gap-4">
          {eventSelect}
          {kindSelect}
          <Field label="Ranking">
            <Select
              value={state.region}
              onValueChange={(v) => set("region", v as FormState["region"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="national">Nacional</SelectItem>
                <SelectItem value="state">Estatal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Top">
            <Input
              inputMode="numeric"
              value={state.maxRank}
              onChange={(e) => set("maxRank", e.target.value)}
              placeholder="100"
            />
          </Field>
        </div>
      )}

      {state.type === "count" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Cantidad">
            <Input
              inputMode="numeric"
              value={state.count}
              onChange={(e) => set("count", e.target.value)}
              placeholder="10"
            />
          </Field>
          <Field label="De">
            <Select
              value={state.metric}
              onValueChange={(v) => set("metric", v as CountMetric)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNT_METRICS.map((metric) => (
                  <SelectItem key={metric} value={metric}>
                    {COUNT_METRIC_LABELS[metric]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {EVENT_COUNT_METRICS.includes(state.metric) && (
            <Field label="Evento">
              <Select
                value={state.countEventId}
                onValueChange={(v) => set("countEventId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_EVENTS}>Todos los eventos</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      <span className={`cubing-icon event-${event.id}`} />
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
      )}

      {state.type === "mollerz" && (
        <Field label="Nivel mínimo">
          <Select
            value={state.tier}
            onValueChange={(v) => set("tier", v as FormState["tier"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOLLERZ_TIERS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {state.type === "nemesis" && (
        <Field label="Máximo de némesis al final del año (0 = invicto)">
          <Input
            inputMode="numeric"
            value={state.maxNemeses}
            onChange={(e) => set("maxNemeses", e.target.value)}
          />
        </Field>
      )}

      {state.type === "kinch" && (
        <Field label="Kinch de al menos (0 a 100)">
          <Input
            inputMode="decimal"
            value={state.kinchScore}
            onChange={(e) => set("kinchScore", e.target.value)}
            placeholder="50.00"
          />
        </Field>
      )}

      {state.type === "sor" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tipo">
            <Select
              value={state.kind}
              onValueChange={(v) => set("kind", v as Kind)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="average">Promedio</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sum of Ranks de máximo">
            <Input
              inputMode="numeric"
              value={state.sorSum}
              onChange={(e) => set("sorSum", e.target.value)}
              placeholder="500"
            />
          </Field>
        </div>
      )}

      {state.type === "custom" && (
        <Field label="Describe tu meta">
          <Input
            value={state.text}
            maxLength={MAX_CUSTOM_GOAL_LENGTH}
            onChange={(e) => set("text", e.target.value)}
            placeholder="Aprender a resolver el Megaminx"
          />
        </Field>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {goalId ? "Guardar" : "Agregar meta"}
        </Button>
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
