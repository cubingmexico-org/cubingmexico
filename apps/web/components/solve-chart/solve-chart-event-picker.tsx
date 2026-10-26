import { cn } from "@workspace/ui/lib/utils";

type SolveChartEventPickerProps = {
  eventOptions: { eventId: string }[];
  selectedEventId: string;
  onEventSelect?: (eventId: string) => void;
};

export function SolveChartEventPicker({
  eventOptions,
  selectedEventId,
  onEventSelect,
}: SolveChartEventPickerProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 text-muted-foreground">
      {eventOptions.map((group) => (
        <button
          key={group.eventId}
          type="button"
          onClick={() => onEventSelect?.(group.eventId)}
          className={cn(
            `cubing-icon event-${group.eventId} text-3xl hover:text-primary/50 transition-colors`,
            selectedEventId === group.eventId && "text-primary",
          )}
        />
      ))}
    </div>
  );
}
