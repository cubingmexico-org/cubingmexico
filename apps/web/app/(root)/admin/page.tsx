import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Stat,
  StatDescription,
  StatIndicator,
  StatLabel,
  StatValue,
} from "@workspace/ui/components/stat";
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
        <Stat>
          <StatLabel>Personas sin estado</StatLabel>
          <Link href="/admin/people" aria-label="Gestionar">
            <StatIndicator variant="action">
              <ArrowRight />
            </StatIndicator>
          </Link>
          <StatValue className="tabular-nums">
            {counts.personsWithoutState}
          </StatValue>
          <StatDescription>
            Competidores mexicanos sin afiliación estatal
          </StatDescription>
        </Stat>
        <Stat>
          <StatLabel>Competencias MX sin estado</StatLabel>
          <Link href="/admin/competitions?missing=1" aria-label="Corregir">
            <StatIndicator variant="action">
              <ArrowRight />
            </StatIndicator>
          </Link>
          <StatValue className="tabular-nums">
            {counts.compsMissingState}
          </StatValue>
          <StatDescription>
            Competencias en México sin `stateId`
          </StatDescription>
        </Stat>
        <Stat>
          <StatLabel>Posts RESULTADOS</StatLabel>
          <Link href="/admin/social" aria-label="Ver">
            <StatIndicator variant="action">
              <ArrowRight />
            </StatIndicator>
          </Link>
          <StatValue className="tabular-nums">
            {counts.socialPostsTotal}
          </StatValue>
          <StatDescription>
            Publicaciones en Facebook / Instagram
          </StatDescription>
        </Stat>
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
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/ops"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Ir a Ops
            </Link>
            <Link
              href="/admin/schedules"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Horarios 9i2
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
