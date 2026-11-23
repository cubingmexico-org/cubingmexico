import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { getGroupMembers } from "../_lib/queries";

export async function GroupMembers({ groupId }: { groupId: string }) {
  const members = await getGroupMembers(groupId);
  const visible = members.filter((member) => !member.hideFromRoster);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Miembros</h2>
        <p className="text-sm text-muted-foreground">
          Roster del grupo ({visible.length})
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin miembros publicados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>WCA ID</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((member) => (
                <TableRow key={member.wcaId}>
                  <TableCell>
                    <Link
                      href={`/persons/${member.wcaId}`}
                      prefetch={false}
                      className="font-medium hover:underline"
                    >
                      {member.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {member.wcaId}
                  </TableCell>
                  <TableCell>
                    {member.stateId ? (
                      <Link
                        href={`/teams/${member.stateId}`}
                        prefetch={false}
                        className="hover:underline"
                      >
                        {member.state}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {member.role ? (
                      <Badge variant="secondary">{member.role}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
