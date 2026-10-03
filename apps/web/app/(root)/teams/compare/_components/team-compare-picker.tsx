"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export type TeamOption = {
  id: string;
  name: string;
  image: string | null;
};

function buildCompareHref(a: string | null, b: string | null) {
  const params = new URLSearchParams();
  if (a) params.set("a", a);
  if (b) params.set("b", b);
  const query = params.toString();
  return query ? `/teams/compare?${query}` : "/teams/compare";
}

function TeamSelect({
  teams,
  value,
  placeholder,
  onSelect,
}: {
  teams: TeamOption[];
  value: string | null;
  placeholder: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Select value={value ?? ""} onValueChange={onSelect}>
      <SelectTrigger className="w-full h-10!">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- external UploadThing URL
              <img
                src={team.image}
                alt=""
                width={16}
                height={16}
                className="size-4 rounded-sm object-cover"
              />
            ) : null}
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TeamComparePicker({
  teams,
  a,
  b,
}: {
  teams: TeamOption[];
  a: string | null;
  b: string | null;
}) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-8">
      <TeamSelect
        teams={teams}
        value={a}
        placeholder="Primer team"
        onSelect={(id) => router.replace(buildCompareHref(id, b))}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Intercambiar teams"
        disabled={!a && !b}
        onClick={() => router.replace(buildCompareHref(b, a))}
      >
        <ArrowLeftRight className="size-4" />
      </Button>
      <TeamSelect
        teams={teams}
        value={b}
        placeholder="Segundo team"
        onSelect={(id) => router.replace(buildCompareHref(a, id))}
      />
    </div>
  );
}
