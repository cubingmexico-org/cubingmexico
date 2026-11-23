import Link from "next/link";
import { ExternalLink, Radio } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import type { LiveCompetitionMeta } from "@/lib/live/types";

export function WcaLiveUnsupported({
  competition,
  officialLiveUrl,
}: {
  competition: LiveCompetitionMeta;
  officialLiveUrl: string;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Radio className="size-3.5 text-muted-foreground" />
          Resultados en vivo
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {competition.name}
        </h1>
        {(competition.venue || competition.city) && (
          <p className="text-muted-foreground">
            {competition.venue ? (
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
            ) : null}
            {competition.venue && competition.city ? " · " : null}
            {competition.city}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Esta competencia usa WCA Live</CardTitle>
          <CardDescription>
            Cubing México solo muestra resultados en vivo cuando la captura se
            hace con el sistema integrado de la WCA (ILR). Esta competencia está
            usando WCA Live clásico, que la WCA planea dejar de usar en 2027.
            Mientras tanto, sigue los resultados en la fuente oficial.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href={officialLiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants())}
          >
            <ExternalLink />
            Abrir en WCA Live
          </Link>
          <Link
            href="/live"
            prefetch={false}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Todas en vivo
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
