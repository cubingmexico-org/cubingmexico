import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { Competition } from "@/types/wca";
import { RegistrationButton } from "./registration-button";
import { AddToCalendarButton } from "./add-to-calendar-button";

export function CompetitionActions({
  competition,
}: {
  competition: Competition;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {competition.cancelled_at ? (
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "opacity-60 pointer-events-none",
          )}
        >
          Cancelada
        </span>
      ) : (
        <>
          <RegistrationButton
            registrationOpen={competition.registration_open}
            registrationClose={competition.registration_close}
            registrationUrl={competition.url}
          />
          <AddToCalendarButton
            competition={{
              id: competition.id,
              name: competition.name,
              start_date: competition.start_date,
              end_date: competition.end_date,
              venue: competition.venue,
              venue_address: competition.venue_address,
              url: competition.url,
            }}
          />
        </>
      )}
      <Link
        className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        href={competition.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink />
        Ver en WCA
      </Link>
    </div>
  );
}
