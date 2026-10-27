import Link from "next/link";
import { ArrowRight, Medal } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { TeamTopMember } from "../_lib/queries";
import { TeamPersonLink } from "./team-profile-shared";

export function TeamTopMembersCard({
  stateId,
  topMembers,
}: {
  stateId: string;
  topMembers: TeamTopMember[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Miembros destacados</CardTitle>
        <Link
          href={`/teams/${stateId}/members`}
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1",
          )}
        >
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {topMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay podios registrados para este team.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {topMembers.map((member, index) => (
              <li
                key={member.wcaId}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
              >
                <span className="w-5 text-center tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 grow truncate font-medium">
                  <TeamPersonLink wcaId={member.wcaId} name={member.name} />
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                  <Medal className="h-3.5 w-3.5 text-amber-500" />
                  {member.podiums}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
