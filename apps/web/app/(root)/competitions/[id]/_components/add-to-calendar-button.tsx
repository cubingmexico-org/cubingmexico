"use client";

import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  buildGoogleCalendarUrl,
  competitionLocation,
  competitionPageUrl,
  type CalendarCompetition,
} from "@/lib/calendar";

interface AddToCalendarButtonProps {
  competition: CalendarCompetition;
}

export function AddToCalendarButton({ competition }: AddToCalendarButtonProps) {
  const googleUrl = buildGoogleCalendarUrl({
    title: competition.name,
    startDate: competition.start_date,
    endDate: competition.end_date,
    location: competitionLocation(competition),
    details: `${competition.url}\n${competitionPageUrl(competition.id)}`,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="lg">
          <CalendarPlus />
          Agregar al calendario
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/competitions/${competition.id}/calendar.ics`} download>
            <Download />
            <div className="flex flex-col">
              <span>Descargar horario (.ics)</span>
              <span className="text-xs text-muted-foreground">
                Apple Calendar, Outlook, Google
              </span>
            </div>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
