"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  MapPin,
  Calendar,
  Award,
  ClipboardList,
  IdCard,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Competition } from "@/types/wca";
import { cn } from "@workspace/ui/lib/utils";
import { useRouter } from "next/navigation";
import { isCompetitionToolsUnavailable } from "@/lib/competition-availability";
import { DESK_ENABLED, GROUPS_ENABLED } from "@/lib/constants";

const statusConfig = {
  upcoming: {
    label: "Próxima",
    className:
      "bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400",
  },
  ongoing: {
    label: "En Curso",
    className:
      "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400",
  },
  past: {
    label: "Finalizada",
    className:
      "bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 dark:text-slate-400",
  },
};

export function CompetitionCard({
  competition,
  status,
  logoUrl,
}: {
  competition: Competition;
  status: "upcoming" | "ongoing" | "past";
  logoUrl?: string | null;
}) {
  const startDate = new Date(`${competition.start_date}T00:00:00`);
  const endDate = new Date(`${competition.end_date}T00:00:00`);
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const maxVisibleEvents = 8;
  const visibleEvents = competition.event_ids.slice(0, maxVisibleEvents);
  const remainingEvents = competition.event_ids.length - maxVisibleEvents;
  const router = useRouter();

  const isNotAvailable = isCompetitionToolsUnavailable(competition);

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="mt-0.5 size-10 shrink-0 rounded-md object-contain"
              />
            ) : null}
            <CardTitle className="line-clamp-2 text-xl leading-tight">
              {competition.name}
            </CardTitle>
          </div>
          {competition.announced_at === null ? (
            <Badge variant="destructive" className="shrink-0 font-medium">
              No anunciada
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 font-medium",
                statusConfig[status].className,
              )}
            >
              {statusConfig[status].label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {competition.city}, {competition.country_iso2}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isSameDay
                ? format(startDate, "d 'de' MMMM 'de' yyyy", { locale: es })
                : `${format(startDate, "d 'de' MMM", { locale: es })} - ${format(endDate, "d 'de' MMM 'de' yyyy", { locale: es })}`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {visibleEvents.map((event, index: number) => (
              <span
                className={`cubing-icon event-${event} text-lg transition-transform hover:scale-110`}
                key={index}
                title={event}
              />
            ))}
            {remainingEvents > 0 && (
              <Badge variant="outline" className="text-xs">
                +{remainingEvents}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 pt-6">
        <Button
          className="w-full shadow-sm"
          size="sm"
          disabled={isNotAvailable}
          onClick={() => {
            router.push(`/certificates/${competition.id}`);
          }}
        >
          <Award />
          Certificados
        </Button>
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          disabled={isNotAvailable}
          onClick={() => {
            router.push(`/badges/${competition.id}`);
          }}
        >
          <IdCard />
          Gafetes
        </Button>
        {DESK_ENABLED ? (
          <Button
            variant="outline"
            className="w-full"
            size="sm"
            disabled={isNotAvailable}
            onClick={() => {
              router.push(`/desk/${competition.id}`);
            }}
          >
            <ClipboardList />
            Mesa
          </Button>
        ) : null}
        {GROUPS_ENABLED ? (
          <Button
            variant="outline"
            className="w-full"
            size="sm"
            disabled={isNotAvailable}
            onClick={() => {
              router.push(`/groups/${competition.id}`);
            }}
          >
            <Users />
            Grupos
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
