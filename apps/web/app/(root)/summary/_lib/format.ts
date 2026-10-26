export function formatSummaryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

export function teamInitials(name: string, fallback: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 3) || fallback
  );
}

export function championshipLabel(type: string): string {
  switch (type) {
    case "MX":
      return "Nacional";
    case "_North America":
      return "NAC";
    case "world":
      return "Mundial";
    default:
      return type;
  }
}
