import { Competition } from "@/types/wca";
import {
  formatDates,
  formatEvents,
  formatPlace,
  formatResults,
  formatResultType,
  joinPersons,
  transformString,
} from "@/lib/utils";
import type { ParticipantData, PodiumData } from "@/types/wcif";
import { JSONContent } from "@tiptap/react";
import {
  Margins,
  PageOrientation,
  PageSize,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import { fontDeclarations } from "@/lib/fonts";
import * as pdfMake from "pdfmake/build/pdfmake";
import { toast } from "sonner";

export function createCertificateRenderers(
  competition: Competition,
  startDate: Date,
  endDate: Date,
) {
  const renderTextContent = (
    content: JSONContent["content"],
    data: PodiumData,
  ) => {
    return content
      ?.map((contentItem) => {
        const bold = contentItem.marks?.some((mark) => mark.type === "bold");
        const font =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.fontFamily || "Roboto";
        const fontSize =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.fontSize || "12pt";
        const color =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.color || "#000000";
        const transform =
          (contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.transform as
            | "lowercase"
            | "capitalize"
            | "uppercase"
            | "none"
            | undefined) || "none";

        const textObject = (text: string | undefined) => ({
          text,
          bold,
          font,
          fontSize: parseInt(fontSize as string) * 1.039,
          color,
        });

        switch (contentItem.type) {
          case "text":
            return textObject(
              transformString(contentItem.text || "", transform),
            );
          case "mention":
            switch (contentItem.attrs?.id) {
              case "Delegados":
                return textObject(
                  transformString(
                    joinPersons(competition.delegates.flatMap((d) => d.name)),
                    transform,
                  ),
                );
              case "Organizadores":
                return textObject(
                  transformString(
                    joinPersons(competition.organizers.flatMap((o) => o.name)),
                    transform,
                  ),
                );
              case "Posición (cardinal)":
                return textObject(
                  transformString(
                    formatPlace(data.place, "cardinal"),
                    transform,
                  ),
                );
              case "Posición (ordinal)":
                return textObject(
                  transformString(
                    formatPlace(data.place, "ordinal"),
                    transform,
                  ),
                );
              case "Posición (ordinal con texto)":
                return textObject(
                  transformString(
                    formatPlace(data.place, "ordinal_text"),
                    transform,
                  ),
                );
              case "Medalla":
                return textObject(
                  transformString(formatPlace(data.place, "medal"), transform),
                );
              case "Competidor":
                return textObject(transformString(data.name, transform));
              case "Evento":
                return textObject(
                  transformString(formatEvents(data.event), transform),
                );
              case "Resultado":
                return textObject(
                  transformString(
                    formatResults(data.result, data.event),
                    transform,
                  ),
                );
              case "Tipo de resultado":
                return textObject(
                  transformString(formatResultType(data.event), transform),
                );
              case "Competencia":
                return textObject(transformString(competition.name, transform));
              case "Fecha":
                return textObject(
                  transformString(formatDates(startDate, endDate), transform),
                );
              case "Ciudad":
                return textObject(transformString(competition.city, transform));
              default:
                return null;
            }
          default:
            return null;
        }
      })
      .filter(Boolean);
  };

  const renderParticipantTextContent = (
    content: JSONContent["content"],
    data: ParticipantData,
  ) => {
    return content
      ?.map((contentItem) => {
        const bold = contentItem.marks?.some((mark) => mark.type === "bold");
        const font =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.fontFamily || "Roboto";
        const fontSize =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.fontSize || "12pt";
        const color =
          contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.color || "#000000";
        const transform =
          (contentItem.marks?.find((mark) => mark.type === "textStyle")?.attrs
            ?.transform as
            | "lowercase"
            | "capitalize"
            | "uppercase"
            | "none"
            | undefined) || "none";

        const textObject = (text: string | undefined) => ({
          text,
          bold,
          font,
          fontSize: parseInt(fontSize as string) * 1.039,
          color,
        });

        switch (contentItem.type) {
          case "text":
            return textObject(
              transformString(contentItem.text || "", transform),
            );
          case "mention":
            switch (contentItem.attrs?.id) {
              case "Delegados":
                return textObject(
                  transformString(
                    joinPersons(competition.delegates.flatMap((d) => d.name)),
                    transform,
                  ),
                );
              case "Organizadores":
                return textObject(
                  transformString(
                    joinPersons(competition.organizers.flatMap((o) => o.name)),
                    transform,
                  ),
                );
              case "Competidor":
                return textObject(transformString(data.name, transform));
              case "Competencia":
                return textObject(transformString(competition.name, transform));
              case "Fecha":
                return textObject(
                  transformString(formatDates(startDate, endDate), transform),
                );
              case "Ciudad":
                return textObject(transformString(competition.city, transform));
              default:
                return null;
            }
          default:
            return null;
        }
      })
      .filter(Boolean);
  };

  const renderDocumentContent = (content: JSONContent, data: PodiumData) => {
    return content.content
      ?.map((item) => {
        const alignment = item.attrs?.textAlign || "left";
        const text =
          item.content && item.content.length > 0
            ? renderTextContent(item.content, data)
            : "\u00A0";
        switch (item.type) {
          case "paragraph":
            return {
              text,
              style: "paragraph",
              alignment,
            };
          case "heading":
            return {
              text,
              style: `header${item.attrs?.level}`,
              alignment,
            };
          default:
            return null;
        }
      })
      .filter(Boolean);
  };

  const renderParticipantDocumentContent = (
    content: JSONContent,
    data: ParticipantData,
  ): unknown => {
    return content.content
      ?.map((item) => {
        const text =
          item.content && item.content.length > 0
            ? renderParticipantTextContent(item.content, data)
            : "\u00A0";
        const alignment = item.attrs?.textAlign || "left";
        switch (item.type) {
          case "paragraph":
            return {
              text,
              style: "paragraph",
              alignment,
            };
          case "heading":
            return {
              text,
              style: `header${item.attrs?.level}`,
              alignment,
            };
          case "table":
            return {
              columns: [
                { width: "*", text: "" },
                {
                  table: {
                    headerRows: 1,
                    // widths: item.attrs?.widths,
                    body: [
                      ...(item.content || [])
                        .map((row) => {
                          const headerCells =
                            row.content?.filter(
                              (cell) => cell.type === "tableHeader",
                            ) || [];
                          if (row.type === "tableRow") {
                            if (headerCells.length === 0) {
                              return null;
                            }
                            return headerCells.map((cell) =>
                              cell.content?.map((contentCell) =>
                                renderParticipantDocumentContent(
                                  { content: [contentCell] },
                                  data,
                                ),
                              ),
                            );
                          }
                          return null;
                        })
                        .filter(Boolean),
                      ...(item.content?.some((row) =>
                        row.content?.some((cell) => cell.type === "tableCell"),
                      )
                        ? data.results.map((result) => {
                            const cell = item.content?.find((row) =>
                              row.content?.some(
                                (cell) => cell.type === "tableCell",
                              ),
                            );

                            let event;
                            let average;
                            let ranking;

                            for (const row of cell?.content || []) {
                              for (const cell of row.content || []) {
                                if (
                                  cell.content?.some(
                                    (content) => content.type === "mention",
                                  )
                                ) {
                                  switch (cell.content[0]?.attrs?.id) {
                                    case "Evento (tabla)":
                                    case "Event (table)":
                                      event = renderParticipantDocumentContent(
                                        {
                                          content: [
                                            {
                                              type: "paragraph",
                                              attrs: cell.attrs,
                                              content: [
                                                {
                                                  type: "text",
                                                  text: formatEvents(
                                                    result.event,
                                                  ),
                                                  marks: cell.content[0].marks,
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                        data,
                                      );
                                      break;
                                    case "Resultado (tabla)":
                                    case "Result (table)":
                                      average =
                                        renderParticipantDocumentContent(
                                          {
                                            content: [
                                              {
                                                type: "paragraph",
                                                attrs: cell.attrs,
                                                content: [
                                                  {
                                                    type: "text",
                                                    text: formatResults(
                                                      result.average,
                                                      result.event,
                                                    ),
                                                    marks:
                                                      cell.content[0].marks,
                                                  },
                                                ],
                                              },
                                            ],
                                          },
                                          data,
                                        );
                                      break;
                                    case "Posición (tabla)":
                                    case "Ranking (table)":
                                      ranking =
                                        renderParticipantDocumentContent(
                                          {
                                            content: [
                                              {
                                                type: "paragraph",
                                                attrs: cell.attrs,
                                                content: [
                                                  {
                                                    type: "text",
                                                    text: (
                                                      result.ranking || ""
                                                    ).toString(),
                                                    marks:
                                                      cell.content[0].marks,
                                                  },
                                                ],
                                              },
                                            ],
                                          },
                                          data,
                                        );
                                      break;
                                    default:
                                      break;
                                  }
                                }
                              }
                            }

                            return [event || {}, average || {}, ranking || {}];
                          })
                        : []),
                    ],
                  },
                  layout: "lightHorizontalLines",
                  width: "auto",
                },
                { width: "*", text: "" },
              ],
            };
          default:
            return null;
        }
      })
      .filter(Boolean);
  };

  return { renderDocumentContent, renderParticipantDocumentContent };
}

type CertificateRenderers = ReturnType<typeof createCertificateRenderers>;

export function generatePodiumPdf(
  action: "open" | "download",
  {
    competition,
    selectedPodiums,
    content,
    background,
    pageMargins,
    pageOrientation,
    pageSize,
    renderDocumentContent,
  }: {
    competition: Competition;
    selectedPodiums: PodiumData[];
    content: JSONContent;
    background: string | undefined;
    pageMargins: Margins;
    pageOrientation: PageOrientation;
    pageSize: PageSize;
    renderDocumentContent: CertificateRenderers["renderDocumentContent"];
  },
) {
  try {
    const docDefinition = {
      info: {
        title: `Certificados - ${competition.name}`,
        author: "Cubing México",
      },
      content: selectedPodiums?.map((data, index) => ({
        stack: renderDocumentContent(content, data),
        pageBreak: index < selectedPodiums.length - 1 ? "after" : "",
      })),
      background(currentPage, pageSize) {
        if (background) {
          return {
            image: background,
            width: pageSize.width,
            height: pageSize.height,
          };
        }
        return null;
      },
      pageMargins,
      pageOrientation,
      pageSize,
      styles: {
        header1: {
          fontSize: 33.231,
          lineHeight: 1,
        },
        header2: {
          fontSize: 24.923,
          lineHeight: 1,
        },
        header3: {
          fontSize: 20.769,
          lineHeight: 1,
        },
        header4: {
          fontSize: 16.615,
          lineHeight: 1,
        },
        header5: {
          fontSize: 14.538,
          lineHeight: 1,
        },
        header6: {
          fontSize: 12.462,
          lineHeight: 1,
        },
        paragraph: {
          fontSize: 12.462,
          lineHeight: 1,
        },
      },
      language: "es",
    } as TDocumentDefinitions;

    const pdf = pdfMake.createPdf(docDefinition, undefined, fontDeclarations);

    if (action === "open") {
      pdf.open();
    } else {
      pdf.download(`Certificados Podio - ${competition.name}.pdf`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    toast.error("Error al generar el PDF", {
      description: "Por favor, inténtalo de nuevo más tarde.",
    });
  }
}

export function generateParticipantPdf(
  action: "open" | "download",
  {
    competition,
    selectedParticipants,
    participantsContent,
    backgroundParticipants,
    pageMarginsParticipants,
    pageOrientationParticipants,
    pageSizeParticipants,
    renderParticipantDocumentContent,
  }: {
    competition: Competition;
    selectedParticipants: ParticipantData[];
    participantsContent: JSONContent;
    backgroundParticipants: string | undefined;
    pageMarginsParticipants: Margins;
    pageOrientationParticipants: PageOrientation;
    pageSizeParticipants: PageSize;
    renderParticipantDocumentContent: CertificateRenderers["renderParticipantDocumentContent"];
  },
) {
  try {
    const docDefinition = {
      info: {
        title: `Certificados - ${competition.name}`,
        author: "Cubing México",
      },
      content: selectedParticipants?.map((data, index) => ({
        stack: renderParticipantDocumentContent(participantsContent, data),
        pageBreak: index < selectedParticipants.length - 1 ? "after" : "",
      })),
      background(currentPage, pageSize) {
        if (backgroundParticipants) {
          return {
            image: backgroundParticipants,
            width: pageSize.width,
            height: pageSize.height,
          };
        }
        return null;
      },
      pageMargins: pageMarginsParticipants,
      pageOrientation: pageOrientationParticipants,
      pageSize: pageSizeParticipants,
      styles: {
        header1: {
          fontSize: 33.231,
          lineHeight: 1,
        },
        header2: {
          fontSize: 24.923,
          lineHeight: 1,
        },
        header3: {
          fontSize: 20.769,
          lineHeight: 1,
        },
        header4: {
          fontSize: 16.615,
          lineHeight: 1,
        },
        header5: {
          fontSize: 14.538,
          lineHeight: 1,
        },
        header6: {
          fontSize: 12.462,
          lineHeight: 1,
        },
        paragraph: {
          fontSize: 12.462,
          lineHeight: 1,
        },
      },
      language: "es",
    } as TDocumentDefinitions;

    const pdf = pdfMake.createPdf(docDefinition, undefined, fontDeclarations);
    if (action === "open") {
      pdf.open();
    } else {
      pdf.download(`Certificados Participacion - ${competition.name}.pdf`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    toast.error("Error al generar el PDF", {
      description: "Por favor, inténtalo de nuevo más tarde.",
    });
  }
}
