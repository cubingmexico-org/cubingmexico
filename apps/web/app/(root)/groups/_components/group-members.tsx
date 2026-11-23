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
import { StateLabel } from "@/components/state-flag";
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
                <TableHead>WCA ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Especialidades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((member) => (
                <TableRow key={member.wcaId}>
                  <TableCell className="font-mono text-sm">
                    <Link
                      className="text-accent-foreground hover:underline"
                      href={`https://www.worldcubeassociation.org/persons/${member.wcaId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {member.wcaId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/persons/${member.wcaId}`}
                        prefetch={false}
                        className="font-medium text-link hover:text-link/80"
                      >
                        {member.name}
                      </Link>
                      {member.role === "admin" ? <Badge>Admin</Badge> : null}
                      {member.role === "editor" ? (
                        <Badge variant="secondary">Editor</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.stateId && member.state ? (
                      <Link
                        href={`/teams/${member.stateId}`}
                        prefetch={false}
                        className="hover:underline"
                      >
                        <StateLabel
                          stateId={member.stateId}
                          stateName={member.state}
                        />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.specialties?.length ? (
                      <div className="flex space-x-2">
                        {member.specialties.map((specialty) => (
                          <span
                            className={`cubing-icon event-${specialty}`}
                            key={specialty}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
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
