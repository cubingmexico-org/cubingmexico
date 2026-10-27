import Link from "next/link";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { eventNames } from "@/lib/constants";
import {
  formatAverageResult,
  formatBestResult,
  type CompetitionResultRow,
} from "../_lib/results";

export function MainEventPodium({
  competitionId,
  mainEventId,
  results,
}: {
  competitionId: string;
  mainEventId: string;
  results: CompetitionResultRow[];
}) {
  return (
    <Card className="mt-6 border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Podio del evento principal</CardTitle>
        <CardDescription>
          {eventNames[mainEventId] || mainEventId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.length > 0 ? (
          results.map((resultRow) => (
            <div
              key={`${resultRow.eventId}-${resultRow.personId}-${resultRow.position ?? 0}`}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2",
                resultRow.position === 1
                  ? "border-primary bg-background"
                  : "border-border bg-background/60",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-sm font-semibold text-muted-foreground">
                  {resultRow.position ?? "-"}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/persons/${resultRow.personId}`}
                    prefetch={false}
                    className="truncate font-medium text-link hover:text-link/80"
                  >
                    {resultRow.personName ?? resultRow.personId}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {resultRow.personId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{formatBestResult(resultRow)}</span>
                <span>{formatAverageResult(resultRow)}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Hay resultados registrados, pero todavía no hay podio del evento
            principal.
          </p>
        )}
        <div className="flex justify-end">
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              "bg-background",
            )}
            href={`/competitions/${competitionId}/results/podiums`}
            prefetch={false}
          >
            Ver resultados completos
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
