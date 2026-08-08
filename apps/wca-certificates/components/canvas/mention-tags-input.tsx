"use client";

import * as React from "react";
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputList,
} from "@workspace/ui/components/tags-input";
import { cn } from "@workspace/ui/lib/utils";

export const ALLOWED_MENTIONS = [
  "nombre",
  "wcaid",
  "rol",
  "id",
  "país",
  "estado",
  "team",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MENTION_PATTERN = new RegExp(
  `@(?:${ALLOWED_MENTIONS.map(escapeRegExp).join("|")})`,
  "gi",
);

export function parseContentTags(content: string): string[] {
  if (!content) return [];
  const tags: string[] = [];
  for (const match of content.match(MENTION_PATTERN) ?? []) {
    const name = match.slice(1);
    const canonical =
      ALLOWED_MENTIONS.find(
        (mention) => mention.toLowerCase() === name.toLowerCase(),
      ) ?? name;
    if (!tags.includes(canonical)) {
      tags.push(canonical);
    }
  }
  return tags;
}

/** Plain text with completed @mentions removed (chips own those). */
export function getFreeText(content: string): string {
  if (!content) return "";
  return content
    .replace(MENTION_PATTERN, "")
    .replace(/[^\S\n]{2,}/g, " ")
    .replace(/^\s/, "");
}

export function normalizeTags(tags: string[]): string[] {
  const normalized = tags
    .map((tag) => normalizeMentionTag(tag))
    .filter((tag): tag is string => tag !== null)
    .filter((tag, index, list) => list.indexOf(tag) === index);
  // One dynamic tag per text element
  return normalized.slice(0, 1);
}

export function tagsToContent(tags: string[]): string {
  return normalizeTags(tags)
    .map((tag) => `@${tag}`)
    .join(" ");
}

export function joinContent(freeText: string, tags: string[]): string {
  const tagPart = tagsToContent(tags);
  // Dynamic tags replace static text — never mix them
  if (tagPart) return tagPart;
  return freeText;
}

export function normalizeMentionTag(value: string): string | null {
  const name = value.replace(/^@/, "").trim();
  return (
    ALLOWED_MENTIONS.find(
      (mention) => mention.toLowerCase() === name.toLowerCase(),
    ) ?? null
  );
}

interface MentionTagsInputProps {
  content: string;
  onContentChange: (content: string) => void;
  id?: string;
  className?: string;
}

export function MentionTagsInput({
  content,
  onContentChange,
  id,
  className,
}: MentionTagsInputProps) {
  const tags = normalizeTags(parseContentTags(content));
  const freeText = tags.length > 0 ? "" : getFreeText(content);
  const hasTags = tags.length > 0;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const [showReplacedNotice, setShowReplacedNotice] = React.useState(false);

  const availableMentions = ALLOWED_MENTIONS.filter(
    (mention) => !tags.includes(mention),
  );

  const filteredMentions = availableMentions.filter((mention) =>
    query ? mention.toLowerCase().includes(query.toLowerCase()) : true,
  );

  const inputValue = freeText;

  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [query, open, content]);

  // If content somehow still has free text mixed with tags, normalize once
  React.useEffect(() => {
    const currentTags = parseContentTags(content);
    if (currentTags.length === 0) return;
    const normalized = tagsToContent(currentTags);
    if (content !== normalized) {
      onContentChange(normalized);
    }
    // Only react to content changes; parent callback identity may change each render
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [content]);

  const closeMentionMenu = () => {
    setOpen(false);
    setQuery("");
  };

  const commitTags = (
    nextTags: string[],
    opts?: { replacedText?: boolean },
  ) => {
    if (opts?.replacedText) {
      setShowReplacedNotice(true);
    }
    onContentChange(tagsToContent(nextTags));
    closeMentionMenu();
  };

  const addTag = (name: string) => {
    if (hasTags) return;
    const canonical = normalizeMentionTag(name);
    if (!canonical) return;

    const replacedText = getFreeText(content).trim().length > 0;
    commitTags([canonical], { replacedText });
  };

  const syncMentionMenu = (value: string) => {
    if (hasTags) {
      closeMentionMenu();
      return;
    }

    const atIndex = value.lastIndexOf("@");
    if (atIndex === -1) {
      closeMentionMenu();
      return;
    }

    const afterAt = value.slice(atIndex + 1);
    if (/\s/.test(afterAt)) {
      closeMentionMenu();
      return;
    }

    setQuery(afterAt);
    setOpen(availableMentions.length > 0);
  };

  return (
    <div className={cn("relative w-full space-y-1.5", className)}>
      <TagsInput
        className="w-full"
        value={tags}
        max={1}
        onValidate={(value) => {
          if (hasTags) return false;
          return normalizeMentionTag(value) !== null;
        }}
        onValueChange={(rawTags) => {
          const nextTags = normalizeTags(rawTags);
          if (nextTags.length > tags.length) {
            const replacedText = getFreeText(content).trim().length > 0;
            commitTags(nextTags, { replacedText });
          } else {
            onContentChange(tagsToContent(nextTags));
            closeMentionMenu();
            if (nextTags.length === 0) {
              setShowReplacedNotice(false);
            }
          }
        }}
        displayValue={(value) => `@${value.replace(/^@/, "")}`}
      >
        <TagsInputList>
          {tags.map((tag) => (
            <TagsInputItem
              key={tag}
              value={tag}
              className="border-transparent bg-blue-200 text-blue-950 dark:bg-blue-800 dark:text-blue-50"
            >
              @{tag}
            </TagsInputItem>
          ))}
          {!hasTags ? (
            <TagsInputInput
              ref={inputRef}
              id={id}
              value={inputValue}
              placeholder="Escribe texto o @ para un dato dinámico..."
              onChange={(event) => {
                const value = event.target.value;
                syncMentionMenu(value);
                onContentChange(value);
              }}
              onBlur={() => {
                window.setTimeout(() => setOpen(false), 150);
              }}
              onKeyDown={(event) => {
                if (!open || filteredMentions.length === 0) return;

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlightedIndex(
                    (index) => (index + 1) % filteredMentions.length,
                  );
                  return;
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightedIndex(
                    (index) =>
                      (index - 1 + filteredMentions.length) %
                      filteredMentions.length,
                  );
                  return;
                }

                if (event.key === "Enter") {
                  const mention = filteredMentions[highlightedIndex];
                  if (!mention) return;
                  event.preventDefault();
                  event.stopPropagation();
                  addTag(mention);
                  return;
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                }
              }}
            />
          ) : null}
        </TagsInputList>
      </TagsInput>

      {showReplacedNotice && hasTags ? (
        <p className="text-[11px] leading-snug text-amber-700 dark:text-amber-400">
          El texto fijo se reemplazó por el dato dinámico. Solo se permite una
          etiqueta; quítala si quieres escribir texto libre u otro dato.
        </p>
      ) : hasTags ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Solo se permite un dato dinámico por texto. Quita la etiqueta para
          escribir texto libre o elegir otro dato.
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Puedes escribir texto libre, o <span className="font-medium">@</span>{" "}
          para insertar un dato dinámico (esto reemplazará el texto). Solo uno
          por cuadro.
        </p>
      )}

      {open && filteredMentions.length > 0 ? (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {filteredMentions.map((mention, index) => (
            <button
              key={mention}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              className={cn(
                "flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden",
                index === highlightedIndex &&
                  "bg-accent text-accent-foreground",
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                addTag(mention);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              @{mention}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
