import "server-only";

function backendConfig() {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  const cronSecret = process.env.CRON_SECRET;
  if (!backendUrl || !cronSecret) {
    return null;
  }
  return { backendUrl, cronSecret };
}

export async function fetchResultadosImage(
  competitionId: string,
): Promise<
  | { ok: true; bytes: ArrayBuffer; filename: string }
  | { ok: false; status: number; body: unknown }
> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(
    `${config.backendUrl}/social/resultados/${encodeURIComponent(competitionId)}/image.png`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
      },
    },
  );

  if (!response.ok) {
    let body: unknown;
    const text = await response.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { message: text };
    }
    return { ok: false, status: response.status, body };
  }

  const bytes = await response.arrayBuffer();
  return {
    ok: true,
    bytes,
    filename: `resultados-${competitionId}.png`,
  };
}

export async function publishResultados(
  competitionId: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(
    `${config.backendUrl}/social/resultados/${encodeURIComponent(competitionId)}/publish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
        "Content-Type": "application/json",
      },
    },
  );

  let body: unknown;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  return { ok: response.ok, status: response.status, body };
}

export async function markResultadosPosted(
  competitionId: string,
  platforms?: string[],
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(
    `${config.backendUrl}/social/resultados/${encodeURIComponent(competitionId)}/mark`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(platforms ? { platforms } : {}),
    },
  );

  let body: unknown;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  return { ok: response.ok, status: response.status, body };
}

export async function fetchResultadosCaption(
  competitionId: string,
): Promise<
  { ok: true; caption: string } | { ok: false; status: number; body: unknown }
> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(
    `${config.backendUrl}/social/resultados/${encodeURIComponent(competitionId)}/caption`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
      },
    },
  );

  let body: unknown;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, body };
  }

  const caption =
    body &&
    typeof body === "object" &&
    "caption" in body &&
    typeof (body as { caption: unknown }).caption === "string"
      ? (body as { caption: string }).caption
      : null;

  if (!caption) {
    return {
      ok: false,
      status: 502,
      body: { error: "Caption missing in backend response" },
    };
  }

  return { ok: true, caption };
}
