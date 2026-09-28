"use client";

import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { parseAsStringEnum, useQueryStates } from "nuqs";
import { MOLLERZ_SCOPES } from "../_lib/scopes";

export function ScopeSwitch() {
  const [{ scope }, setQueryState] = useQueryStates(
    {
      scope: parseAsStringEnum([...MOLLERZ_SCOPES]).withDefault("world"),
    },
    {
      clearOnDefault: true,
      shallow: false,
    },
  );

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="mollerz-scope" className="text-sm">
        Mundial (WR)
      </Label>
      <Switch
        id="mollerz-scope"
        checked={scope === "national"}
        onCheckedChange={(checked) =>
          setQueryState({ scope: checked ? "national" : "world" })
        }
        aria-label="Cambiar entre criterios mundiales y nacionales"
      />
      <Label htmlFor="mollerz-scope" className="text-sm">
        Nacional (NR)
      </Label>
    </div>
  );
}
