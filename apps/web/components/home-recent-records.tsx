import Link from "next/link";
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
    <section className="bg-muted/40 px-4 py-10 sm:px-6 md:py-14 lg:bg-transparent">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground md:text-3xl">
          Récords
        </h2>
        <Link
          href="/records?show=history"
          className="text-sm font-medium text-brand hover:text-brand-warm"
        >
          Historial
        </Link>
      </div>

      {records.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          Sin récords recientes.{" "}
          <Link href="/records" className="text-brand hover:underline">
            Ver récords
          </Link>
        </p>
      ) : (
        <ul className="mt-6">
          {records.map((record) => {
            const typeLabel = record.type === "single" ? "Single" : "Average";

            return (
              <li
                key={`${record.resultId}-${record.type}`}
                className="border-t border-border py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span
                        className={`cubing-icon event-${record.eventId} text-lg`}
                        aria-hidden
                      />
                      <span className="truncate">
                        {record.eventName}{" "}
                        <span className="text-muted-foreground">
                          · {typeLabel}
                        </span>
                      </span>
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {record.personName ? (
                        <Link
                          prefetch={false}
                          href={`/persons/${record.personId}`}
                          className="hover:text-brand"
                        >
                          {record.personName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-lg font-semibold tabular-nums text-brand">
                      {formatRecordResult(
                        record.eventId,
                        record.value,
                        record.type,
                      )}
                    </p>
                    <time
                      dateTime={record.recordDate}
                      className="text-xs text-muted-foreground"
                    >
                      {formatCircaDate(record.recordDate)}
                    </time>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
