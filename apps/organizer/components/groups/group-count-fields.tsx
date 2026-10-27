import type { Dispatch, SetStateAction } from "react";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { NumberInput } from "@/components/number-input";
import type { LocatedActivity } from "@/lib/groups/wcif-schedule";

/** How many groups a round gets: one count for every stage, or one per room. */
export function GroupCountFields({
  parents,
  spreadAcrossStages,
  onSpreadAcrossStagesChange,
  groupCount,
  onGroupCountChange,
  perRoomCounts,
  onPerRoomCountsChange,
  peoplePerGroup,
}: {
  parents: LocatedActivity[];
  spreadAcrossStages: boolean;
  onSpreadAcrossStagesChange: (value: boolean) => void;
  groupCount: number;
  onGroupCountChange: (value: number) => void;
  perRoomCounts: Record<number, number>;
  onPerRoomCountsChange: Dispatch<SetStateAction<Record<number, number>>>;
  peoplePerGroup: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="spread-stages">
            Misma cantidad en todos los escenarios
          </Label>
          <p className="text-xs text-muted-foreground">
            Si se desactiva, puedes definir conteo por sala
          </p>
        </div>
        <Switch
          id="spread-stages"
          checked={spreadAcrossStages}
          onCheckedChange={onSpreadAcrossStagesChange}
        />
      </div>

      {spreadAcrossStages ? (
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="group-count">Cantidad de grupos</Label>
          <NumberInput
            id="group-count"
            min={1}
            max={32}
            value={groupCount}
            onValueChange={(value) => onGroupCountChange(value || 1)}
          />
          <p className="text-xs text-muted-foreground">
            {peoplePerGroup} personas por grupo
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {parents.map((parent) => (
            <div
              key={parent.roomId}
              className="flex items-center gap-3 max-w-md"
            >
              <Label className="w-40 shrink-0 truncate" title={parent.roomName}>
                {parent.roomName}
              </Label>
              <NumberInput
                min={0}
                max={32}
                value={perRoomCounts[parent.roomId] ?? 0}
                onValueChange={(value) =>
                  onPerRoomCountsChange((prev) => ({
                    ...prev,
                    [parent.roomId]: value,
                  }))
                }
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
