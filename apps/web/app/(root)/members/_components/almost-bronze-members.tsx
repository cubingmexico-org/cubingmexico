import { StateLabel } from "@/components/state-flag";
import { TableRow, TableCell } from "@workspace/ui/components/table";
import Link from "next/link";

interface AlmostBronzeMember {
  wcaId: string;
  name: string | null;
  state: string | null;
  completedCount: number;
  totalEvents: number;
  missingEvent: { id: string; name: string } | null;
}

interface AlmostBronzeMembersProps {
  members: AlmostBronzeMember[];
}

export function AlmostBronzeMembers({ members }: AlmostBronzeMembersProps) {
  if (members.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="text-center text-muted-foreground">
          No hay speedcubers a un evento de alcanzar el nivel Bronce.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {members.map((member) => (
        <TableRow key={member.wcaId}>
          <TableCell className="whitespace-nowrap">
            <div className="flex">
              <Link
                prefetch={false}
                href={`/persons/${member.wcaId}`}
                className="font-medium text-link hover:text-link/80"
              >
                {member.name}
              </Link>
            </div>
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {member.state ? (
              <StateLabel stateName={member.state} />
            ) : (
              <span className="text-muted-foreground font-light">N/A</span>
            )}
          </TableCell>
          <TableCell>
            {member.completedCount}/{member.totalEvents}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {member.missingEvent ? (
              <div className="flex items-center gap-2">
                <span
                  className={`cubing-icon event-${member.missingEvent.id} shrink-0`}
                />
                {member.missingEvent.name}
              </div>
            ) : (
              <span className="text-muted-foreground font-light">N/A</span>
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
