import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AccentCell, Stat } from "../../../../_components/summary-stat";
import { teamInitials } from "../../../../_lib/format";
import type { TeamAnnualSummary } from "../_lib/queries";

export function TeamCommunitySections({
  members,
}: {
  members: TeamAnnualSummary["members"];
}) {
  return (
    <>
      {members.biggestTurnout && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Mayor reunión del Team</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            La mayor reunión del Team fue{" "}
            <Link
              href={`/competitions/${members.biggestTurnout.competitionId}`}
              prefetch={false}
              className="text-link hover:text-link/80 font-medium"
            >
              {members.biggestTurnout.competitionName}
            </Link>{" "}
            con <Stat>{members.biggestTurnout.memberCount}</Stat>{" "}
            {members.biggestTurnout.memberCount === 1 ? "miembro" : "miembros"}.
          </p>
        </section>
      )}

      {members.mostDiverseComp && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Competencia con más Teams</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            La competencia con más Teams distintos fue{" "}
            <Link
              href={`/competitions/${members.mostDiverseComp.competitionId}`}
              prefetch={false}
              className="text-link hover:text-link/80 font-medium"
            >
              {members.mostDiverseComp.competitionName}
            </Link>
            , con <Stat>{members.mostDiverseComp.distinctTeams}</Stat>{" "}
            {members.mostDiverseComp.distinctTeams === 1
              ? "otro Team"
              : "otros Teams"}
            .
          </p>
        </section>
      )}

      {members.crossedTeams.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Teams con los que más coincidimos
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Otros Teams presentes en las mismas competencias.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">Competencias</TableHead>
                  <TableHead className="text-center">Competidores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.crossedTeams.map((row) => (
                  <TableRow key={row.stateId}>
                    <TableCell>
                      <Link
                        prefetch={false}
                        href={`/teams/${row.stateId}`}
                        className="inline-flex items-center gap-2 text-link hover:text-link/80"
                      >
                        <Avatar className="size-7 border border-border">
                          <AvatarImage
                            src={row.teamImage ?? undefined}
                            alt={row.teamName}
                          />
                          <AvatarFallback className="text-[10px] font-semibold">
                            {teamInitials(row.teamName, row.stateId)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{row.teamName}</span>
                      </Link>
                    </TableCell>
                    <AccentCell>{row.sharedCompetitions}</AccentCell>
                    <AccentCell>{row.competitorsMet}</AccentCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {members.debuts > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Debutantes del Team</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            <Stat>{members.debuts}</Stat>{" "}
            {members.debuts === 1 ? "miembro debutó" : "miembros debutaron"} en
            la WCA este año.
          </p>
        </section>
      )}
    </>
  );
}
