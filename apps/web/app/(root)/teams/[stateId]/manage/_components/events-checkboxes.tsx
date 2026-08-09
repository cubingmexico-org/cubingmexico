"use client";

import { useState } from "react";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { eventNames } from "@/lib/constants";

const events = Object.keys(eventNames);

export function EventsCheckboxes({
  defaultValue,
}: {
  defaultValue?: string[];
}) {
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    defaultValue || [],
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Especialidades</h4>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          name="specialties"
          hidden
          value={selectedEvents}
          readOnly
        />
        {events.map((eventId) => (
          <div key={eventId} className="flex items-center space-x-2">
            <Checkbox
              id={`event-${eventId}`}
              checked={
                selectedEvents.filter((event) => event === eventId).length > 0
              }
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedEvents((prev) => {
                    if (prev.includes(eventId)) {
                      return prev;
                    }
                    return [...prev, eventId];
                  });
                } else {
                  setSelectedEvents((prev) =>
                    prev.filter((event) => event !== eventId),
                  );
                }
              }}
            />
            <Label
              htmlFor={`event-${eventId}`}
              className="flex gap-1 items-center"
            >
              <span className={`cubing-icon event-${eventId}`} />{" "}
              <p className="text-xs">{eventNames[eventId] || eventId}</p>
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
