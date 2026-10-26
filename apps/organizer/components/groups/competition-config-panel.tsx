"use client";

import { useMemo } from "react";
import type { WCIF } from "@/types/wcif";
import {
  type CompetitionConfig,
  getCompetitionConfig,
  setCompetitionConfig,
} from "@/lib/groups/config";
import { AssignmentRulesSection } from "./assignment-rules-section";
import { PrintingConfigSection } from "./printing-config-section";
import { StaffConfigSection } from "./staff-config-section";
import { StationsConfigSection } from "./stations-config-section";

export function CompetitionConfigPanel({
  wcif,
  competitionImageUrl,
  onApply,
}: {
  wcif: WCIF;
  competitionImageUrl?: string | null;
  onApply: (next: WCIF) => void;
}) {
  const config = useMemo(() => getCompetitionConfig(wcif), [wcif]);

  const updateConfig = (patch: Partial<CompetitionConfig>) => {
    onApply(setCompetitionConfig(wcif, { ...config, ...patch }));
  };

  return (
    <div className="space-y-8">
      <StationsConfigSection wcif={wcif} onApply={onApply} />
      <StaffConfigSection
        wcif={wcif}
        config={config}
        updateConfig={updateConfig}
        onApply={onApply}
      />
      <AssignmentRulesSection config={config} updateConfig={updateConfig} />
      <PrintingConfigSection
        config={config}
        updateConfig={updateConfig}
        competitionImageUrl={competitionImageUrl}
      />
    </div>
  );
}
