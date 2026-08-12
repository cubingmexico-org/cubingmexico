"use client";

import { SummaryShareButton as SharedSummaryShareButton } from "../../../../_components/summary-share-button";
import type { TeamShareCardData } from "../_lib/share-highlights";
import { TeamSummaryShareCard } from "./team-summary-share-card";

type Props = {
  data: TeamShareCardData;
};

export function TeamSummaryShareButton({ data }: Props) {
  const summaryUrl = `https://www.cubingmexico.net/summary/team/${data.year}/${data.stateId}`;

  return (
    <SharedSummaryShareButton
      filename={`resumen-team-${data.year}-${data.stateId}.png`}
      shareUrl={summaryUrl}
      shareText={`Resumen anual ${data.year} de ${data.name} en Cubing México\n\n${summaryUrl}`}
      shareTitle={`Resumen ${data.year} — ${data.name}`}
      renderCard={(ref) => <TeamSummaryShareCard ref={ref} data={data} />}
    />
  );
}
