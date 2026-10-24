import { Fragment } from "react";
import { formatCcResult } from "@/lib/cubing-contests";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import { CcCompetitorName } from "@/components/cubing-contests/cc-competitors";
import { CcAttribution } from "@/components/cubing-contests/cc-attribution";
import type { CcRecordRow } from "@/app/(root)/unofficial/_lib/ranking";

export function UnofficialStateRecordsList({
  records,
}: {
  records: CcRecordRow[];
}) {
  return (
    <div className="space-y-3">
      <ul className="divide-y">
        {records.map((record) => (
          <li
            key={`${record.eventId}-${record.type}-${record.key}`}
            className="flex items-start gap-3 py-2 first:pt-0"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <CcEventIcon
                eventId={record.eventId}
                eventName={record.eventName}
                className="text-lg"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {record.eventName}{" "}
                <span className="text-muted-foreground font-normal">
                  · {record.type === "single" ? "Single" : "Average"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {record.competitors.map((competitor, index) => (
                  <Fragment key={competitor.ccPersonId}>
                    {index > 0 && ", "}
                    <CcCompetitorName competitor={competitor} />
                  </Fragment>
                ))}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatCcResult(record.eventFormat, record.value, record.type)}
            </span>
          </li>
        ))}
      </ul>
      <CcAttribution />
    </div>
  );
}
