"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Home, RefreshCw, AlertTriangle, Send } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="grow flex items-center justify-center">
      <div className="container max-w-3xl px-4 py-16 text-center">
        <div className="mb-8 relative">
          <div className="flex justify-center">
            <div className="relative w-40 h-40 md:w-56 md:h-56">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-2 rotate-45 scale-110">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 md:w-12 md:h-12 rounded-md ${
                        [0, 2, 6, 8].includes(i)
                          ? "bg-red-500"
                          : [1, 3, 5, 7].includes(i)
                            ? "bg-orange-500"
                            : "bg-white border-2 border-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-6">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          ¡Algo salió mal!
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Ha ocurrido un error inesperado mientras intentábamos resolver esta
          página.
        </p>
        <p className="text-md text-gray-500 mb-8">
          Error: {error.message || "Error desconocido"}
          {error.digest && (
            <span className="block text-sm mt-1">ID: {error.digest}</span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            onClick={() => reset()}
            size="lg"
            className="bg-green-500 hover:bg-green-600"
          >
            <RefreshCw />
            Intentar de nuevo
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Home />
              Volver al inicio
            </Link>
          </Button>
        </div>

        <div className="bg-muted/25  p-6 rounded-lg border border-muted">
          <h2 className="text-lg font-semibold mb-3">
            ¿Sigue viendo este error?
          </h2>
          <p className="text-muted-foreground mb-4">
            Si el problema persiste, por favor repórtalo para que podamos
            solucionarlo lo antes posible.
          </p>
          <Button asChild variant="secondary">
            <Link
              target="_blank"
              href="https://github.com/cubingmexico-org/cubingmexico/issues/new"
            >
              <Send />
              Reportar problema
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
