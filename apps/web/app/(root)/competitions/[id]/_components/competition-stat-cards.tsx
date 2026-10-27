import { Award, CalendarDays, DollarSign, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import type { Competition } from "@/types/wca";
import { formatCurrency, formatDate } from "../_lib/format";

export function CompetitionStatCards({
  competition,
  hasResults,
  competitorCount,
}: {
  competition: Competition;
  hasResults: boolean;
  competitorCount: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fechas</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold">
            {formatDate(competition.start_date)}
            {competition.start_date !== competition.end_date && (
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                - {formatDate(competition.end_date)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Cuota de inscripción
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold">
            {formatCurrency(
              competition.base_entry_fee_lowest_denomination,
              competition.currency_code,
            )}
          </div>
          {competition.on_the_spot_registration && (
            <p className="text-xs text-muted-foreground">
              En el lugar:{" "}
              {formatCurrency(
                competition.on_the_spot_entry_fee_lowest_denomination,
                competition.currency_code,
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {hasResults ? "Competidores" : "Límite de competidores"}
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold">
            {hasResults
              ? `${competitorCount} competidor${competitorCount !== 1 ? "es" : ""}`
              : `${competition.competitor_limit} competidores`}
          </div>
          <p className="text-xs text-muted-foreground">
            {hasResults
              ? "Mexicanos que compitieron"
              : competition.guests_enabled
                ? "Invitados permitidos"
                : "No se permiten invitados"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Eventos</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold">
            {competition.event_ids.length} evento
            {competition.event_ids.length !== 1 ? "s" : ""}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
