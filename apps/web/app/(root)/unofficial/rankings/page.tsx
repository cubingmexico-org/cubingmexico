import { redirect } from "next/navigation";
import { CcAttribution } from "@/components/cubing-contests/cc-attribution";
import { getCcRankingEvents } from "../_lib/queries";

export default async function Page() {
  const events = await getCcRankingEvents();
  const first = events[0];
  if (first) {
    redirect(`/unofficial/rankings/${first.id}/single`);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Rankings no oficiales</h1>
      <p className="text-muted-foreground">
        Todavía no hay resultados de eventos no oficiales.
      </p>
      <CcAttribution />
    </div>
  );
}
