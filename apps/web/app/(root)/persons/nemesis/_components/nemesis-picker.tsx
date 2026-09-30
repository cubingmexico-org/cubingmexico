"use client";

import { useRouter } from "next/navigation";
import {
  PersonSearchSelect,
  type SelectedPerson,
} from "@/components/person-search-select";

export function NemesisPicker({ value }: { value: SelectedPerson }) {
  const router = useRouter();

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <PersonSearchSelect
        value={value}
        placeholder="Busca un competidor"
        onSelect={(wcaId) =>
          router.replace(`/persons/nemesis?id=${encodeURIComponent(wcaId)}`)
        }
      />
    </div>
  );
}
