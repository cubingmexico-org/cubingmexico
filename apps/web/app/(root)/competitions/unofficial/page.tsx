import type { Metadata } from "next";
import { UnofficialCompetitionsList } from "./_components/unofficial-competitions-list";
import { getCompetitionsWithUnofficialEvents } from "./_lib/queries";

export const metadata: Metadata = {
  title: "Competencias con eventos no oficiales | Cubing México",
  description:
    "Competencias oficiales de la WCA en México que celebraron eventos no oficiales de Cubing Contests.",
};

export default async function Page() {
  const competitions = await getCompetitionsWithUnofficialEvents();

  return <UnofficialCompetitionsList competitions={competitions} />;
}
