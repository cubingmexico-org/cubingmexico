"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { Users, Calendar, MapPin } from "lucide-react";
import { Competition } from "@/types/wca";
import Link from "next/link";
import type { RegisteredPerson } from "@/types/wcif";
import { WcaMonochrome } from "@workspace/icons";

export function CompetitionInfoCard({
  competition,
  formattedDate,
  persons,
}: {
  competition: Competition;
  formattedDate: string;
  persons: RegisteredPerson[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información de la Competencia</CardTitle>
        <CardDescription>Detalles sobre la competencia</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 mb-2">
          <Link
            href={`https://live.worldcubeassociation.org/link/competitions/${competition.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: "default",
              size: "sm",
            })}
          >
            <WcaMonochrome />
            WCA Live
          </Link>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm">
            {competition.city}, {competition.country_iso2}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm">{formattedDate}</span>
        </div>
        <div className="flex items-start gap-2">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm">
            {persons.length}/{competition.competitor_limit} competidores
          </span>
        </div>
        <Separator />
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Eventos ({competition.event_ids.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {competition.event_ids.map((eventId) => (
              <span className={`cubing-icon event-${eventId}`} key={eventId} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
