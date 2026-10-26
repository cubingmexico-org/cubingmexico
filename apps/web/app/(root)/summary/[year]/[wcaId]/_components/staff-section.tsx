import Link from "next/link";
import { Stat } from "../../../_components/summary-stat";
import type { AnnualSummary } from "../_lib/queries";

type Staff = AnnualSummary["staff"];

function StaffCompetitionList({
  title,
  competitions,
}: {
  title: string;
  competitions: Staff["organized"];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="list-disc list-inside text-sm space-y-1">
        {competitions.map((comp) => (
          <li key={comp.id}>
            <Link
              prefetch={false}
              href={`/competitions/${comp.id}`}
              className="text-link hover:text-link/80"
            >
              {comp.name}
            </Link>
            {comp.stateName || comp.cityName
              ? ` — ${[comp.cityName, comp.stateName].filter(Boolean).join(", ")}`
              : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StaffSection({
  pronoun,
  staff,
}: {
  pronoun: string;
  staff: Staff;
}) {
  const staffTotal = staff.organized.length + staff.delegated.length;

  if (staffTotal <= 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Organización</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        {pronoun} organizó <Stat>{staff.organized.length}</Stat>{" "}
        {staff.organized.length === 1 ? "competencia" : "competencias"} y delegó{" "}
        <Stat>{staff.delegated.length}</Stat>.
      </p>
      {staff.organized.length > 0 && (
        <StaffCompetitionList
          title="Organizadas"
          competitions={staff.organized}
        />
      )}
      {staff.delegated.length > 0 && (
        <StaffCompetitionList
          title="Delegadas"
          competitions={staff.delegated}
        />
      )}
    </section>
  );
}
