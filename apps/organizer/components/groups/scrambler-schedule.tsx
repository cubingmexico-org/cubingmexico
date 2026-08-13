"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import type { WCIF } from "@/types/wcif";
import { buildScramblerSchedule } from "@/lib/groups/day-of";

function formatTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ScramblerSchedule({
  wcif,
  onSelectPerson,
}: {
  wcif: WCIF;
  onSelectPerson: (wcaUserId: number) => void;
}) {
  const rows = useMemo(() => buildScramblerSchedule(wcif), [wcif]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = `${row.dayKey}||${row.roomName}`;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, items]) => {
      const [dayKey, roomName] = key.split("||");
      return { dayKey: dayKey ?? "", roomName: roomName ?? "", items };
    });
  }, [rows]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay asignaciones de scrambler en el borrador.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map((section) => (
        <div key={`${section.dayKey}-${section.roomName}`} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-sm">{section.roomName}</h3>
            <Badge variant="outline">{section.dayKey}</Badge>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horario</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Scrambler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.items.map((row) => (
                  <TableRow
                    key={`${row.wcaUserId}-${row.activityId}`}
                    className={row.orphan ? "bg-destructive/5" : undefined}
                  >
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatTime(row.startTime)} – {formatTime(row.endTime)}
                    </TableCell>
                    <TableCell>
                      {row.activityName}
                      {row.orphan && (
                        <Badge variant="destructive" className="ml-2">
                          Huérfana
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="font-medium underline-offset-2 hover:underline"
                        onClick={() => onSelectPerson(row.wcaUserId)}
                      >
                        {row.personName}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
