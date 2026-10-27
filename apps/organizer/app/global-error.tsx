"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Replaces the root layout when it fails, so it can't rely on the app's styles or providers.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <main>
          <h1>Algo salió mal</h1>
          <p>Ocurrió un error inesperado. Inténtalo de nuevo.</p>
          <button type="button" onClick={() => retry()}>
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
