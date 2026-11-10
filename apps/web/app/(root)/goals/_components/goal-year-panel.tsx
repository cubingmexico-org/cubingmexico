"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { MAX_GOALS_PER_YEAR, type GoalView } from "@/lib/goals/types";
import {
  deleteGoalAction,
  setGoalCompletedAction,
  setGoalPublicAction,
  type GoalActionResult,
} from "../_lib/actions";
import { GoalForm } from "./goal-form";
import { GoalStatusBadge, goalStatus } from "./goal-status-badge";

type EventOption = { id: string; name: string };

function GoalRow({
  goal,
  events,
  editable,
  canComplete,
  yearClosed,
  yearStarted,
}: {
  goal: GoalView;
  events: EventOption[];
  editable: boolean;
  canComplete: boolean;
  yearClosed: boolean;
  yearStarted: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<GoalActionResult>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (success) toast.success(success);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li>
        <GoalForm
          year={goal.year}
          events={events}
          goalId={goal.id}
          target={goal.target}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-medium">{goal.label}</p>
          {yearStarted && goal.progress && (
            <p className="text-sm text-muted-foreground">{goal.progress}</p>
          )}
        </div>
        {yearStarted && (
          <GoalStatusBadge status={goalStatus(goal.achieved, yearClosed)} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id={`public-${goal.id}`}
            checked={goal.isPublic}
            disabled={isPending}
            onCheckedChange={(checked) =>
              run(() => setGoalPublicAction(goal.id, checked))
            }
          />
          <Label htmlFor={`public-${goal.id}`} className="text-sm">
            Pública
          </Label>
        </div>
        {goal.type === "custom" && canComplete && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`done-${goal.id}`}
              checked={goal.completedAt !== null}
              disabled={isPending}
              onCheckedChange={(checked) =>
                run(() => setGoalCompletedAction(goal.id, checked === true))
              }
            />
            <Label htmlFor={`done-${goal.id}`} className="text-sm">
              La cumplí
            </Label>
          </div>
        )}
        {editable && (
          <div className="flex gap-2 ml-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() => deleteGoalAction(goal.id), "Meta eliminada.")
              }
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

export function GoalYearPanel({
  year,
  goals,
  events,
  editable,
  canComplete,
  yearClosed,
  yearStarted,
}: {
  year: number;
  goals: GoalView[];
  events: EventOption[];
  editable: boolean;
  canComplete: boolean;
  yearClosed: boolean;
  yearStarted: boolean;
}) {
  const achieved = goals.filter((g) => g.achieved).length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Metas {year}</h2>
        {yearStarted && goals.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {achieved} de {goals.length} cumplidas
          </p>
        )}
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {editable
            ? "Aún no tienes metas para este año."
            : "No definiste metas para este año."}
        </p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              events={events}
              editable={editable}
              canComplete={canComplete}
              yearClosed={yearClosed}
              yearStarted={yearStarted}
            />
          ))}
        </ul>
      )}

      {editable &&
        (goals.length < MAX_GOALS_PER_YEAR ? (
          <GoalForm year={year} events={events} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Llegaste al máximo de {MAX_GOALS_PER_YEAR} metas para {year}.
          </p>
        ))}
    </section>
  );
}
