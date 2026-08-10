"use client";

import * as React from "react";
import { format } from "date-fns";
import { es as esDateFns } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { es } from "react-day-picker/locale";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { formatAsOfParam, parseAsOfDate } from "@/lib/as-of-date";

interface AsOfDatePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  triggerClassName?: string;
}

export function AsOfDatePicker({
  className,
  triggerClassName,
  ...props
}: AsOfDatePickerProps) {
  const [queryState, setQueryState] = useQueryStates(
    {
      asOf: parseAsString.withDefault(""),
    },
    {
      clearOnDefault: true,
      shallow: false,
    },
  );

  const selectedDate = React.useMemo(() => {
    const parsed = parseAsOfDate(queryState.asOf);
    if (!parsed) return undefined;
    // Calendar selection uses local calendar days; rebuild from parts.
    const [y, m, d] = queryState.asOf.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  }, [queryState.asOf]);

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <span className="font-semibold text-sm">Hasta</span>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start gap-2 truncate text-left font-normal",
                !selectedDate && "text-muted-foreground",
                triggerClassName,
              )}
            >
              <CalendarIcon className="size-4 shrink-0" />
              {selectedDate ? (
                format(selectedDate, "d MMM yyyy", { locale: esDateFns })
              ) : (
                <span>Sin límite</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              defaultMonth={selectedDate}
              onSelect={(date) => {
                void setQueryState({
                  asOf: date ? formatAsOfParam(date) : "",
                });
              }}
              disabled={{ after: new Date() }}
              locale={es}
              initialFocus
              captionLayout="dropdown"
            />
          </PopoverContent>
        </Popover>
        {selectedDate ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Quitar filtro de fecha"
            onClick={() => void setQueryState({ asOf: "" })}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
