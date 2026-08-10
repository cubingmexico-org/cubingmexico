import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { getExportMetadata } from "../_lib/queries";
import { OpsJobsPanel } from "./_components/ops-jobs-panel";

async function OpsExportMetadata() {
  const metadata = await getExportMetadata();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estado del export</CardTitle>
        <CardDescription>
          Valores actuales en `export_metadata`
        </CardDescription>
      </CardHeader>
      <CardContent>
        {metadata.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin datos.</p>
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
      </CardContent>
    </Card>
  );
}

export default function AdminOpsPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <OpsExportMetadata />
      </Suspense>
      <OpsJobsPanel />
    </div>
  );
}
