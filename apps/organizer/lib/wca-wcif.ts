import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { WCIF } from "@/types/wcif";
import { wcifCheckUrl, wcifLatestUrl, wcifPatchUrl } from "@/lib/wcif-api";
import { wcaFetch } from "@workspace/wca";

// The WCA validates and saves the whole WCIF, which takes a while for large competitions.
const WCIF_WRITE_TIMEOUT_MS = 30_000;

export async function requireWcaAccessToken(): Promise<string> {
  const headersList = await headers();
  const tokenData = await auth.api.getAccessToken({
    body: { providerId: "wca" },
    headers: headersList,
  });

  const token = tokenData?.accessToken;
  if (!token) {
    throw new Error(
      "No se pudo obtener el token de WCA. Cierra sesión y vuelve a entrar con permisos de manage_competitions.",
    );
  }
  return token;
}

export async function getAuthorizedWcif(
  competitionId: string,
  token: string,
): Promise<WCIF> {
  const res = await wcaFetch(wcifLatestUrl(competitionId), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `No se pudo cargar el WCIF autorizado (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  return (await res.json()) as WCIF;
}

export type WcifCheckResult =
  | { ok: true }
  | { ok: false; error: string; details?: unknown };

export async function checkWcif(
  token: string,
  payload: unknown,
): Promise<WcifCheckResult> {
  const res = await wcaFetch(wcifCheckUrl(), {
    method: "PUT",
    timeoutMs: WCIF_WRITE_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (res.ok || res.status === 204) {
    return { ok: true };
  }

  const text = await res.text().catch(() => "");
  let details: unknown;
  let error = `Validación WCIF falló (${res.status})`;
  if (text) {
    try {
      details = JSON.parse(text) as unknown;
      if (details && typeof details === "object") {
        const obj = details as Record<string, unknown>;
        if (typeof obj.error === "string") error = obj.error;
        else error = JSON.stringify(details);
      } else {
        error = text.slice(0, 500);
      }
    } catch {
      error = text.slice(0, 500);
    }
  }

  return { ok: false, error, details };
}

export type WcifPatchResult =
  | { ok: true; data?: unknown }
  | { ok: false; error: string; details?: unknown };

export async function patchWcif(
  competitionId: string,
  token: string,
  payload: unknown,
): Promise<WcifPatchResult> {
  const res = await wcaFetch(wcifPatchUrl(competitionId), {
    method: "PATCH",
    timeoutMs: WCIF_WRITE_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }

  if (!res.ok) {
    let error = `No se pudo guardar el WCIF (${res.status})`;
    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>;
      if (typeof obj.error === "string") error = obj.error;
      else if (typeof obj.status === "string") error = obj.status;
    }
    return { ok: false, error, details: body };
  }

  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.error === "string" && obj.error) {
      return { ok: false, error: obj.error, details: body };
    }
  }

  return { ok: true, data: body };
}
