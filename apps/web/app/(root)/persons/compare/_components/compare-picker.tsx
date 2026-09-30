"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  PersonSearchSelect,
  type SelectedPerson,
} from "@/components/person-search-select";

function buildCompareHref(a: string | null, b: string | null) {
  const params = new URLSearchParams();
  if (a) params.set("a", a);
  if (b) params.set("b", b);
  const query = params.toString();
  return query ? `/persons/compare?${query}` : "/persons/compare";
}

export function ComparePicker({
  a,
  b,
}: {
  a: SelectedPerson;
  b: SelectedPerson;
}) {
  const router = useRouter();
  const aId = a?.wcaId ?? null;
  const bId = b?.wcaId ?? null;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-8">
      <PersonSearchSelect
        value={a}
        placeholder="Primer competidor"
        onSelect={(wcaId) => router.replace(buildCompareHref(wcaId, bId))}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Intercambiar competidores"
        disabled={!aId && !bId}
        onClick={() => router.replace(buildCompareHref(bId, aId))}
      >
        <ArrowLeftRight className="size-4" />
      </Button>
      <PersonSearchSelect
        value={b}
        placeholder="Segundo competidor"
        onSelect={(wcaId) => router.replace(buildCompareHref(aId, wcaId))}
      />
    </div>
  );
}
