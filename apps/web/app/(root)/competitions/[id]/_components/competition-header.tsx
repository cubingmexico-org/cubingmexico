import { Award, MapPin } from "lucide-react";
import { CompetitionLogo } from "@/components/competition-logo";
import type { Competition } from "@/types/wca";
import { formatDate } from "../_lib/format";

export function CompetitionHeader({
  competition,
  logo,
}: {
  competition: Competition;
  logo: string | null;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start justify-between mb-4">
      <div>
        <div className="flex items-center gap-3">
          <CompetitionLogo
            src={logo}
            alt={`Logo de ${competition.name}`}
            size={56}
            className="rounded-md"
          />
          <h1 className="text-4xl font-bold text-balance">
            {competition.name}
          </h1>
          {competition.cancelled_at && (
            <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-sm font-medium">
              Cancelada · {formatDate(competition.cancelled_at)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground mt-2">
          <MapPin className="h-4 w-4" />
          <span>{competition.city}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Award className="size-4 text-yellow-500" />
        <p className="text-sm text-muted-foreground">
          {competition.number_of_bookmarks} personas guardaron esta competencia
        </p>
      </div>
    </div>
  );
}
