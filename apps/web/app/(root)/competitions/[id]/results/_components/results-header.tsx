"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { CompetitionLogo } from "@/components/competition-logo";

interface ResultsHeaderProps {
  competitionId: string;
  competitionName: string;
  competitionCity: string;
  defaultEventId: string;
  logo?: string | null;
}

export function ResultsHeader({
  competitionId,
  competitionName,
  competitionCity,
  defaultEventId,
  logo,
}: ResultsHeaderProps) {
  const pathname = usePathname() || "";

  const tabs = [
    {
      key: "podiums",
      href: `/competitions/${competitionId}/results/podiums`,
      path: `/competitions/${competitionId}/results/podiums`,
      label: "Podios",
    },
    {
      key: "all",
      href: `/competitions/${competitionId}/results/all?event=${defaultEventId}`,
      path: `/competitions/${competitionId}/results/all`,
      label: "Todos",
    },
    {
      key: "py_person",
      href: `/competitions/${competitionId}/results/py_person`,
      path: `/competitions/${competitionId}/results/py_person`,
      label: "Por persona",
    },
  ];

  const activeTab = tabs.find((tab) => pathname === tab.path)?.key;

  return (
    <Card className="border-primary/10 bg-muted/20">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <CompetitionLogo
              src={logo}
              alt={`Logo de ${competitionName}`}
              size={48}
              className="mt-0.5 rounded-md"
            />
            <div className="space-y-1">
              <CardTitle className="text-2xl">Resultados</CardTitle>
              <CardDescription>
                {competitionName}
                {competitionCity ? ` · ${competitionCity}` : ""}
              </CardDescription>
            </div>
          </div>
          <Link
            href={`/competitions/${competitionId}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ArrowLeft className="size-4" />
            Volver a la competencia
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Tabs value={activeTab} className="w-fit">
          <TabsList className="w-fit">
            {tabs.map((tab) => {
              return (
                <TabsTrigger key={tab.key} value={tab.key} asChild>
                  <Link href={tab.href}>{tab.label}</Link>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}
