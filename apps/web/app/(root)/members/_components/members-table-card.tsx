import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  Table,
} from "@workspace/ui/components/table";
import type { MollerzScope } from "../_lib/scopes";
import { ScopeSwitch } from "./scope-switch";

const SCOPE_HEADERS: Record<MollerzScope, { podium: string; record: string }> =
  {
    world: { podium: "Podio WC", record: "WR" },
    national: { podium: "Podio Nacional", record: "NR" },
  };

interface MembersTableCardProps {
  scope?: MollerzScope;
  children: React.ReactNode;
}

export function MembersTableCard({ scope, children }: MembersTableCardProps) {
  const headers = scope
    ? SCOPE_HEADERS[scope]
    : { podium: "Podio", record: "Récord" };

  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Todos los miembros</CardTitle>
          <CardDescription>
            Lista completa de speedcubers mexicanos en el sistema Mollerz
          </CardDescription>
        </div>
        {scope ? <ScopeSwitch /> : <Skeleton className="h-5 w-52" />}
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid">
          <div className="w-full overflow-auto">
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Todos los eventos</TableHead>
                    <TableHead>Promedios Speedsolving</TableHead>
                    <TableHead>Medias BLD/FMC</TableHead>
                    <TableHead>{headers.podium}</TableHead>
                    <TableHead>{headers.record}</TableHead>
                    <TableHead>Eventos ganados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{children}</TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
