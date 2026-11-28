type GroupLocationMapProps = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  label?: string | null;
};

/** Google Maps embed centered on the store pin (no API key required). */
export function GroupLocationMap({
  latitude,
  longitude,
  label,
}: GroupLocationMapProps) {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const src = `https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;

  return (
    <div className="overflow-hidden rounded-lg border">
      <iframe
        title={label ? `Mapa de ${label}` : "Mapa de ubicación"}
        src={src}
        className="aspect-video w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
