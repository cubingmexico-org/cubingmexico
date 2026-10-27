import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { NumberInput } from "@/components/number-input";

/** A staff role toggle with how many people per group fill it. */
export function StaffField({
  id,
  label,
  enabled,
  onEnabledChange,
  count,
  onCountChange,
  helper,
}: {
  id: string;
  label: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  count: number;
  onCountChange: (count: number) => void;
  helper?: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Checkbox
        id={id}
        checked={enabled}
        onCheckedChange={(value) => onEnabledChange(value === true)}
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
        disabled={!enabled}
        value={count}
        onValueChange={onCountChange}
        aria-label={`Cantidad de ${label.toLowerCase()}`}
      />
    </div>
  );
}
