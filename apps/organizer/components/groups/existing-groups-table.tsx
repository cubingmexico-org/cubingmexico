import type { LocatedActivity } from "@/lib/groups/wcif-schedule";

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ExistingGroupsTable({ groups }: { groups: LocatedActivity[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Grupo</th>
            <th className="px-3 py-2 font-medium">Sala</th>
            <th className="px-3 py-2 font-medium">Horario</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.activity.id} className="border-t">
              <td className="px-3 py-2">{group.activity.name}</td>
              <td className="px-3 py-2">{group.roomName}</td>
              <td className="px-3 py-2 tabular-nums">
                {formatTime(group.activity.startTime)} –{" "}
                {formatTime(group.activity.endTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
