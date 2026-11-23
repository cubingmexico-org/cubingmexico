import Link from "next/link";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { stripMarkdownLinks } from "@/lib/calendar";
import type { Competition } from "@/types/wca";

const CompetitionMap = dynamic(
  () => import("./map").then((mod) => mod.Map),
  { ssr: false, loading: () => <Skeleton className="w-full h-full" /> },
);

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
            <div className="text-sm text-muted-foreground">
              <ReactMarkdown
                components={{
                  a: ({ children, href }) => (
                    <Link
                      className="hover:underline"
                      href={href ?? ""}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </Link>
                  ),
                  p: ({ children }) => <>{children}</>,
                }}
              >
                {competition.venue}
              </ReactMarkdown>
            </div>
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
                  venue: stripMarkdownLinks(competition.venue),
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
