"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { NumberInput } from "@/components/number-input";
import type { CompetitionConfig } from "@/lib/groups/config";

export type UpdateCompetitionConfig = (
  patch: Partial<CompetitionConfig>,
) => void;

export function ConfigSwitch({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <Label htmlFor={id} className="leading-snug cursor-pointer">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0"
      />
    </div>
  );
}

export function StaffRoleRow({
  id,
  label,
  checked,
  onCheckedChange,
  count,
  onCountChange,
  helper,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  count: number;
  onCountChange: (count: number) => void;
  helper?: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-2.5"
      />
      <div className="space-y-1 min-w-0 flex-1">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
      <NumberInput
        min={0}
        max={32}
        className="w-20"
        disabled={!checked}
        value={count}
        onValueChange={onCountChange}
        aria-label={`Cantidad de ${label.toLowerCase()}`}
      />
    </div>
  );
}
