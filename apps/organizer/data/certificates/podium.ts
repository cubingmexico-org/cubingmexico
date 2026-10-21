import type { SavedDocumentFile } from "@/components/editor/saved-document";

export const podiumDefault: SavedDocumentFile = {
  content: {
    type: "doc",
    content: [
      { type: "paragraph", attrs: { textAlign: "center" } },
      { type: "paragraph", attrs: { textAlign: "center" } },
      { type: "paragraph", attrs: { textAlign: "center" } },
      { type: "paragraph", attrs: { textAlign: "center" } },
      { type: "paragraph", attrs: { textAlign: "center" } },
      { type: "paragraph", attrs: { textAlign: "center" } },
      { type: "paragraph", attrs: { textAlign: "center" } },
      { type: "paragraph", attrs: { textAlign: "center" } },
      { type: "paragraph", attrs: { textAlign: "center" } },
      { type: "paragraph", attrs: { textAlign: "center" } },
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          {
            type: "mention",
            attrs: { id: "Delegados", label: null, mentionSuggestionChar: "@" },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: ", en nombre de la World Cube Association, y ",
          },
          {
            type: "mention",
            attrs: {
              id: "Organizadores",
              label: null,
              mentionSuggestionChar: "@",
            },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: ", en nombre del equipo organizador, otorgan el presente",
          },
        ],
      },
      { type: "paragraph", attrs: { textAlign: "center" } },
      {
        type: "heading",
        attrs: { textAlign: "center", level: 2 },
        content: [
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "24pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
            text: "CERTIFICADO",
          },
        ],
      },
      {
        type: "heading",
        attrs: { textAlign: "center", level: 3 },
        content: [
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "20pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
            text: "DE MEDALLA DE ",
          },
          {
            type: "mention",
            attrs: { id: "Medalla", label: null, mentionSuggestionChar: "@" },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "20pt",
                  color: "#000000",
                  transform: "uppercase",
                },
              },
              { type: "bold" },
            ],
          },
        ],
      },
      { type: "paragraph", attrs: { textAlign: "center" } },
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: "a",
          },
        ],
      },
      { type: "paragraph", attrs: { textAlign: "center" } },
      {
        type: "heading",
        attrs: { textAlign: "center", level: 1 },
        content: [
          {
            type: "mention",
            attrs: {
              id: "Competidor",
              label: null,
              mentionSuggestionChar: "@",
            },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "32pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
          },
        ],
      },
      { type: "paragraph", attrs: { textAlign: "center" } },
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: "por haber obtenido el ",
          },
          {
            type: "mention",
            attrs: {
              id: "Posición (ordinal con texto)",
              label: null,
              mentionSuggestionChar: "@",
            },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: " ",
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
            text: "Lugar",
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: " en ",
          },
          {
            type: "mention",
            attrs: { id: "Evento", label: null, mentionSuggestionChar: "@" },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: " con ",
          },
          {
            type: "mention",
            attrs: {
              id: "Tipo de resultado",
              label: null,
              mentionSuggestionChar: "@",
            },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: null,
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: null,
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: " ",
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: "de ",
          },
          {
            type: "mention",
            attrs: { id: "Resultado", label: null, mentionSuggestionChar: "@" },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: " en el ",
          },
          {
            type: "mention",
            attrs: {
              id: "Competencia",
              label: null,
              mentionSuggestionChar: "@",
            },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: ", llevado a cabo los días ",
          },
          {
            type: "mention",
            attrs: { id: "Fecha", label: null, mentionSuggestionChar: "@" },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: " en ",
          },
          {
            type: "mention",
            attrs: { id: "Ciudad", label: null, mentionSuggestionChar: "@" },
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
              { type: "bold" },
            ],
          },
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  fontFamily: "Roboto",
                  fontSize: "12pt",
                  color: "#000000",
                  transform: "none",
                },
              },
            ],
            text: ".",
          },
        ],
      },
    ],
  },
  pageConfig: {
    pageSize: "LETTER",
    pageOrientation: "landscape",
    pageMargins: [40, 60, 40, 60],
  },
};
