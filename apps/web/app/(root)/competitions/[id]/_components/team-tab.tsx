import type { Competition } from "@/types/wca";
import { StaffCard } from "./staff-card";

export function TeamTab({ competition }: { competition: Competition }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <StaffCard
        title="Delegados"
        description="Delegados de la WCA que supervisan esta competencia"
        members={competition.delegates}
      />
      <StaffCard
        title="Organizadores"
        description="Equipo organizador de esta competencia"
        members={competition.organizers}
      />
    </div>
  );
}
