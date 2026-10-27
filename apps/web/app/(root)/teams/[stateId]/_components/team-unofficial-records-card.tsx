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
import { UnofficialStateRecordsList } from "./unofficial-state-records";

type Records = Parameters<typeof UnofficialStateRecordsList>[0]["records"];

export function TeamUnofficialRecordsCard({
  stateName,
  records,
}: {
  stateName: string;
  records: Records;
}) {
  if (records.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Récords estatales no oficiales</CardTitle>
        <Link
          href={`/unofficial/records?state=${encodeURIComponent(stateName)}`}
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
        <UnofficialStateRecordsList records={records} />
      </CardContent>
    </Card>
  );
}
