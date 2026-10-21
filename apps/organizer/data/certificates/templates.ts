import type { JSONContent } from "@tiptap/react";
import type { PageOrientation } from "pdfmake/interfaces";
import type { SavedDocumentFile } from "@/components/editor/saved-document";
import { participationDefault } from "./participation";
import { participationSimple } from "./participation-simple";
import { podiumDefault } from "./podium";
export type CertificateDesignTemplate = {
  /** Stable UUID used as the `designs` row id. Never change or reuse one. */
  id: string;
  name: string;
  module: "certificate_podium" | "certificate_participation";
  document: SavedDocumentFile;
};

const isBlankParagraph = (node: JSONContent): boolean =>
  node.type === "paragraph" && !node.content?.length;

const withLeadingBlankLines = (
  content: JSONContent,
  count: number,
): JSONContent => {
  const nodes = content.content ?? [];
  const firstFilled = nodes.findIndex((node) => !isBlankParagraph(node));
  return {
    ...content,
    content: [
      ...Array.from({ length: count }, () => ({
        type: "paragraph",
        attrs: { textAlign: "center" },
      })),
      ...nodes.slice(firstFilled === -1 ? nodes.length : firstFilled),
    ],
  };
};

const withOrientation = (
  base: SavedDocumentFile,
  pageOrientation: PageOrientation,
  leadingBlankLines: number,
): SavedDocumentFile => ({
  content: withLeadingBlankLines(base.content, leadingBlankLines),
  pageConfig: { ...base.pageConfig, pageOrientation },
});

/** Replaces the "@Delegados ... @Organizadores ..." opening with a line that names nobody. */
const withGenericOpening = (base: SavedDocumentFile): SavedDocumentFile => ({
  ...base,
  content: {
    ...base.content,
    content: base.content.content?.map((node) => {
      const isOpening = node.content?.some(
        (child) => child.type === "mention" && child.attrs?.id === "Delegados",
      );
      if (!isOpening) {
        return node;
      }
      const marks = node.content?.find((child) => child.type === "text")?.marks;
      return {
        ...node,
        content: [
          {
            type: "text",
            marks,
            text: "La World Cube Association y el equipo organizador otorgan el presente",
          },
        ],
      };
    }),
  },
});

/** Built-in templates shown under "Plantillas", upserted by ensureGlobalDesignTemplates. */
export const CERTIFICATE_DESIGN_TEMPLATES: CertificateDesignTemplate[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Certificado de podio (Cubing México)",
    module: "certificate_podium",
    document: podiumDefault,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Certificado de podio vertical (Cubing México)",
    module: "certificate_podium",
    document: withOrientation(podiumDefault, "portrait", 14),
  },
  {
    id: "00000000-0000-4000-8000-000000000007",
    name: "Certificado de podio, sin nombres de delegados (Cubing México)",
    module: "certificate_podium",
    document: withGenericOpening(podiumDefault),
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Certificado de participación (Cubing México)",
    module: "certificate_participation",
    document: participationDefault,
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "Certificado de participación sin resultados (Cubing México)",
    module: "certificate_participation",
    document: participationSimple,
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    name: "Certificado de participación horizontal (Cubing México)",
    module: "certificate_participation",
    document: withOrientation(participationDefault, "landscape", 2),
  },
  {
    id: "00000000-0000-4000-8000-000000000008",
    name: "Certificado de participación, sin nombres de delegados (Cubing México)",
    module: "certificate_participation",
    document: withGenericOpening(participationDefault),
  },
];

/** What the editor loads first and resets to. */
export const DEFAULT_TEMPLATES: Record<
  "podium" | "participation",
  SavedDocumentFile
> = {
  podium: podiumDefault,
  participation: participationDefault,
};
