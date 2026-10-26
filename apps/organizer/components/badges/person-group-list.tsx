"use client";

import { Check } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import type { ExtendedPerson } from "@/types/wcif";
import type { PersonGroup } from "./group-persons";

export function PersonGroupList({
  groups,
  selectedPersons,
  onSelectAll,
  onSelectedChange,
}: {
  groups: PersonGroup[];
  selectedPersons: ExtendedPerson[];
  onSelectAll: (list: ExtendedPerson[]) => void;
  onSelectedChange: (person: ExtendedPerson, selected: boolean) => void;
}) {
  return (
    <>
      {groups.map(({ key, title, list }) =>
        list.length > 0 ? (
          <div key={key} className="col-span-full">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-medium">
                {title} ({list.length})
              </div>
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 transition-all"
                  onClick={() => onSelectAll(list)}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span className="text-xs">Seleccionar todo</span>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {list.map((person) => {
                const isChecked = selectedPersons.some(
                  (p) => p.wcaUserId === person.wcaUserId,
                );
                return (
                  <div
                    key={person.wcaUserId}
                    className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={(e) => {
                      // Only trigger if clicking the container, not the checkbox or label
                      if (e.target === e.currentTarget) {
                        onSelectedChange(person, !isChecked);
                      }
                    }}
                  >
                    <Checkbox
                      id={String(person.wcaUserId)}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        onSelectedChange(person, checked === true)
                      }
                    />
                    <Label
                      htmlFor={String(person.wcaUserId)}
                      className="cursor-pointer flex-1"
                    >
                      <p className="text-xs truncate">{person.name}</p>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null,
      )}
    </>
  );
}
