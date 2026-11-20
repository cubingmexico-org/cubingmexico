import type { Competition } from "@/types/wca";
import type { WCIF } from "@/types/wcif";
import {
  buildParticipantCertificatesDocument,
  createCertificateRenderers,
} from "@/lib/certificates/document";
import { findPersonForClaim } from "@/lib/certificates/claim-match";
import { buildParticipantResults } from "@/lib/certificates/participation-data";
import { renderPdfBuffer } from "@/lib/certificates/render-pdf-buffer";
import {
  participationShareJsonSchema,
  type ParticipationShareJson,
} from "@/lib/certificates/share-schema";
import {
  parseCompetitionDates,
  removeAccents,
} from "@/components/certificates/utils";

export type ClaimPdfFailure =
  | { reason: "not_in_competition" }
  | { reason: "no_participation_results" };

export type ClaimPdfResult =
  | {
      ok: true;
      pdf: Buffer;
      filename: string;
      personName: string;
    }
  | ({ ok: false } & ClaimPdfFailure);

export function parseShareJson(raw: unknown): ParticipationShareJson | null {
  const parsed = participationShareJsonSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function renderClaimPdf(params: {
  competition: Competition;
  wcif: WCIF;
  subject: string;
  shareJson: ParticipationShareJson;
}): Promise<ClaimPdfResult> {
  const person = findPersonForClaim(params.wcif, params.subject);
  if (!person || person.registrantId === null) {
    return { ok: false, reason: "not_in_competition" };
  }

  const participants = buildParticipantResults(params.wcif);
  const participant = participants.find(
    (p) => p.registrantId === person.registrantId,
  );
  if (!participant) {
    return { ok: false, reason: "no_participation_results" };
  }

  const { startDate, endDate } = parseCompetitionDates(params.competition);
  const { renderParticipantDocumentContent } = createCertificateRenderers(
    params.competition,
    startDate,
    endDate,
  );

  const doc = buildParticipantCertificatesDocument({
    competition: params.competition,
    selectedParticipants: [participant],
    participantsContent: params.shareJson.content,
    background: params.shareJson.background,
    pageMargins: params.shareJson.pageMargins,
    pageOrientation: params.shareJson.pageOrientation,
    pageSize: params.shareJson.pageSize,
    renderParticipantDocumentContent,
  });

  const pdf = await renderPdfBuffer(doc);
  const safeName = removeAccents(participant.name).replace(/[^\w\s-]/g, "").trim();
  const filename = `Certificado Participacion - ${safeName || "competidor"}.pdf`;

  return {
    ok: true,
    pdf,
    filename,
    personName: participant.name,
  };
}
