import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { certificateShare } from "@workspace/db/schema";
import { emailsFromAuthorizedWcif } from "@/lib/certificates/authorized-person-fields";
import {
  newShareToken,
  publishParticipationShareSchema,
  type PublishParticipationShareResponse,
} from "@/lib/certificates/share-schema";
import {
  assertManagesCompetition,
  requireSessionUser,
} from "@/lib/design-access";
import { getAuthorizedWcif, requireWcaAccessToken } from "@/lib/wca-wcif";

const MODULE = "certificate_participation" as const;

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

  const parsed = publishParticipationShareSchema.safeParse(body);
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

  const emailsById = emailsFromAuthorizedWcif(authorizedWcif);
  const emails: string[] = [];
  const skippedNoEmail: number[] = [];
  for (const registrantId of registrantIds) {
    const info = emailsById.get(registrantId);
    if (!info) {
      skippedNoEmail.push(registrantId);
      continue;
    }
    emails.push(info.email);
  }

  const shareJson = {
    content,
    pageMargins,
    pageOrientation,
    pageSize,
    background,
  };

  const now = new Date();
  const existing = await db
    .select()
    .from(certificateShare)
    .where(
      and(
        eq(certificateShare.competitionId, competitionId),
        eq(certificateShare.module, MODULE),
      ),
    )
    .limit(1);

  let shareToken: string;

  if (existing[0]) {
    shareToken = existing[0].token;
    await db
      .update(certificateShare)
      .set({
        json: shareJson,
        userId: user.id,
        updatedAt: now,
      })
      .where(eq(certificateShare.id, existing[0].id));
  } else {
    shareToken = newShareToken();
    await db.insert(certificateShare).values({
      id: crypto.randomUUID(),
      token: shareToken,
      competitionId,
      userId: user.id,
      module: MODULE,
      json: shareJson,
      createdAt: now,
      updatedAt: now,
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const response: PublishParticipationShareResponse = {
    token: shareToken,
    claimUrl: `${appUrl}/claim/${shareToken}`,
    competitionName: access.competition.name,
    emails,
    skippedNoEmail,
  };

  return Response.json(response);
}
