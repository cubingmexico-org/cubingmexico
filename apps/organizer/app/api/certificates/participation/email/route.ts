import { getCompetitionById } from "@/db/queries";
import { emailsFromAuthorizedWcif } from "@/lib/certificates/authorized-person-fields";
import {
  buildParticipantCertificatesDocument,
  createCertificateRenderers,
} from "@/lib/certificates/document";
import { buildParticipantResults } from "@/lib/certificates/participation-data";
import { renderPdfBuffer } from "@/lib/certificates/render-pdf-buffer";
import {
  participationEmailRequestSchema,
  type ParticipationEmailResponse,
} from "@/lib/certificates/requests";
import { parseCompetitionDates } from "@/components/certificates/utils";
import {
  assertManagesCompetition,
  requireSessionUser,
} from "@/lib/design-access";
import { sendCertificateEmail } from "@/lib/email/resend";
import {
  getAuthorizedWcif,
  requireWcaAccessToken,
} from "@/lib/wca-wcif";

export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = participationEmailRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    competitionId,
    registrantIds,
    content,
    pageMargins,
    pageOrientation,
    pageSize,
    background,
  } = parsed.data;

  const access = await assertManagesCompetition(user.id, competitionId);
  if (!access.ok) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return Response.json(
      {
        error:
          "El envío por correo no está configurado (RESEND_API_KEY / RESEND_FROM_EMAIL).",
      },
      { status: 503 },
    );
  }

  let token: string;
  try {
    token = await requireWcaAccessToken();
  } catch {
    return Response.json(
      {
        error:
          "No se pudo obtener el token de WCA. Cierra sesión y vuelve a entrar con permisos de manage_competitions.",
      },
      { status: 401 },
    );
  }

  let authorizedWcif;
  try {
    authorizedWcif = await getAuthorizedWcif(competitionId, token);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el WCIF autorizado",
      },
      { status: 502 },
    );
  }

  const competition =
    (await getCompetitionById({ id: competitionId })) ?? access.competition;
  const { startDate, endDate } = parseCompetitionDates(competition);
  const { renderParticipantDocumentContent } = createCertificateRenderers(
    competition,
    startDate,
    endDate,
  );

  const participantsById = new Map(
    buildParticipantResults(authorizedWcif).map((p) => [p.registrantId, p]),
  );
  const emailsById = emailsFromAuthorizedWcif(authorizedWcif);

  const response: ParticipationEmailResponse = {
    sent: 0,
    failed: [],
    skippedNoEmail: [],
    dailyQuotaHit: false,
    monthlyQuotaHit: false,
  };

  for (const registrantId of registrantIds) {
    const emailInfo = emailsById.get(registrantId);
    if (!emailInfo) {
      response.skippedNoEmail.push(registrantId);
      continue;
    }

    const participant = participantsById.get(registrantId);
    if (!participant) {
      response.failed.push({
        registrantId,
        error: "No hay resultados de participación para este competidor",
      });
      continue;
    }

    try {
      const doc = buildParticipantCertificatesDocument({
        competition,
        selectedParticipants: [participant],
        participantsContent: content,
        background,
        pageMargins,
        pageOrientation,
        pageSize,
        renderParticipantDocumentContent,
      });
      const pdf = await renderPdfBuffer(doc);
      const filename = `Certificado Participacion - ${participant.name}.pdf`;
      const sendResult = await sendCertificateEmail({
        to: emailInfo.email,
        subject: `Certificado de participación — ${competition.name}`,
        html: `<p>Hola ${participant.name},</p><p>Adjuntamos tu certificado de participación en <strong>${competition.name}</strong>.</p><p>— Cubing México</p>`,
        filename,
        pdf,
      });

      if (!sendResult.ok) {
        if (sendResult.dailyQuotaHit) {
          response.dailyQuotaHit = true;
          response.failed.push({
            registrantId,
            error: sendResult.error,
          });
          break;
        }
        if (sendResult.monthlyQuotaHit) {
          response.monthlyQuotaHit = true;
          response.failed.push({
            registrantId,
            error: sendResult.error,
          });
          break;
        }
        response.failed.push({
          registrantId,
          error: sendResult.error,
        });
        continue;
      }

      response.sent += 1;
    } catch (error) {
      response.failed.push({
        registrantId,
        error:
          error instanceof Error
            ? error.message
            : "Error al generar o enviar el certificado",
      });
    }
  }

  return Response.json(response);
}
