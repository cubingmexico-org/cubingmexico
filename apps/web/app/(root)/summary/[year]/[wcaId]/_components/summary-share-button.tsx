"use client";

import { SummaryShareButton as SharedSummaryShareButton } from "../../../_components/summary-share-button";
import type { ShareCardData } from "../_lib/share-highlights";
import { SummaryShareCard } from "./summary-share-card";

type Props = {
  data: ShareCardData;
};

export function SummaryShareButton({ data }: Props) {
  const summaryUrl = `https://www.cubingmexico.net/summary/${data.year}/${data.wcaId}`;

  return (
    <SharedSummaryShareButton
      filename={`resumen-${data.year}-${data.wcaId}.png`}
      shareUrl={summaryUrl}
      shareText={`Mi resumen anual ${data.year} en Cubing México\n\n${summaryUrl}`}
      shareTitle={`Resumen ${data.year} — ${data.name}`}
      renderCard={(ref) => <SummaryShareCard ref={ref} data={data} />}
    />
  );
}
