import { CompetitionCard } from "@/components/competition-card";
import type { Competition } from "@/types/wca";

const emptyStateConfig = {
  upcoming: {
    icon: "📅",
    title: "No hay competencias próximas",
    description: "No tienes competencias próximas programadas en este momento.",
  },
  ongoing: {
    icon: "🎯",
    title: "No hay competencias en curso",
    description: "No hay competencias activas en este momento.",
  },
  past: {
    icon: "📚",
    title: "No hay competencias pasadas",
    description: "No tienes historial de competencias gestionadas.",
  },
};

export function CompetitionList({
  competitions,
  status,
  logoById,
}: {
  competitions: Competition[];
  status: "upcoming" | "ongoing" | "past";
  logoById?: Map<string, string | null>;
}) {
  if (!competitions.length) {
    const config = emptyStateConfig[status];
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-4xl">
          {config.icon}
        </div>
        <h3 className="text-xl font-semibold">{config.title}</h3>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          {config.description}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {competitions.map((competition) => (
        <CompetitionCard
          key={competition.id}
          competition={competition}
          status={status}
          logoUrl={logoById?.get(competition.id) ?? null}
        />
      ))}
    </div>
  );
}
