import { notFound, redirect } from "next/navigation";
import { getCcRankingEvents } from "../_lib/queries";

export default async function Page() {
  const events = await getCcRankingEvents();
  const first = events[0];
  if (!first) {
    notFound();
  }
  redirect(`/unofficial/rankings/${first.id}/single`);
}
