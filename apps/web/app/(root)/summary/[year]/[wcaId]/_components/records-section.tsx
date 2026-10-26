import { SrByEventTable } from "../../../_components/sr-by-event-table";
import { Stat } from "../../../_components/summary-stat";
import type { AnnualSummary } from "../_lib/queries";

export function RecordsSection({
  pronoun,
  records,
}: {
  pronoun: string;
  records: AnnualSummary["records"];
}) {
  const recordsTotal = records.wr + records.nar + records.nr + records.sr;

  if (recordsTotal <= 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Récords</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        {pronoun} consiguió <Stat>{records.wr}</Stat> WR,{" "}
        <Stat>{records.nar}</Stat> NAR, <Stat>{records.nr}</Stat> NR y{" "}
        <Stat>{records.sr}</Stat> SR.
      </p>
      {records.byEventSr.length > 0 && (
        <SrByEventTable rows={records.byEventSr} />
      )}
    </section>
  );
}
