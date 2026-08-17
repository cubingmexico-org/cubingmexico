import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatRecordResult } from "@/app/(root)/records/_lib/format";
import type { RecentNationalRecord } from "@/app/(root)/records/_lib/queries";

type HomeRecentRecordsProps = {
  records: RecentNationalRecord[];
};

function formatCircaDate(dateKey: string): string {
  const key = dateKey.slice(0, 10);
  return new Date(`${key}T12:00:00.000Z`).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function HomeRecentRecords({ records }: HomeRecentRecordsProps) {
  return (
    <section className="border-t border-border bg-background">
      <div className="container mx-auto px-5 py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-foreground md:text-5xl">
              Récords recientes
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Los últimos récords nacionales establecidos en competencias WCA.
            </p>
          </div>
          <Link
            href="/records?show=history"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-warm"
          >
            Ver historial
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {records.length === 0 ? (
          <p className="mt-12 text-base text-muted-foreground">
            No hay récords recientes por mostrar.{" "}
            <Link
              href="/records"
              className="font-medium text-brand underline-offset-4 hover:underline"
            >
              Consulta los récords nacionales
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-12 divide-y divide-border border-t border-border">
            {records.map((record) => {
              const typeLabel = record.type === "single" ? "Single" : "Average";

              return (
                <li
                  key={`${record.resultId}-${record.type}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 py-5 md:gap-x-6"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className={`cubing-icon event-${record.eventId} shrink-0 text-2xl text-foreground`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold uppercase tracking-wide text-foreground md:text-xl">
                        {record.eventName}{" "}
                        <span className="text-muted-foreground">
                          · {typeLabel}
                        </span>
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground md:text-base">
                        {record.personName ? (
                          <Link
                            href={`/persons/${record.personId}`}
                            className="font-medium text-foreground transition-colors hover:text-brand"
                          >
                            {record.personName}
                          </Link>
                        ) : (
                          "—"
                        )}
                        {record.personState ? ` · ${record.personState}` : null}
                        {" · "}
                        <Link
                          href={`/competitions/${record.competitionId}`}
                          className="transition-colors hover:text-brand"
                        >
                          {record.competitionName}
                        </Link>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-3 sm:ml-auto">
                    <span className="font-display text-2xl font-bold tabular-nums text-brand md:text-3xl">
                      {formatRecordResult(
                        record.eventId,
                        record.value,
                        record.type,
                      )}
                    </span>
                    <time
                      dateTime={record.recordDate}
                      className="text-sm text-muted-foreground"
                    >
                      {formatCircaDate(record.recordDate)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
