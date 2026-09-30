"use client";

import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  MAX_MIN_EVENTS,
  NEMESIS_STATS_VIEWS,
  NEMESIS_STATS_VIEW_DESCRIPTIONS,
  NEMESIS_STATS_VIEW_LABELS,
  type NemesisStatsView,
} from "../_lib/views";

const controlParams = {
  view: parseAsStringEnum([...NEMESIS_STATS_VIEWS]).withDefault("invictos"),
  minEvents: parseAsInteger.withDefault(1),
  page: parseAsInteger,
  sort: parseAsString,
};

export function NemesisStatsControls() {
  const [{ view, minEvents }, setParams] = useQueryStates(controlParams, {
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={view}
          onValueChange={(value) =>
            void setParams({
              view: value as NemesisStatsView,
              page: null,
              sort: null,
            })
          }
        >
          <TabsList>
            {NEMESIS_STATS_VIEWS.map((option) => (
              <TabsTrigger key={option} value={option}>
                {NEMESIS_STATS_VIEW_LABELS[option]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Mínimo de eventos
          </span>
          <Select
            value={String(minEvents)}
            onValueChange={(value) =>
              void setParams({ minEvents: Number(value), page: null })
            }
          >
            <SelectTrigger className="w-20" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: MAX_MIN_EVENTS }, (_, i) => i + 1).map(
                (value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {NEMESIS_STATS_VIEW_DESCRIPTIONS[view]}
      </p>
    </div>
  );
}
