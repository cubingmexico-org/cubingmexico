import type { Metadata } from "next";
import { getStates } from "@/db/queries";
import type { SearchParams } from "@/types";
import { CcAttribution } from "@/components/cubing-contests/cc-attribution";
import { StateSelector } from "../../records/_components/state-selector";
import {
  getCcRankingEvents,
  getCcRecordHistory,
  getCcRecords,
} from "../_lib/queries";
import { searchParamsCache } from "./_lib/validations";
import { CcRecordsEventSelector } from "./_components/event-selector";
import { CcRecordsTable } from "./_components/records-table";
import { CcRecordHistoryTable } from "./_components/history-table";
import { CcRecordsShowSelector } from "./_components/show-selector";

export const metadata: Metadata = {
  title: "Récords no oficiales | Cubing México",
  description:
    "Récords nacionales y estatales de cuberos mexicanos en eventos no oficiales realizados en competencias WCA, con resultados de Cubing Contests.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = searchParamsCache.parse(await searchParams);
  const isHistory = search.show === "history";
  const [events, states, records, history] = await Promise.all([
    getCcRankingEvents(),
    getStates(),
    isHistory ? Promise.resolve([]) : getCcRecords(search),
    isHistory ? getCcRecordHistory(search) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">
          {search.state
            ? `Récords estatales no oficiales (USR) de ${search.state}`
            : "Récords nacionales no oficiales (UNR)"}
        </h1>
        <CcRecordsEventSelector events={events} />
        <div className="flex flex-col gap-2 sm:max-w-md">
          <span className="font-semibold text-sm">Estado</span>
          <StateSelector states={states} />
        </div>
        <CcRecordsShowSelector />
      </div>
      {isHistory ? (
        <CcRecordHistoryTable rows={history} />
      ) : (
        <CcRecordsTable records={records} />
      )}
      <CcAttribution />
    </div>
  );
}
