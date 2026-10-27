import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import type { TeamNationalRecord } from "../_lib/queries";
import { NationalRecordsList } from "./team-profile-shared";

export function TeamNationalRecordsCard({
  stateId,
  deprecated,
  records,
}: {
  stateId: string;
  deprecated: boolean;
  records: TeamNationalRecord[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Récords nacionales</CardTitle>
        <Link
          href={`/teams/${stateId}/statistics${deprecated ? "?deprecated=true" : ""}`}
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
      <CardContent className="flex flex-col gap-4">
        <DeprecatedEventsSwitch />
        <NationalRecordsList records={records} />
      </CardContent>
    </Card>
  );
}
