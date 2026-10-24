import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import type { CcEventResultsGroup } from "@/lib/cubing-contests";
import { CcAttribution } from "@/components/cubing-contests/cc-attribution";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import { CcResultsTable } from "@/components/cubing-contests/cc-results-table";

type PersonUnofficialTabProps = {
  wcaId: string;
  groups: CcEventResultsGroup[];
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
};

export function PersonUnofficialTab({
  wcaId,
  groups,
  selectedEventId,
  onEventSelect,
}: PersonUnofficialTabProps) {
  const selected =
    groups.find((group) => group.eventId === selectedEventId) ?? groups[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos no oficiales</CardTitle>
        <CardDescription>
          Resultados en eventos no oficiales realizados en competencias WCA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!selected ? (
          <p className="text-sm text-muted-foreground">
            Esta persona no tiene resultados en eventos no oficiales.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              {groups.map((group) => (
                <button
                  key={group.eventId}
                  type="button"
                  onClick={() => onEventSelect(group.eventId)}
                  aria-pressed={group.eventId === selected.eventId}
                  className={cn(
                    "text-2xl hover:text-primary/50 transition-colors",
                    group.eventId === selected.eventId && "text-primary",
                  )}
                >
                  <CcEventIcon
                    eventId={group.eventId}
                    eventName={group.eventName}
                  />
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <CcEventIcon
                  eventId={selected.eventId}
                  eventName={selected.eventName}
                  className="text-xl"
                />
                {selected.eventName}
              </h3>
              <CcResultsTable
                rows={selected.results}
                mode="competitions"
                personWcaId={wcaId}
              />
            </div>
          </>
        )}
        <CcAttribution />
      </CardContent>
    </Card>
  );
}
