"use client";

import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { parseAsBoolean, useQueryState, useQueryStates } from "nuqs";

/** Query string (`"?deprecated=true"` or `""`) for links that should keep the toggle. */
export function useDeprecatedQuery() {
  const [deprecated] = useQueryState(
    "deprecated",
    parseAsBoolean.withDefault(false),
  );
  return deprecated ? "?deprecated=true" : "";
}

export function DeprecatedEventsSwitch() {
  const [{ deprecated }, setQueryState] = useQueryStates(
    { deprecated: parseAsBoolean.withDefault(false) },
    { clearOnDefault: true, shallow: false },
  );

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="deprecated-events"
        checked={deprecated}
        onCheckedChange={(checked) => setQueryState({ deprecated: checked })}
      />
      <Label htmlFor="deprecated-events" className="text-sm">
        Incluir eventos descontinuados
      </Label>
    </div>
  );
}
