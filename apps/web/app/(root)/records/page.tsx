import { getRecordHistory, getRecords } from "./_lib/queries";
import { SearchParams } from "@/types";
import { searchParamsCache } from "./_lib/validations";
import { getEvents, getStates } from "@/db/queries";
import { StateSelector } from "./_components/state-selector";
import { GenderSelector } from "./_components/gender-selector";
import { EventSelector } from "./_components/event-selector";
import { ShowSelector } from "./_components/show-selector";
import { ClearFiltersButton } from "./_components/clear-filters-button";
import { AsOfDatePicker } from "@/components/as-of-date-picker";
import {
  MixedRecordsTable,
  SeparateRecordsTables,
  SlimRecordsTables,
} from "./_components/current-records-views";
import {
  HistoryRecordsTables,
  MixedHistoryRecordsTable,
} from "./_components/history-records-views";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);

  const isHistoryMode =
    search.show === "history" || search.show === "mixed-history";

  const [events, states, records, history] = await Promise.all([
    getEvents(),
    getStates(),
    isHistoryMode ? Promise.resolve([]) : getRecords(search),
    isHistoryMode ? getRecordHistory(search) : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">
          {search.state
            ? `Récords estatales de ${search.state}`
            : `Récords nacionales`}{" "}
          {search.gender
            ? `(${search.gender === "m" ? "Masculinos" : "Femeniles"})`
            : undefined}
        </h1>

        <EventSelector events={events} />

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Estado</span>
          <StateSelector states={states} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <GenderSelector className="md:col-span-2" />
          <ShowSelector className="md:col-span-3" />
        </div>

        <AsOfDatePicker className="sm:max-w-xs" />

        <ClearFiltersButton />
      </div>

      {search.show === "mixed" ? (
        <SeparateRecordsTables records={records} />
      ) : null}
      {search.show === "slim" ? <MixedRecordsTable records={records} /> : null}
      {search.show === "separate" ? (
        <SlimRecordsTables records={records} />
      ) : null}
      {search.show === "history" ? (
        <HistoryRecordsTables records={history} />
      ) : null}
      {search.show === "mixed-history" ? (
        <MixedHistoryRecordsTable records={history} />
      ) : null}
    </>
  );
}
