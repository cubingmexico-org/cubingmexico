import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { GroupKind } from "@workspace/db/schema";
import { formatAttemptValue } from "@/lib/utils";
import { groupHref, groupRecordLabel } from "@/lib/groups";
import { getTeamSocialLinks } from "@/app/(root)/teams/[stateId]/_lib/social-links";
import {
  getGroupCurrentRecords,
  getGroupHistoricalRecordCount,
  getGroupInfo,
  getGroupTopMembers,
} from "../_lib/queries";

export async function GroupOverview({
  groupId,
  kind,
}: {
  groupId: string;
  kind: GroupKind;
}) {
  const [info, topMembers, records, historicalCount] = await Promise.all([
    getGroupInfo(groupId),
    getGroupTopMembers(groupId),
    getGroupCurrentRecords(groupId),
    getGroupHistoricalRecordCount(groupId),
  ]);

  if (!info || info.kind !== kind) {
    return null;
  }

  const socialLinks = getTeamSocialLinks(info.socialLinks);
  const recordLabel = groupRecordLabel(kind);
  const base = groupHref(kind, groupId);

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Acerca de</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {info.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {info.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {kind === "community"
                  ? "Esta comunidad aún no tiene descripción."
                  : "Este equipo aún no tiene descripción."}
              </p>
            )}
            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <Link
                      key={social.key}
                      href={social.href}
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      {...(social.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      <Icon className="h-4 w-4" />
                      {social.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Récords actuales ({recordLabel})</CardTitle>
            <Link
              href={`${base}/rankings/333/single`}
              className="text-sm text-brand hover:underline"
            >
              Ver rankings
            </Link>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay récords calculados para este grupo.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Persona</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 20).map((record) => (
                    <TableRow
                      key={`${record.eventId}-${record.type}-${record.personId}`}
                    >
                      <TableCell>{record.eventName}</TableCell>
                      <TableCell>
                        {record.type === "single" ? "Single" : "Average"}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/persons/${record.personId}`}
                          prefetch={false}
                          className="hover:underline"
                        >
                          {record.personName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAttemptValue(
                          record.eventId,
                          record.best,
                          record.type,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {historicalCount > 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">
                {historicalCount} marcadores históricos {recordLabel} en
                resultados.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Top miembros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin miembros aún.</p>
            ) : (
              topMembers.map((member) => (
                <div
                  key={member.wcaId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <Link
                    href={`/persons/${member.wcaId}`}
                    prefetch={false}
                    className="truncate font-medium hover:underline"
                  >
                    {member.name}
                  </Link>
                  <span className="shrink-0 text-muted-foreground">
                    {member.bestRank != null
                      ? `#${member.bestRank} en 3x3`
                      : "—"}
                  </span>
                </div>
              ))
            )}
            <Link
              href={`${base}/members`}
              className="inline-block text-sm text-brand hover:underline"
            >
              Ver roster completo
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
