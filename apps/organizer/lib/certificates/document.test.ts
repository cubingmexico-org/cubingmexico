import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import type { Competition } from "@/types/wca";
import {
  buildParticipantCertificatesDocument,
  buildPodiumCertificatesDocument,
  createCertificateRenderers,
} from "./document";

const competition = {
  id: "PrintablesOpen2025",
  name: "Printables Open 2025",
  city: "Ciudad de México",
  delegates: [{ name: "Delia Delegada" }],
  organizers: [{ name: "Óscar Organizador" }, { name: "Olga Organizadora" }],
} as unknown as Competition;

const startDate = new Date("2025-03-15T12:00:00Z");
const endDate = new Date("2025-03-16T12:00:00Z");

const bold = [{ type: "bold" }];
const big = [
  { type: "textStyle", attrs: { fontSize: "24pt", transform: "uppercase" } },
];

const mention = (id: string, marks: JSONContent["marks"] = []) => ({
  type: "mention",
  attrs: { id },
  marks,
});

const podiumTemplate: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1, textAlign: "center" },
      content: [mention("Competidor", big)],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        { type: "text", text: "Obtuvo el " },
        mention("Posición (ordinal con texto)", bold),
        { type: "text", text: " lugar en " },
        mention("Evento"),
        { type: "text", text: " con un " },
        mention("Tipo de resultado"),
        { type: "text", text: " de " },
        mention("Resultado", bold),
      ],
    },
    { type: "paragraph" },
    {
      type: "paragraph",
      attrs: { textAlign: "right" },
      content: [
        mention("Competencia"),
        { type: "text", text: ", " },
        mention("Ciudad"),
        { type: "text", text: ", " },
        mention("Fecha"),
        { type: "text", text: ". Delegados: " },
        mention("Delegados"),
        { type: "text", text: ". Organizadores: " },
        mention("Organizadores"),
      ],
    },
  ],
};

const participantTemplate: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        { type: "text", text: "Constancia para " },
        mention("Competidor", bold),
      ],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Evento" }],
                },
              ],
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Resultado" }],
                },
              ],
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Posición" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                { type: "paragraph", content: [mention("Evento (tabla)")] },
              ],
            },
            {
              type: "tableCell",
              content: [
                { type: "paragraph", content: [mention("Resultado (tabla)")] },
              ],
            },
            {
              type: "tableCell",
              content: [
                { type: "paragraph", content: [mention("Posición (tabla)")] },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const page = {
  background: undefined,
  pageMargins: [40, 40, 40, 40] as [number, number, number, number],
  pageOrientation: "landscape" as const,
  pageSize: "LETTER" as const,
};

describe("certificate documents", () => {
  const renderers = createCertificateRenderers(competition, startDate, endDate);

  it("fills podium certificates, one page each", () => {
    const doc = buildPodiumCertificatesDocument({
      competition,
      selectedPodiums: [
        { name: "Ana López", place: 1, event: "333", result: 845 },
        { name: "Carla Núñez", place: 2, event: "333bf", result: 6123 },
      ],
      content: podiumTemplate,
      renderDocumentContent: renderers.renderDocumentContent,
      ...page,
    });

    const pages = doc.content as { pageBreak: string }[];
    expect(pages.map((p) => p.pageBreak)).toEqual(["after", ""]);
    expect(doc).toMatchSnapshot();
  });

  it("fills participation certificates with a results table", () => {
    const doc = buildParticipantCertificatesDocument({
      competition,
      selectedParticipants: [
        {
          name: "Beto Martínez",
          wcaId: "2016MART02",
          registrantId: 2,
          results: [
            { event: "333", average: 1532, ranking: 3 },
            { event: "333bf", average: -1, ranking: null },
          ],
        },
      ],
      participantsContent: participantTemplate,
      renderParticipantDocumentContent:
        renderers.renderParticipantDocumentContent,
      ...page,
    });

    expect(doc).toMatchSnapshot();
  });

  it("draws the background on every page when there is one", () => {
    const doc = buildPodiumCertificatesDocument({
      competition,
      selectedPodiums: [{ name: "Ana", place: 1, event: "333", result: 845 }],
      content: podiumTemplate,
      renderDocumentContent: renderers.renderDocumentContent,
      ...page,
      background: "data:image/png;base64,AAAA",
    });

    const background = doc.background as (
      page: number,
      size: { width: number; height: number },
    ) => unknown;
    expect(background(1, { width: 792, height: 612 })).toEqual({
      image: "data:image/png;base64,AAAA",
      width: 792,
      height: 612,
    });
  });
});
