import "server-only";

export type BackendResponse = {
  ok: boolean;
  status: number;
  body: unknown;
};

/** POSTs to a cron-protected route of the Flask backend (`BACKEND_URL`) with `CRON_SECRET`. */
export async function postToBackend(path: string): Promise<BackendResponse> {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  const cronSecret = process.env.CRON_SECRET;

  if (!backendUrl || !cronSecret) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
  });

  let body: unknown;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

export function backendErrorMessage(response: BackendResponse): string {
  const body = response.body as { message?: unknown; error?: unknown } | null;
  const message = body?.message ?? body?.error;
  return typeof message === "string"
    ? message
    : `Backend error (HTTP ${response.status})`;
}
