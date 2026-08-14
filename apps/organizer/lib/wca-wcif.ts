import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { WCIF } from "@/types/wcif";

const WCA_API = "https://www.worldcubeassociation.org/api/v0";

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
  const res = await fetch(`${WCA_API}/competitions/${competitionId}/wcif`, {
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
  competitionId: string,
  token: string,
  payload: unknown,
): Promise<WcifCheckResult> {
  const res = await fetch(
    `${WCA_API}/competitions/${competitionId}/wcif/check`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

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
  const res = await fetch(`${WCA_API}/competitions/${competitionId}/wcif`, {
    method: "PATCH",
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
