import { cn } from "@workspace/ui/lib/utils";
import { ccIconClass } from "@/lib/cubing-contests";

/** The event's icon, or a short text badge when `@cubing/icons` has none. */
export function CcEventIcon({
  eventId,
  eventName,
  className,
}: {
  eventId: string;
  eventName: string;
  /** Applied to the icon only (e.g. its `text-*` size). */
  className?: string;
}) {
  const iconClass = ccIconClass(eventId);
  if (iconClass) {
    return (
      <span
        className={cn(iconClass, className)}
        title={eventName}
        aria-label={eventName}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center rounded border px-1.5 text-xs font-medium leading-5"
      title={eventName}
    >
      {eventName}
    </span>
  );
}
