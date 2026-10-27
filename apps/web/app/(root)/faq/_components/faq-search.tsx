"use client";

import { useState, type ReactNode } from "react";
import { HelpCircle, Search } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import { normalizeSearchText } from "@/lib/search";
import { FaqAccordion } from "./faq-accordion";
import type { FaqItem } from "./faq-data";

/** Search over every question; `children` (the tabbed FAQ) stays mounted but hidden while searching. */
export function FaqSearch({
  questions,
  categoryCount,
  footer,
  children,
}: {
  questions: FaqItem[];
  categoryCount: number;
  footer: ReactNode;
  children: ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const q = normalizeSearchText(searchQuery);
  const filteredQuestions = searchQuery
    ? questions.filter(
        (item) =>
          normalizeSearchText(item.question).includes(q) ||
          normalizeSearchText(item.answer).includes(q),
      )
    : [];

  return (
    <>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
        <Input
          placeholder="Buscar preguntas..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div hidden={!!searchQuery}>{children}</div>
      {searchQuery &&
        (filteredQuestions.length > 0 ? (
          <FaqAccordion items={filteredQuestions} />
        ) : (
          <div className="text-center py-12">
            <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-semibold">
              No se encontraron resultados
            </h3>
            <p className="mt-2 text-muted-foreground">
              No hay preguntas que coincidan con tu búsqueda. Intenta con otros
              términos.
            </p>
          </div>
        ))}

      {footer}

      <div className="mt-8 text-center text-sm text-muted-foreground">
        {!searchQuery && (
          <p>
            Actualmente mostrando {questions.length} preguntas frecuentes en{" "}
            {categoryCount} categorías.
          </p>
        )}
        <p className="mt-1">
          Última actualización:{" "}
          {new Date("2025-08-30T00:00:00").toLocaleDateString()}
        </p>
      </div>
    </>
  );
}
