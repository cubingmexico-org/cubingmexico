"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Download, Loader2 } from "lucide-react";
import { CubingMexico } from "@workspace/icons";
import { SignIn } from "@/components/auth-components";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export function ClaimCertificate({
  token,
  competitionName,
}: {
  token: string;
  competitionName: string;
}) {
  const session = authClient.useSession();
  const [downloading, setDownloading] = useState(false);
  const user = session.data?.user;
  const loading = session.isPending;

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/claim/${encodeURIComponent(token)}/pdf`);
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(json?.error ?? "No se pudo descargar el certificado");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "certificado.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificado descargado");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el certificado",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <CubingMexico className="size-20" />
          </div>
          <CardTitle>Certificado de participación</CardTitle>
          <CardDescription>{competitionName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-center text-sm text-muted-foreground">
          <p>
            Inicia sesión con tu cuenta de la World Cube Association para
            descargar únicamente tu certificado.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {loading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          ) : user ? (
            <>
              <p className="text-sm text-muted-foreground">
                Sesión: {user.name ?? "competidor WCA"}
              </p>
              <Button
                className="w-full"
                disabled={downloading}
                onClick={() => void download()}
              >
                {downloading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Download />
                )}
                Descargar mi certificado
              </Button>
            </>
          ) : (
            <SignIn callbackURL={`/claim/${token}`} />
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
