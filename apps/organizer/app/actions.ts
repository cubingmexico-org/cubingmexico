"use server";

import { updateTag } from "next/cache";
import {
  assertManagesCompetition,
  requireSessionUser,
} from "@/lib/design-access";
import { isCompetitionToolsUnavailable } from "@/lib/competition-availability";
import { GROUPS_ENABLED } from "@/lib/constants";
import { buildWcifPatchPayload } from "@/lib/groups/wcif-patch";
import {
  checkWcif,
  getAuthorizedWcif,
  patchWcif,
  requireWcaAccessToken,
} from "@/lib/wca-wcif";
import type { WCIF } from "@/types/wcif";

export type ActionResult = { ok: true } | { ok: false; error: string };

function bustWcifCache(competitionId: string): void {
  updateTag(`wcif-${competitionId}`);
}

export async function revalidateWCIF(
  competitionId: string,
): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (!user) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  const access = await assertManagesCompetition(user.id, competitionId);
  if (!access.ok) {
    return {
      ok: false,
      error: "No tienes permiso para administrar esta competencia.",
    };
  }

  bustWcifCache(competitionId);
  return { ok: true };
}

export async function pushGroupsWcif(
  competitionId: string,
  draftWcif: WCIF,
): Promise<ActionResult> {
  try {
    if (!GROUPS_ENABLED) {
      return { ok: false, error: "Grupos no está disponible." };
    }

    const user = await requireSessionUser();
    if (!user) {
      return { ok: false, error: "Debes iniciar sesión." };
    }

    const access = await assertManagesCompetition(user.id, competitionId);
    if (!access.ok) {
      return {
        ok: false,
        error: "No tienes permiso para administrar esta competencia.",
      };
    }

    if (isCompetitionToolsUnavailable(access.competition)) {
      return {
        ok: false,
        error:
          "Esta competencia ya no admite publicación (resultados publicados hace más de 1 mes).",
      };
    }

    if (access.competition.results_posted_at) {
      return {
        ok: false,
        error:
          "Los resultados ya fueron publicados; WCA bloquea ediciones de WCIF para organizadores.",
      };
    }

    if (!draftWcif || draftWcif.id !== competitionId) {
      return {
        ok: false,
        error: "El borrador no coincide con la competencia.",
      };
    }

    const token = await requireWcaAccessToken();
    const authorized = await getAuthorizedWcif(competitionId, token);
    const payload = buildWcifPatchPayload(authorized, draftWcif);

    const check = await checkWcif(token, payload);
    if (!check.ok) {
      return { ok: false, error: check.error };
    }

    const patched = await patchWcif(competitionId, token, payload);
    if (!patched.ok) {
      return { ok: false, error: patched.error };
    }

    bustWcifCache(competitionId);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al publicar en WCA",
    };
  }
}
