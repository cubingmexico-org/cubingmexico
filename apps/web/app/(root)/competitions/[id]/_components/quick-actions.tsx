import Link from "next/link";
import { CalendarDays, ExternalLink, Mail } from "lucide-react";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import type { Competition } from "@/types/wca";
import { extractEmail } from "../_lib/format";

export function QuickActions({ competition }: { competition: Competition }) {
  return (
    <Card className="bg-accent/50">
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Link
          href="/competitions"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <CalendarDays />
          Todas las Competencias
        </Link>
        <Link
          href={competition.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ExternalLink />
          Ver en WCA
        </Link>
        <Link
          href={`mailto:${extractEmail(competition.contact) ?? ""}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Mail />
          Contactar Organizadores
        </Link>
      </CardContent>
    </Card>
  );
}
