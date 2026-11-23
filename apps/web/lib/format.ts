export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
) {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      month: opts.month ?? "long",
      day: opts.day ?? "numeric",
      year: opts.year ?? "numeric",
      timeZone: opts.timeZone ?? "UTC",
      ...opts,
    }).format(new Date(date));
  } catch {
    return "";
  }
}

/**
 * Build a city/state line without duplicating state when city already includes it.
 *
 * WCA `cityName` is often `"Tepic, Nayarit"` while `stateName` is `"Nayarit"`,
 * or city and state match (`"Ciudad de México"`).
 */
export function formatCityState(
  cityName: string | null | undefined,
  stateName: string | null | undefined,
): string {
  const city = cityName?.trim() ?? "";
  const state = stateName?.trim() ?? "";
  if (!city && !state) return "";
  if (!state) return city;
  if (!city) return state;

  const cityKey = city.toLocaleLowerCase("es");
  const stateKey = state.toLocaleLowerCase("es");

  if (cityKey === stateKey) return city;
  if (cityKey.endsWith(`, ${stateKey}`)) return city;
  if (city.includes(",")) {
    const afterComma = city.slice(city.lastIndexOf(",") + 1).trim();
    if (afterComma.toLocaleLowerCase("es") === stateKey) return city;
  }

  return `${city}, ${state}`;
}
