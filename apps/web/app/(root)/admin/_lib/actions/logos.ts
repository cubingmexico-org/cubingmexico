"use server";

import { db } from "@workspace/db";
import { competition } from "@workspace/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { getErrorMessage } from "@/lib/handle-error";
import { requireSuperadmin } from "@/lib/superadmin";
import { competitionIdSchema } from "./schemas";

const updateCompetitionLogoSchema = z.object({
  competitionId: z.string().min(1),
  logo: z.string().url(),
});

const importMissingLogosSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});

function invalidateCompetitionLogoTags(
  competitionId: string,
  stateId?: string | null,
) {
  updateTag("competitions");
  updateTag(`competition-logo-${competitionId}`);
  if (stateId) {
    updateTag(`team-competitions-${stateId}`);
  }
}

async function getMexicanCompetitionForLogo(competitionId: string) {
  const existing = await db
    .select({
      id: competition.id,
      countryId: competition.countryId,
      information: competition.information,
      logo: competition.logo,
      stateId: competition.stateId,
    })
    .from(competition)
    .where(eq(competition.id, competitionId))
    .limit(1);

  if (existing.length === 0) {
    return { error: "Competencia no encontrada" as const, row: null };
  }

  if (existing[0]?.countryId !== "Mexico") {
    return {
      error: "Solo se pueden editar competencias de México" as const,
      row: null,
    };
  }

  return { error: null, row: existing[0]! };
}

export async function updateCompetitionLogo(input: {
  competitionId: string;
  logo: string;
}) {
  try {
    await requireSuperadmin();
    const data = updateCompetitionLogoSchema.parse(input);

    const { error, row } = await getMexicanCompetitionForLogo(
      data.competitionId,
    );
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    await db
      .update(competition)
      .set({ logo: data.logo })
      .where(eq(competition.id, data.competitionId));

    invalidateCompetitionLogoTags(data.competitionId, row.stateId);

    return { data: { logo: data.logo }, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function clearCompetitionLogo(input: { competitionId: string }) {
  try {
    await requireSuperadmin();
    const data = competitionIdSchema.parse(input);

    const { error, row } = await getMexicanCompetitionForLogo(
      data.competitionId,
    );
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    await db
      .update(competition)
      .set({ logo: null })
      .where(eq(competition.id, data.competitionId));

    invalidateCompetitionLogoTags(data.competitionId, row.stateId);

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

/**
 * Fetch a remote logo (e.g. WCA Active Storage) server-side for client
 * background removal, avoiding browser CORS limits.
 */
export async function fetchCompetitionLogoForEdit(input: {
  competitionId: string;
}) {
  try {
    await requireSuperadmin();
    const data = competitionIdSchema.parse(input);

    const { error, row } = await getMexicanCompetitionForLogo(
      data.competitionId,
    );
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    if (!row.logo) {
      return { data: null, error: "La competencia no tiene logo" };
    }

    if (row.logo.startsWith("data:")) {
      return { data: { dataUrl: row.logo }, error: null };
    }

    const response = await fetch(row.logo);
    if (!response.ok) {
      return {
        data: null,
        error: `No se pudo descargar el logo (${response.status})`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;

    return { data: { dataUrl }, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function importCompetitionLogoFromInformation(input: {
  competitionId: string;
  /** When true, overwrite an existing logo. Default: only fill empty logos. */
  overwrite?: boolean;
}) {
  try {
    await requireSuperadmin();
    const data = competitionIdSchema
      .extend({ overwrite: z.boolean().optional() })
      .parse(input);

    const { error, row } = await getMexicanCompetitionForLogo(
      data.competitionId,
    );
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    if (row.logo && !data.overwrite) {
      return {
        data: { logo: row.logo, skipped: true as const },
        error: null,
      };
    }

    const { extractFirstImageUrl } = await import("@/lib/competition-logo");
    const sourceUrl = extractFirstImageUrl(row.information);
    if (!sourceUrl) {
      return {
        data: null,
        error: "No hay imagen en la información de la competencia",
      };
    }

    await db
      .update(competition)
      .set({ logo: sourceUrl })
      .where(eq(competition.id, data.competitionId));

    invalidateCompetitionLogoTags(data.competitionId, row.stateId);

    return { data: { logo: sourceUrl, skipped: false as const }, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function importMissingCompetitionLogos(input?: {
  limit?: number;
}) {
  try {
    await requireSuperadmin();
    const data = importMissingLogosSchema.parse(input ?? {});
    const limit = data.limit ?? 25;

    const { extractFirstImageUrl } = await import("@/lib/competition-logo");

    const candidates = await db
      .select({
        id: competition.id,
        information: competition.information,
        stateId: competition.stateId,
      })
      .from(competition)
      .where(and(eq(competition.countryId, "Mexico"), isNull(competition.logo)))
      .orderBy(desc(competition.startDate))
      .limit(limit * 3);

    const withImages = candidates
      .map((row) => ({
        id: row.id,
        stateId: row.stateId,
        sourceUrl: extractFirstImageUrl(row.information),
      }))
      .filter(
        (
          row,
        ): row is {
          id: string;
          stateId: string | null;
          sourceUrl: string;
        } => row.sourceUrl !== null,
      )
      .slice(0, limit);

    let imported = 0;
    let failed = 0;
    const errors: { competitionId: string; error: string }[] = [];

    for (const row of withImages) {
      try {
        await db
          .update(competition)
          .set({ logo: row.sourceUrl })
          .where(eq(competition.id, row.id));
        invalidateCompetitionLogoTags(row.id, row.stateId);
        imported += 1;
      } catch (err) {
        failed += 1;
        errors.push({
          competitionId: row.id,
          error: getErrorMessage(err),
        });
      }
    }

    return {
      data: {
        imported,
        failed,
        attempted: withImages.length,
        errors,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}
