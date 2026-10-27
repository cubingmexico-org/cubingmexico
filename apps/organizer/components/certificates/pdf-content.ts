import type { Competition } from "@/types/wca";
import type { ParticipantData, PodiumData } from "@/types/wcif";
import type { JSONContent } from "@tiptap/react";
import type {
  Margins,
  PageOrientation,
  PageSize,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import * as pdfMake from "pdfmake/build/pdfmake";
import { toast } from "sonner";
import { fontDeclarationsFor } from "@/lib/fonts";
import {
  buildParticipantCertificatesDocument,
  buildPodiumCertificatesDocument,
  type CertificateRenderers,
} from "@/lib/certificates/document";

export { createCertificateRenderers } from "@/lib/certificates/document";

function renderPdf(
  action: "open" | "download",
  build: () => TDocumentDefinitions,
  filename: string,
) {
  try {
    const docDefinition = build();
    const pdf = pdfMake.createPdf(
      docDefinition,
      undefined,
      fontDeclarationsFor(docDefinition),
    );
    if (action === "open") {
      pdf.open();
    } else {
      pdf.download(filename);
    }
  } catch {
    toast.error("Error al generar el PDF", {
      description: "Por favor, inténtalo de nuevo más tarde.",
    });
  }
}

export function generatePodiumPdf(
  action: "open" | "download",
  options: {
    competition: Competition;
    selectedPodiums: PodiumData[];
    content: JSONContent;
    background: string | undefined;
    pageMargins: Margins;
    pageOrientation: PageOrientation;
    pageSize: PageSize;
    renderDocumentContent: CertificateRenderers["renderDocumentContent"];
  },
) {
  renderPdf(
    action,
    () => buildPodiumCertificatesDocument(options),
    `Certificados Podio - ${options.competition.name}.pdf`,
  );
}

export function generateParticipantPdf(
  action: "open" | "download",
  {
    competition,
    selectedParticipants,
    participantsContent,
    backgroundParticipants,
    pageMarginsParticipants,
    pageOrientationParticipants,
    pageSizeParticipants,
    renderParticipantDocumentContent,
  }: {
    competition: Competition;
    selectedParticipants: ParticipantData[];
    participantsContent: JSONContent;
    backgroundParticipants: string | undefined;
    pageMarginsParticipants: Margins;
    pageOrientationParticipants: PageOrientation;
    pageSizeParticipants: PageSize;
    renderParticipantDocumentContent: CertificateRenderers["renderParticipantDocumentContent"];
  },
) {
  renderPdf(
    action,
    () =>
      buildParticipantCertificatesDocument({
        competition,
        selectedParticipants,
        participantsContent,
        renderParticipantDocumentContent,
        background: backgroundParticipants,
        pageMargins: pageMarginsParticipants,
        pageOrientation: pageOrientationParticipants,
        pageSize: pageSizeParticipants,
      }),
    `Certificados Participacion - ${competition.name}.pdf`,
  );
}
