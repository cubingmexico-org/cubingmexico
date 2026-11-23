import { getInProgressLiveCompetitions } from "@/lib/live/queries";
import { HomeLiveBanner } from "./home-live-banner";

/** Fetches in-progress live comps; must sit under `<Suspense>` (uses `connection()`). */
export async function HomeLiveBannerSection() {
  const competitions = await getInProgressLiveCompetitions();
  return <HomeLiveBanner competitions={competitions} />;
}
