"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Label } from "@workspace/ui/components/label";
import { StateFlag } from "@/components/state-flag";

type StateOption = { id: string; name: string };

export function StateFilter({
  states,
  selectedStateId,
}: {
  states: StateOption[];
  selectedStateId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="space-y-2">
      <Label>Estado para roles</Label>
      <Select
        value={selectedStateId ?? undefined}
        onValueChange={(value) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("stateId", value);
          router.push(`/admin/people?${params.toString()}`);
        }}
      >
        <SelectTrigger className="w-full max-w-sm">
          <SelectValue placeholder="Selecciona un estado" />
        </SelectTrigger>
        <SelectContent>
          {states.map((state) => (
            <SelectItem key={state.id} value={state.id}>
              <span className="inline-flex items-center gap-1.5">
                <StateFlag stateId={state.id} />
                {state.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
