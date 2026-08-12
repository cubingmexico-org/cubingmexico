import { Suspense } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { getAdminOverviewCounts, getExportMetadata } from "./_lib/queries";

async function AdminOverviewContent() {
  const [counts, metadata] = await Promise.all([
    getAdminOverviewCounts(),
    getExportMetadata(),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personas sin estado</CardTitle>
            <CardDescription>
              Competidores mexicanos sin afiliación estatal
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold tabular-nums">
              {counts.personsWithoutState}
            </p>
            <Link
              href="/admin/people"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Gestionar
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Competencias MX sin estado
            </CardTitle>
            <CardDescription>
              Competencias en México sin `stateId`
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold tabular-nums">
              {counts.compsMissingState}
            </p>
            <Link
              href="/admin/competitions?missing=1"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Corregir
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posts RESULTADOS</CardTitle>
            <CardDescription>
              Publicaciones en Facebook / Instagram
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold tabular-nums">
              {counts.socialPostsTotal}
            </p>
            <Link
              href="/admin/social"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Ver
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export metadata</CardTitle>
          <CardDescription>
            Último estado del export WCA en la base de datos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metadata.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay registros en `export_metadata`.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {metadata.map((row) => (
                <li
                  key={row.key}
                  className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{row.key}</p>
                    <p className="text-muted-foreground break-all text-sm">
                      {row.value ?? "—"}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-xs whitespace-nowrap">
                    {row.updatedAt
                      ? new Date(row.updatedAt).toLocaleString("es-MX")
                      : "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Link
              href="/admin/ops"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Ir a Ops
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <AdminOverviewContent />
    </Suspense>
  );
}
