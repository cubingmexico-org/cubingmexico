"use client";

import { parseAsBoolean, useQueryState } from "nuqs";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { brandMarkSrc } from "@/lib/brand-image";
import {
  buildCollectiveCompareHref,
  parseCollectiveRef,
  serializeCollectiveRef,
  type CollectiveKind,
  type CollectiveRef,
} from "@/lib/collective-compare";

export type CollectiveOption = {
  ref: CollectiveRef;
  name: string;
  image: string | null;
  icon: string | null;
};

const GROUP_ORDER: CollectiveKind[] = ["team", "community", "sponsor"];

const GROUP_LABELS: Record<CollectiveKind, string> = {
  team: "Teams",
  community: "Comunidades",
  sponsor: "Patrocinadores",
};

function CollectiveSelect({
  options,
  value,
  placeholder,
  onSelect,
}: {
  options: CollectiveOption[];
  value: CollectiveRef | null;
  placeholder: string;
  onSelect: (ref: CollectiveRef) => void;
}) {
  const grouped = GROUP_ORDER.map((kind) => ({
    kind,
    items: options.filter((option) => option.ref.kind === kind),
  })).filter((group) => group.items.length > 0);

  return (
    <Select
      value={value ? serializeCollectiveRef(value) : ""}
      onValueChange={(next) => {
        const parsed = parseCollectiveRef(next);
        if (parsed) onSelect(parsed);
      }}
    >
      <SelectTrigger className="w-full h-10!">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {grouped.map((group) => (
          <SelectGroup key={group.kind}>
            <SelectLabel>{GROUP_LABELS[group.kind]}</SelectLabel>
            {group.items.map((option) => {
              const mark = brandMarkSrc(option.icon, option.image);
              const itemValue = serializeCollectiveRef(option.ref);
              return (
                <SelectItem key={itemValue} value={itemValue}>
                  {mark ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external UploadThing URL
                    <img
                      src={mark}
                      alt=""
                      width={16}
                      height={16}
                      className="size-4 object-contain"
                    />
                  ) : null}
                  {option.name}
                </SelectItem>
              );
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TeamComparePicker({
  options,
  a,
  b,
}: {
  options: CollectiveOption[];
  a: CollectiveRef | null;
  b: CollectiveRef | null;
}) {
  const router = useRouter();
  const [deprecated] = useQueryState(
    "deprecated",
    parseAsBoolean.withDefault(false),
  );

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-8">
      <CollectiveSelect
        options={options}
        value={a}
        placeholder="Primer colectivo"
        onSelect={(ref) =>
          router.replace(buildCollectiveCompareHref(ref, b, deprecated))
        }
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Intercambiar colectivos"
        disabled={!a && !b}
        onClick={() =>
          router.replace(buildCollectiveCompareHref(b, a, deprecated))
        }
      >
        <ArrowLeftRight className="size-4" />
      </Button>
      <CollectiveSelect
        options={options}
        value={b}
        placeholder="Segundo colectivo"
        onSelect={(ref) =>
          router.replace(buildCollectiveCompareHref(a, ref, deprecated))
        }
      />
    </div>
  );
}
