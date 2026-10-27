import Link from "next/link";
import { MapPin } from "lucide-react";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import type { Competition } from "@/types/wca";
import { Map as CompetitionMap } from "./map";

export function VenueTab({ competition }: { competition: Competition }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Información de la sede</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Ubicación</h4>
            <p className="text-sm text-muted-foreground">{competition.venue}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Dirección</h4>
            <p className="text-sm text-muted-foreground">
              {competition.venue_address}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Detalles</h4>
            <p className="text-sm text-muted-foreground">
              {competition.venue_details}
            </p>
          </div>
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full bg-transparent",
            )}
            href={`https://www.google.com/maps?q=${competition.latitude_degrees},${competition.longitude_degrees}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin />
            Ver en Google Maps
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <CompetitionMap
              center={[
                competition.latitude_degrees,
                competition.longitude_degrees,
              ]}
              markers={[
                {
                  id: competition.id,
                  venue: competition.venue,
                  address: competition.venue_address,
                  latitude: competition.latitude_degrees,
                  longitude: competition.longitude_degrees,
                },
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
