import { CountryLabel } from "@/components/country-flag";
import { StateLabel } from "@/components/state-flag";
import { resolveStateId } from "@/lib/state-flags";

/** MX state flag + name when known; otherwise country flag + ISO2. */
export function LiveRegion({
  countryIso2,
  stateId,
  stateName,
  size = 14,
  nameClassName = "text-sm text-muted-foreground",
}: {
  countryIso2?: string | null;
  stateId?: string | null;
  stateName?: string | null;
  size?: number;
  nameClassName?: string;
}) {
  const iso2 = countryIso2?.trim().toUpperCase() ?? "";
  const hasMxState =
    iso2 === "MX" && Boolean(resolveStateId({ stateId, stateName }));

  if (hasMxState) {
    return (
      <StateLabel
        stateId={stateId}
        stateName={stateName}
        size={size}
        nameClassName={nameClassName}
      />
    );
  }

  if (iso2) {
    return (
      <CountryLabel iso2={iso2} size={size} nameClassName={nameClassName} />
    );
  }

  return <span className={nameClassName}>—</span>;
}
