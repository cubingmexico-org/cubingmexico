"use client";

import type { JSONContent } from "@tiptap/react";
import { useEditor, EditorContent } from "@tiptap/react";
import Mention from "@tiptap/extension-mention";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import FontFamily from "@tiptap/extension-font-family";
import TextStyle from "@tiptap/extension-text-style";
import CharacterCount from "@tiptap/extension-character-count";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import type { PageSize, PageOrientation, Margins } from "pdfmake/interfaces";
import { cn } from "@workspace/ui/lib/utils";
import Color from "@tiptap/extension-color";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarCheckboxItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@workspace/ui/components/menubar";
import {
  Save,
  Loader,
  RotateCcw,
  Sheet,
  FileDown,
  Bold,
  AlignLeft,
  Undo,
  Redo,
  Scissors,
  Files,
  Clipboard,
  TextSelect,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Plus,
  Trash2,
  TableCellsMerge,
  TableCellsSplit,
  RemoveFormatting,
  Heading,
} from "lucide-react";
import { DialogDocumentSettings } from "@/components/editor/dialog-document-settings";
import { TextTransform } from "@/components/editor/extensions/text-transform";
import { FontSize } from "@/components/editor/extensions/font-size";
import { participation, podium } from "@/data/certificates";
import Toolbar from "./toolbar";
import suggestionPodiumEs from "./mentions/suggestions/suggestion-podium";
import suggestionParticipationEs from "./mentions/suggestions/suggestion-participation";
import Submenu from "./submenu";

interface TiptapProps {
  content: JSONContent;
  pdfDisabled: boolean;
  pageSize: PageSize;
  pageOrientation: PageOrientation;
  pageMargins: Margins;
  pdfOnClick: () => void;
  setPageSize: (value: PageSize) => void;
  setPageOrientation: (value: PageOrientation) => void;
  setPageMargins: (value: Margins) => void;
  onChange: (newContent: JSONContent) => void;
  variant: "podium" | "participation";
  competitionId: string;
  background: string | undefined;
}

interface SavedDocumentFile {
  content: JSONContent;
  pageConfig: {
    pageSize: PageSize;
    pageOrientation: PageOrientation;
    pageMargins: Margins;
  };
}

const isSavedDocumentFile = (value: unknown): value is SavedDocumentFile => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const pageConfig = candidate.pageConfig;

  if (!pageConfig || typeof pageConfig !== "object") {
    return false;
  }

  return "content" in candidate;
};

export default function Tiptap({
  content,
  pdfDisabled,
  pageSize,
  pageOrientation,
  pageMargins,
  pdfOnClick,
  setPageSize,
  setPageOrientation,
  setPageMargins,
  onChange,
  variant,
  competitionId,
  background,
}: TiptapProps): React.JSX.Element {
  const handleChange = (newContent: JSONContent) => {
    onChange(newContent);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion:
          variant === "podium" ? suggestionPodiumEs : suggestionParticipationEs,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Color.configure({
        types: ["textStyle"],
      }),
      TextTransform.configure({
        types: ["textStyle"],
      }),
      CharacterCount.configure({
        limit: 400,
      }),
      Table,
      TableCell,
      TableHeader,
      TableRow,
    ],
    editorProps: {
      attributes: {
        class: cn(
          "shadow bg-white text-black focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 overflow-y-clip",
          {
            [getLeftMarginValue(
              Array.isArray(pageMargins) ? pageMargins[0] : 0,
            )]:
              Array.isArray(pageMargins) &&
              pageMargins[0] >= 0 &&
              pageMargins[0] <= 200,
            [getTopMarginValue(
              Array.isArray(pageMargins) ? pageMargins[1] : 0,
            )]:
              Array.isArray(pageMargins) &&
              pageMargins[1] >= 0 &&
              pageMargins[1] <= 200,
            [getRightMarginValue(
              Array.isArray(pageMargins) && pageMargins.length === 4
                ? pageMargins[2]
                : 0,
            )]:
              Array.isArray(pageMargins) &&
              pageMargins.length === 4 &&
              pageMargins[2] >= 0 &&
              pageMargins[2] <= 200,
            [getBottomMarginValue(
              Array.isArray(pageMargins) && pageMargins.length === 4
                ? pageMargins[3]
                : 0,
            )]:
              Array.isArray(pageMargins) &&
              pageMargins.length === 4 &&
              pageMargins[3] >= 0 &&
              pageMargins[3] <= 200,
            "w-[612pt] h-[792pt]":
              pageSize === "LETTER" && pageOrientation === "portrait",
            "w-[792pt] h-[612pt]":
              pageSize === "LETTER" && pageOrientation === "landscape",
            "w-[595pt] h-[842pt]":
              pageSize === "A4" && pageOrientation === "portrait",
            "w-[842pt] h-[595pt]":
              pageSize === "A4" && pageOrientation === "landscape",
          },
        ),
        style: background
          ? `background-image: url(${background}); background-size: contain; background-repeat: no-repeat; background-position: center;`
          : "",
      },
    },
    content,
    onUpdate: ({ editor }) => {
      handleChange(editor.getJSON());
    },
  });

  if (!editor) {
    return <></>;
  }

  const saveContent = () => {
    const content = editor.getJSON();
    const documentFile: SavedDocumentFile = {
      content,
      pageConfig: {
        pageSize,
        pageOrientation,
        pageMargins,
      },
    };
    const jsonString = JSON.stringify(documentFile);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${competitionId}-${variant}-doc.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadContent = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }

      const jsonString = await file.text();
      const parsed = JSON.parse(jsonString) as unknown;

      if (isSavedDocumentFile(parsed)) {
        setPageSize(parsed.pageConfig.pageSize);
        setPageOrientation(parsed.pageConfig.pageOrientation);
        setPageMargins(parsed.pageConfig.pageMargins);
        editor.commands.setContent(parsed.content);
        handleChange(parsed.content);
        return;
      }

      const content = parsed as JSONContent;
      editor.commands.setContent(content);
      handleChange(content);
    };
    input.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Archivo</MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              disabled={
                variant === "podium"
                  ? content === podium
                  : content === participation
              }
              onClick={() => {
                const newContent =
                  variant === "podium" ? podium : participation;
                editor.commands.setContent(newContent);
                handleChange(newContent);
              }}
            >
              <RotateCcw />
              Reiniciar
            </MenubarItem>
            <MenubarItem onClick={saveContent}>
              <Save />
              Guardar
            </MenubarItem>
            <MenubarItem onClick={loadContent}>
              <Loader />
              Cargar
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled={pdfDisabled} onClick={pdfOnClick}>
              <FileDown />
              Exportar como PDF
            </MenubarItem>
            <MenubarSeparator />
            <DialogDocumentSettings
              pageMargins={pageMargins}
              pageOrientation={pageOrientation}
              pageSize={pageSize}
              setPageMargins={setPageMargins}
              setPageOrientation={setPageOrientation}
              setPageSize={setPageSize}
              certificateVariant={variant}
            />
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Editar</MenubarTrigger>
          <MenubarContent className="w-60">
            <MenubarItem
              disabled={!editor.can().chain().focus().undo().run()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo />
              Deshacer
              <MenubarShortcut>Ctrl+Y</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              disabled={!editor.can().chain().focus().redo().run()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo />
              Rehacer
              <MenubarShortcut>Ctrl+Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled>
              <Scissors />
              Cortar
              <MenubarShortcut>Ctrl+X</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>
              <Files />
              Copiar
              <MenubarShortcut>Ctrl+C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>
              <Clipboard />
              Pegar
              <MenubarShortcut>Ctrl+V</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled>
              <TextSelect />
              Seleccionar todo
              <MenubarShortcut>Ctrl+A</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Insertar</MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 2, cols: 3, withHeaderRow: true })
                  .run()
              }
            >
              <Sheet />
              Tabla
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Formato</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger className="[&_svg:not([class*='size-'])]:size-4 gap-2">
                <Bold />
                Texto
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  <Bold />
                  Negrita
                </MenubarItem>
                <MenubarSeparator />
                <Submenu editor={editor} />
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSub>
              <MenubarSubTrigger className="[&_svg:not([class*='size-'])]:size-4 gap-2">
                <AlignJustify />
                Estilos de párrafo
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarCheckboxItem
                  checked={editor.isActive("paragraph")}
                  disabled={!editor.can().chain().focus().setParagraph().run()}
                  onClick={() => editor.chain().focus().setParagraph().run()}
                >
                  Texto normal
                </MenubarCheckboxItem>
                <MenubarCheckboxItem
                  checked={editor.isActive("heading", { level: 1 })}
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                  }
                >
                  Encabezado 1
                </MenubarCheckboxItem>
                <MenubarCheckboxItem
                  checked={editor.isActive("heading", { level: 2 })}
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                >
                  Encabezado 2
                </MenubarCheckboxItem>
                <MenubarCheckboxItem
                  checked={editor.isActive("heading", { level: 3 })}
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 3 }).run()
                  }
                >
                  Encabezado 3
                </MenubarCheckboxItem>
                <MenubarCheckboxItem
                  checked={editor.isActive("heading", { level: 4 })}
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 4 }).run()
                  }
                >
                  Encabezado 4
                </MenubarCheckboxItem>
                <MenubarCheckboxItem
                  checked={editor.isActive("heading", { level: 5 })}
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 5 }).run()
                  }
                >
                  Encabezado 5
                </MenubarCheckboxItem>
                <MenubarCheckboxItem
                  checked={editor.isActive("heading", { level: 6 })}
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 6 }).run()
                  }
                >
                  Encabezado 6
                </MenubarCheckboxItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSub>
              <MenubarSubTrigger className="[&_svg:not([class*='size-'])]:size-4 gap-2">
                <AlignLeft />
                Alinear
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem
                  onClick={() =>
                    editor.chain().focus().setTextAlign("left").run()
                  }
                >
                  <AlignLeft />
                  Izquierda
                </MenubarItem>
                <MenubarItem
                  onClick={() =>
                    editor.chain().focus().setTextAlign("center").run()
                  }
                >
                  <AlignCenter />
                  Centro
                </MenubarItem>
                <MenubarItem
                  onClick={() =>
                    editor.chain().focus().setTextAlign("right").run()
                  }
                >
                  <AlignRight />
                  Derecha
                </MenubarItem>
                <MenubarItem
                  onClick={() =>
                    editor.chain().focus().setTextAlign("justify").run()
                  }
                >
                  <AlignJustify />
                  Justificado
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger className="[&_svg:not([class*='size-'])]:size-4 gap-2">
                <Sheet />
                Tabla
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem
                  disabled={!editor.can().addRowBefore()}
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                >
                  <Plus />
                  Inertar fila arriba
                </MenubarItem>
                <MenubarItem
                  disabled={!editor.can().addRowAfter()}
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                >
                  <Plus />
                  Insertar fila abajo
                </MenubarItem>
                <MenubarItem
                  disabled={!editor.can().addColumnBefore()}
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                >
                  <Plus />
                  Insertar columna a la izquierda
                </MenubarItem>
                <MenubarItem
                  disabled={!editor.can().addColumnAfter()}
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                >
                  <Plus />
                  Insertar columna a la derecha
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem
                  disabled={!editor.can().deleteRow()}
                  onClick={() => editor.chain().focus().deleteRow().run()}
                >
                  <Trash2 />
                  Eliminar fila
                </MenubarItem>
                <MenubarItem
                  disabled={!editor.can().deleteColumn()}
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                >
                  <Trash2 />
                  Eliminar columna
                </MenubarItem>
                <MenubarItem
                  disabled={!editor.can().deleteTable()}
                  onClick={() => editor.chain().focus().deleteTable().run()}
                >
                  <Trash2 />
                  Eliminar tabla
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem
                  disabled={!editor.can().toggleHeaderRow()}
                  onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                >
                  <Heading />
                  Alternar fila de encabezado
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem
                  disabled={!editor.can().mergeCells()}
                  onClick={() => editor.chain().focus().mergeCells().run()}
                >
                  <TableCellsMerge />
                  Combinar celdas
                </MenubarItem>
                <MenubarItem
                  disabled={!editor.can().splitCell()}
                  onClick={() => editor.chain().focus().splitCell().run()}
                >
                  <TableCellsSplit />
                  Separar celdas
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem
              onClick={() => {
                editor.chain().focus().unsetAllMarks().run();
                editor.chain().focus().clearNodes().run();
              }}
            >
              <RemoveFormatting />
              Borrar formato
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <Toolbar editor={editor} />
      <div className="flex justify-center bg-secondary py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function getLeftMarginValue(index: number): string {
  switch (index) {
    case 0:
      return "pl-[0pt]";
    case 1:
      return "pl-[1pt]";
    case 2:
      return "pl-[2pt]";
    case 3:
      return "pl-[3pt]";
    case 4:
      return "pl-[4pt]";
    case 5:
      return "pl-[5pt]";
    case 6:
      return "pl-[6pt]";
    case 7:
      return "pl-[7pt]";
    case 8:
      return "pl-[8pt]";
    case 9:
      return "pl-[9pt]";
    case 10:
      return "pl-[10pt]";
    case 11:
      return "pl-[11pt]";
    case 12:
      return "pl-[12pt]";
    case 13:
      return "pl-[13pt]";
    case 14:
      return "pl-[14pt]";
    case 15:
      return "pl-[15pt]";
    case 16:
      return "pl-[16pt]";
    case 17:
      return "pl-[17pt]";
    case 18:
      return "pl-[18pt]";
    case 19:
      return "pl-[19pt]";
    case 20:
      return "pl-[20pt]";
    case 21:
      return "pl-[21pt]";
    case 22:
      return "pl-[22pt]";
    case 23:
      return "pl-[23pt]";
    case 24:
      return "pl-[24pt]";
    case 25:
      return "pl-[25pt]";
    case 26:
      return "pl-[26pt]";
    case 27:
      return "pl-[27pt]";
    case 28:
      return "pl-[28pt]";
    case 29:
      return "pl-[29pt]";
    case 30:
      return "pl-[30pt]";
    case 31:
      return "pl-[31pt]";
    case 32:
      return "pl-[32pt]";
    case 33:
      return "pl-[33pt]";
    case 34:
      return "pl-[34pt]";
    case 35:
      return "pl-[35pt]";
    case 36:
      return "pl-[36pt]";
    case 37:
      return "pl-[37pt]";
    case 38:
      return "pl-[38pt]";
    case 39:
      return "pl-[39pt]";
    case 40:
      return "pl-[40pt]";
    case 41:
      return "pl-[41pt]";
    case 42:
      return "pl-[42pt]";
    case 43:
      return "pl-[43pt]";
    case 44:
      return "pl-[44pt]";
    case 45:
      return "pl-[45pt]";
    case 46:
      return "pl-[46pt]";
    case 47:
      return "pl-[47pt]";
    case 48:
      return "pl-[48pt]";
    case 49:
      return "pl-[49pt]";
    case 50:
      return "pl-[50pt]";
    case 51:
      return "pl-[51pt]";
    case 52:
      return "pl-[52pt]";
    case 53:
      return "pl-[53pt]";
    case 54:
      return "pl-[54pt]";
    case 55:
      return "pl-[55pt]";
    case 56:
      return "pl-[56pt]";
    case 57:
      return "pl-[57pt]";
    case 58:
      return "pl-[58pt]";
    case 59:
      return "pl-[59pt]";
    case 60:
      return "pl-[60pt]";
    case 61:
      return "pl-[61pt]";
    case 62:
      return "pl-[62pt]";
    case 63:
      return "pl-[63pt]";
    case 64:
      return "pl-[64pt]";
    case 65:
      return "pl-[65pt]";
    case 66:
      return "pl-[66pt]";
    case 67:
      return "pl-[67pt]";
    case 68:
      return "pl-[68pt]";
    case 69:
      return "pl-[69pt]";
    case 70:
      return "pl-[70pt]";
    case 71:
      return "pl-[71pt]";
    case 72:
      return "pl-[72pt]";
    case 73:
      return "pl-[73pt]";
    case 74:
      return "pl-[74pt]";
    case 75:
      return "pl-[75pt]";
    case 76:
      return "pl-[76pt]";
    case 77:
      return "pl-[77pt]";
    case 78:
      return "pl-[78pt]";
    case 79:
      return "pl-[79pt]";
    case 80:
      return "pl-[80pt]";
    case 81:
      return "pl-[81pt]";
    case 82:
      return "pl-[82pt]";
    case 83:
      return "pl-[83pt]";
    case 84:
      return "pl-[84pt]";
    case 85:
      return "pl-[85pt]";
    case 86:
      return "pl-[86pt]";
    case 87:
      return "pl-[87pt]";
    case 88:
      return "pl-[88pt]";
    case 89:
      return "pl-[89pt]";
    case 90:
      return "pl-[90pt]";
    case 91:
      return "pl-[91pt]";
    case 92:
      return "pl-[92pt]";
    case 93:
      return "pl-[93pt]";
    case 94:
      return "pl-[94pt]";
    case 95:
      return "pl-[95pt]";
    case 96:
      return "pl-[96pt]";
    case 97:
      return "pl-[97pt]";
    case 98:
      return "pl-[98pt]";
    case 99:
      return "pl-[99pt]";
    case 100:
      return "pl-[100pt]";
    case 101:
      return "pl-[101pt]";
    case 102:
      return "pl-[102pt]";
    case 103:
      return "pl-[103pt]";
    case 104:
      return "pl-[104pt]";
    case 105:
      return "pl-[105pt]";
    case 106:
      return "pl-[106pt]";
    case 107:
      return "pl-[107pt]";
    case 108:
      return "pl-[108pt]";
    case 109:
      return "pl-[109pt]";
    case 110:
      return "pl-[110pt]";
    case 111:
      return "pl-[111pt]";
    case 112:
      return "pl-[112pt]";
    case 113:
      return "pl-[113pt]";
    case 114:
      return "pl-[114pt]";
    case 115:
      return "pl-[115pt]";
    case 116:
      return "pl-[116pt]";
    case 117:
      return "pl-[117pt]";
    case 118:
      return "pl-[118pt]";
    case 119:
      return "pl-[119pt]";
    case 120:
      return "pl-[120pt]";
    case 121:
      return "pl-[121pt]";
    case 122:
      return "pl-[122pt]";
    case 123:
      return "pl-[123pt]";
    case 124:
      return "pl-[124pt]";
    case 125:
      return "pl-[125pt]";
    case 126:
      return "pl-[126pt]";
    case 127:
      return "pl-[127pt]";
    case 128:
      return "pl-[128pt]";
    case 129:
      return "pl-[129pt]";
    case 130:
      return "pl-[130pt]";
    case 131:
      return "pl-[131pt]";
    case 132:
      return "pl-[132pt]";
    case 133:
      return "pl-[133pt]";
    case 134:
      return "pl-[134pt]";
    case 135:
      return "pl-[135pt]";
    case 136:
      return "pl-[136pt]";
    case 137:
      return "pl-[137pt]";
    case 138:
      return "pl-[138pt]";
    case 139:
      return "pl-[139pt]";
    case 140:
      return "pl-[140pt]";
    case 141:
      return "pl-[141pt]";
    case 142:
      return "pl-[142pt]";
    case 143:
      return "pl-[143pt]";
    case 144:
      return "pl-[144pt]";
    case 145:
      return "pl-[145pt]";
    case 146:
      return "pl-[146pt]";
    case 147:
      return "pl-[147pt]";
    case 148:
      return "pl-[148pt]";
    case 149:
      return "pl-[149pt]";
    case 150:
      return "pl-[150pt]";
    case 151:
      return "pl-[151pt]";
    case 152:
      return "pl-[152pt]";
    case 153:
      return "pl-[153pt]";
    case 154:
      return "pl-[154pt]";
    case 155:
      return "pl-[155pt]";
    case 156:
      return "pl-[156pt]";
    case 157:
      return "pl-[157pt]";
    case 158:
      return "pl-[158pt]";
    case 159:
      return "pl-[159pt]";
    case 160:
      return "pl-[160pt]";
    case 161:
      return "pl-[161pt]";
    case 162:
      return "pl-[162pt]";
    case 163:
      return "pl-[163pt]";
    case 164:
      return "pl-[164pt]";
    case 165:
      return "pl-[165pt]";
    case 166:
      return "pl-[166pt]";
    case 167:
      return "pl-[167pt]";
    case 168:
      return "pl-[168pt]";
    case 169:
      return "pl-[169pt]";
    case 170:
      return "pl-[170pt]";
    case 171:
      return "pl-[171pt]";
    case 172:
      return "pl-[172pt]";
    case 173:
      return "pl-[173pt]";
    case 174:
      return "pl-[174pt]";
    case 175:
      return "pl-[175pt]";
    case 176:
      return "pl-[176pt]";
    case 177:
      return "pl-[177pt]";
    case 178:
      return "pl-[178pt]";
    case 179:
      return "pl-[179pt]";
    case 180:
      return "pl-[180pt]";
    case 181:
      return "pl-[181pt]";
    case 182:
      return "pl-[182pt]";
    case 183:
      return "pl-[183pt]";
    case 184:
      return "pl-[184pt]";
    case 185:
      return "pl-[185pt]";
    case 186:
      return "pl-[186pt]";
    case 187:
      return "pl-[187pt]";
    case 188:
      return "pl-[188pt]";
    case 189:
      return "pl-[189pt]";
    case 190:
      return "pl-[190pt]";
    case 191:
      return "pl-[191pt]";
    case 192:
      return "pl-[192pt]";
    case 193:
      return "pl-[193pt]";
    case 194:
      return "pl-[194pt]";
    case 195:
      return "pl-[195pt]";
    case 196:
      return "pl-[196pt]";
    case 197:
      return "pl-[197pt]";
    case 198:
      return "pl-[198pt]";
    case 199:
      return "pl-[199pt]";
    case 200:
      return "pl-[200pt]";
    default:
      return "";
  }
}

function getTopMarginValue(index: number): string {
  switch (index) {
    case 0:
      return "pt-[0pt]";
    case 1:
      return "pt-[1pt]";
    case 2:
      return "pt-[2pt]";
    case 3:
      return "pt-[3pt]";
    case 4:
      return "pt-[4pt]";
    case 5:
      return "pt-[5pt]";
    case 6:
      return "pt-[6pt]";
    case 7:
      return "pt-[7pt]";
    case 8:
      return "pt-[8pt]";
    case 9:
      return "pt-[9pt]";
    case 10:
      return "pt-[10pt]";
    case 11:
      return "pt-[11pt]";
    case 12:
      return "pt-[12pt]";
    case 13:
      return "pt-[13pt]";
    case 14:
      return "pt-[14pt]";
    case 15:
      return "pt-[15pt]";
    case 16:
      return "pt-[16pt]";
    case 17:
      return "pt-[17pt]";
    case 18:
      return "pt-[18pt]";
    case 19:
      return "pt-[19pt]";
    case 20:
      return "pt-[20pt]";
    case 21:
      return "pt-[21pt]";
    case 22:
      return "pt-[22pt]";
    case 23:
      return "pt-[23pt]";
    case 24:
      return "pt-[24pt]";
    case 25:
      return "pt-[25pt]";
    case 26:
      return "pt-[26pt]";
    case 27:
      return "pt-[27pt]";
    case 28:
      return "pt-[28pt]";
    case 29:
      return "pt-[29pt]";
    case 30:
      return "pt-[30pt]";
    case 31:
      return "pt-[31pt]";
    case 32:
      return "pt-[32pt]";
    case 33:
      return "pt-[33pt]";
    case 34:
      return "pt-[34pt]";
    case 35:
      return "pt-[35pt]";
    case 36:
      return "pt-[36pt]";
    case 37:
      return "pt-[37pt]";
    case 38:
      return "pt-[38pt]";
    case 39:
      return "pt-[39pt]";
    case 40:
      return "pt-[40pt]";
    case 41:
      return "pt-[41pt]";
    case 42:
      return "pt-[42pt]";
    case 43:
      return "pt-[43pt]";
    case 44:
      return "pt-[44pt]";
    case 45:
      return "pt-[45pt]";
    case 46:
      return "pt-[46pt]";
    case 47:
      return "pt-[47pt]";
    case 48:
      return "pt-[48pt]";
    case 49:
      return "pt-[49pt]";
    case 50:
      return "pt-[50pt]";
    case 51:
      return "pt-[51pt]";
    case 52:
      return "pt-[52pt]";
    case 53:
      return "pt-[53pt]";
    case 54:
      return "pt-[54pt]";
    case 55:
      return "pt-[55pt]";
    case 56:
      return "pt-[56pt]";
    case 57:
      return "pt-[57pt]";
    case 58:
      return "pt-[58pt]";
    case 59:
      return "pt-[59pt]";
    case 60:
      return "pt-[60pt]";
    case 61:
      return "pt-[61pt]";
    case 62:
      return "pt-[62pt]";
    case 63:
      return "pt-[63pt]";
    case 64:
      return "pt-[64pt]";
    case 65:
      return "pt-[65pt]";
    case 66:
      return "pt-[66pt]";
    case 67:
      return "pt-[67pt]";
    case 68:
      return "pt-[68pt]";
    case 69:
      return "pt-[69pt]";
    case 70:
      return "pt-[70pt]";
    case 71:
      return "pt-[71pt]";
    case 72:
      return "pt-[72pt]";
    case 73:
      return "pt-[73pt]";
    case 74:
      return "pt-[74pt]";
    case 75:
      return "pt-[75pt]";
    case 76:
      return "pt-[76pt]";
    case 77:
      return "pt-[77pt]";
    case 78:
      return "pt-[78pt]";
    case 79:
      return "pt-[79pt]";
    case 80:
      return "pt-[80pt]";
    case 81:
      return "pt-[81pt]";
    case 82:
      return "pt-[82pt]";
    case 83:
      return "pt-[83pt]";
    case 84:
      return "pt-[84pt]";
    case 85:
      return "pt-[85pt]";
    case 86:
      return "pt-[86pt]";
    case 87:
      return "pt-[87pt]";
    case 88:
      return "pt-[88pt]";
    case 89:
      return "pt-[89pt]";
    case 90:
      return "pt-[90pt]";
    case 91:
      return "pt-[91pt]";
    case 92:
      return "pt-[92pt]";
    case 93:
      return "pt-[93pt]";
    case 94:
      return "pt-[94pt]";
    case 95:
      return "pt-[95pt]";
    case 96:
      return "pt-[96pt]";
    case 97:
      return "pt-[97pt]";
    case 98:
      return "pt-[98pt]";
    case 99:
      return "pt-[99pt]";
    case 100:
      return "pt-[100pt]";
    case 101:
      return "pt-[101pt]";
    case 102:
      return "pt-[102pt]";
    case 103:
      return "pt-[103pt]";
    case 104:
      return "pt-[104pt]";
    case 105:
      return "pt-[105pt]";
    case 106:
      return "pt-[106pt]";
    case 107:
      return "pt-[107pt]";
    case 108:
      return "pt-[108pt]";
    case 109:
      return "pt-[109pt]";
    case 110:
      return "pt-[110pt]";
    case 111:
      return "pt-[111pt]";
    case 112:
      return "pt-[112pt]";
    case 113:
      return "pt-[113pt]";
    case 114:
      return "pt-[114pt]";
    case 115:
      return "pt-[115pt]";
    case 116:
      return "pt-[116pt]";
    case 117:
      return "pt-[117pt]";
    case 118:
      return "pt-[118pt]";
    case 119:
      return "pt-[119pt]";
    case 120:
      return "pt-[120pt]";
    case 121:
      return "pt-[121pt]";
    case 122:
      return "pt-[122pt]";
    case 123:
      return "pt-[123pt]";
    case 124:
      return "pt-[124pt]";
    case 125:
      return "pt-[125pt]";
    case 126:
      return "pt-[126pt]";
    case 127:
      return "pt-[127pt]";
    case 128:
      return "pt-[128pt]";
    case 129:
      return "pt-[129pt]";
    case 130:
      return "pt-[130pt]";
    case 131:
      return "pt-[131pt]";
    case 132:
      return "pt-[132pt]";
    case 133:
      return "pt-[133pt]";
    case 134:
      return "pt-[134pt]";
    case 135:
      return "pt-[135pt]";
    case 136:
      return "pt-[136pt]";
    case 137:
      return "pt-[137pt]";
    case 138:
      return "pt-[138pt]";
    case 139:
      return "pt-[139pt]";
    case 140:
      return "pt-[140pt]";
    case 141:
      return "pt-[141pt]";
    case 142:
      return "pt-[142pt]";
    case 143:
      return "pt-[143pt]";
    case 144:
      return "pt-[144pt]";
    case 145:
      return "pt-[145pt]";
    case 146:
      return "pt-[146pt]";
    case 147:
      return "pt-[147pt]";
    case 148:
      return "pt-[148pt]";
    case 149:
      return "pt-[149pt]";
    case 150:
      return "pt-[150pt]";
    case 151:
      return "pt-[151pt]";
    case 152:
      return "pt-[152pt]";
    case 153:
      return "pt-[153pt]";
    case 154:
      return "pt-[154pt]";
    case 155:
      return "pt-[155pt]";
    case 156:
      return "pt-[156pt]";
    case 157:
      return "pt-[157pt]";
    case 158:
      return "pt-[158pt]";
    case 159:
      return "pt-[159pt]";
    case 160:
      return "pt-[160pt]";
    case 161:
      return "pt-[161pt]";
    case 162:
      return "pt-[162pt]";
    case 163:
      return "pt-[163pt]";
    case 164:
      return "pt-[164pt]";
    case 165:
      return "pt-[165pt]";
    case 166:
      return "pt-[166pt]";
    case 167:
      return "pt-[167pt]";
    case 168:
      return "pt-[168pt]";
    case 169:
      return "pt-[169pt]";
    case 170:
      return "pt-[170pt]";
    case 171:
      return "pt-[171pt]";
    case 172:
      return "pt-[172pt]";
    case 173:
      return "pt-[173pt]";
    case 174:
      return "pt-[174pt]";
    case 175:
      return "pt-[175pt]";
    case 176:
      return "pt-[176pt]";
    case 177:
      return "pt-[177pt]";
    case 178:
      return "pt-[178pt]";
    case 179:
      return "pt-[179pt]";
    case 180:
      return "pt-[180pt]";
    case 181:
      return "pt-[181pt]";
    case 182:
      return "pt-[182pt]";
    case 183:
      return "pt-[183pt]";
    case 184:
      return "pt-[184pt]";
    case 185:
      return "pt-[185pt]";
    case 186:
      return "pt-[186pt]";
    case 187:
      return "pt-[187pt]";
    case 188:
      return "pt-[188pt]";
    case 189:
      return "pt-[189pt]";
    case 190:
      return "pt-[190pt]";
    case 191:
      return "pt-[191pt]";
    case 192:
      return "pt-[192pt]";
    case 193:
      return "pt-[193pt]";
    case 194:
      return "pt-[194pt]";
    case 195:
      return "pt-[195pt]";
    case 196:
      return "pt-[196pt]";
    case 197:
      return "pt-[197pt]";
    case 198:
      return "pt-[198pt]";
    case 199:
      return "pt-[199pt]";
    case 200:
      return "pt-[200pt]";
    default:
      return "";
  }
}

function getRightMarginValue(index: number): string {
  switch (index) {
    case 0:
      return "pr-[0pt]";
    case 1:
      return "pr-[1pt]";
    case 2:
      return "pr-[2pt]";
    case 3:
      return "pr-[3pt]";
    case 4:
      return "pr-[4pt]";
    case 5:
      return "pr-[5pt]";
    case 6:
      return "pr-[6pt]";
    case 7:
      return "pr-[7pt]";
    case 8:
      return "pr-[8pt]";
    case 9:
      return "pr-[9pt]";
    case 10:
      return "pr-[10pt]";
    case 11:
      return "pr-[11pt]";
    case 12:
      return "pr-[12pt]";
    case 13:
      return "pr-[13pt]";
    case 14:
      return "pr-[14pt]";
    case 15:
      return "pr-[15pt]";
    case 16:
      return "pr-[16pt]";
    case 17:
      return "pr-[17pt]";
    case 18:
      return "pr-[18pt]";
    case 19:
      return "pr-[19pt]";
    case 20:
      return "pr-[20pt]";
    case 21:
      return "pr-[21pt]";
    case 22:
      return "pr-[22pt]";
    case 23:
      return "pr-[23pt]";
    case 24:
      return "pr-[24pt]";
    case 25:
      return "pr-[25pt]";
    case 26:
      return "pr-[26pt]";
    case 27:
      return "pr-[27pt]";
    case 28:
      return "pr-[28pt]";
    case 29:
      return "pr-[29pt]";
    case 30:
      return "pr-[30pt]";
    case 31:
      return "pr-[31pt]";
    case 32:
      return "pr-[32pt]";
    case 33:
      return "pr-[33pt]";
    case 34:
      return "pr-[34pt]";
    case 35:
      return "pr-[35pt]";
    case 36:
      return "pr-[36pt]";
    case 37:
      return "pr-[37pt]";
    case 38:
      return "pr-[38pt]";
    case 39:
      return "pr-[39pt]";
    case 40:
      return "pr-[40pt]";
    case 41:
      return "pr-[41pt]";
    case 42:
      return "pr-[42pt]";
    case 43:
      return "pr-[43pt]";
    case 44:
      return "pr-[44pt]";
    case 45:
      return "pr-[45pt]";
    case 46:
      return "pr-[46pt]";
    case 47:
      return "pr-[47pt]";
    case 48:
      return "pr-[48pt]";
    case 49:
      return "pr-[49pt]";
    case 50:
      return "pr-[50pt]";
    case 51:
      return "pr-[51pt]";
    case 52:
      return "pr-[52pt]";
    case 53:
      return "pr-[53pt]";
    case 54:
      return "pr-[54pt]";
    case 55:
      return "pr-[55pt]";
    case 56:
      return "pr-[56pt]";
    case 57:
      return "pr-[57pt]";
    case 58:
      return "pr-[58pt]";
    case 59:
      return "pr-[59pt]";
    case 60:
      return "pr-[60pt]";
    case 61:
      return "pr-[61pt]";
    case 62:
      return "pr-[62pt]";
    case 63:
      return "pr-[63pt]";
    case 64:
      return "pr-[64pt]";
    case 65:
      return "pr-[65pt]";
    case 66:
      return "pr-[66pt]";
    case 67:
      return "pr-[67pt]";
    case 68:
      return "pr-[68pt]";
    case 69:
      return "pr-[69pt]";
    case 70:
      return "pr-[70pt]";
    case 71:
      return "pr-[71pt]";
    case 72:
      return "pr-[72pt]";
    case 73:
      return "pr-[73pt]";
    case 74:
      return "pr-[74pt]";
    case 75:
      return "pr-[75pt]";
    case 76:
      return "pr-[76pt]";
    case 77:
      return "pr-[77pt]";
    case 78:
      return "pr-[78pt]";
    case 79:
      return "pr-[79pt]";
    case 80:
      return "pr-[80pt]";
    case 81:
      return "pr-[81pt]";
    case 82:
      return "pr-[82pt]";
    case 83:
      return "pr-[83pt]";
    case 84:
      return "pr-[84pt]";
    case 85:
      return "pr-[85pt]";
    case 86:
      return "pr-[86pt]";
    case 87:
      return "pr-[87pt]";
    case 88:
      return "pr-[88pt]";
    case 89:
      return "pr-[89pt]";
    case 90:
      return "pr-[90pt]";
    case 91:
      return "pr-[91pt]";
    case 92:
      return "pr-[92pt]";
    case 93:
      return "pr-[93pt]";
    case 94:
      return "pr-[94pt]";
    case 95:
      return "pr-[95pt]";
    case 96:
      return "pr-[96pt]";
    case 97:
      return "pr-[97pt]";
    case 98:
      return "pr-[98pt]";
    case 99:
      return "pr-[99pt]";
    case 100:
      return "pr-[100pt]";
    case 101:
      return "pr-[101pt]";
    case 102:
      return "pr-[102pt]";
    case 103:
      return "pr-[103pt]";
    case 104:
      return "pr-[104pt]";
    case 105:
      return "pr-[105pt]";
    case 106:
      return "pr-[106pt]";
    case 107:
      return "pr-[107pt]";
    case 108:
      return "pr-[108pt]";
    case 109:
      return "pr-[109pt]";
    case 110:
      return "pr-[110pt]";
    case 111:
      return "pr-[111pt]";
    case 112:
      return "pr-[112pt]";
    case 113:
      return "pr-[113pt]";
    case 114:
      return "pr-[114pt]";
    case 115:
      return "pr-[115pt]";
    case 116:
      return "pr-[116pt]";
    case 117:
      return "pr-[117pt]";
    case 118:
      return "pr-[118pt]";
    case 119:
      return "pr-[119pt]";
    case 120:
      return "pr-[120pt]";
    case 121:
      return "pr-[121pt]";
    case 122:
      return "pr-[122pt]";
    case 123:
      return "pr-[123pt]";
    case 124:
      return "pr-[124pt]";
    case 125:
      return "pr-[125pt]";
    case 126:
      return "pr-[126pt]";
    case 127:
      return "pr-[127pt]";
    case 128:
      return "pr-[128pt]";
    case 129:
      return "pr-[129pt]";
    case 130:
      return "pr-[130pt]";
    case 131:
      return "pr-[131pt]";
    case 132:
      return "pr-[132pt]";
    case 133:
      return "pr-[133pt]";
    case 134:
      return "pr-[134pt]";
    case 135:
      return "pr-[135pt]";
    case 136:
      return "pr-[136pt]";
    case 137:
      return "pr-[137pt]";
    case 138:
      return "pr-[138pt]";
    case 139:
      return "pr-[139pt]";
    case 140:
      return "pr-[140pt]";
    case 141:
      return "pr-[141pt]";
    case 142:
      return "pr-[142pt]";
    case 143:
      return "pr-[143pt]";
    case 144:
      return "pr-[144pt]";
    case 145:
      return "pr-[145pt]";
    case 146:
      return "pr-[146pt]";
    case 147:
      return "pr-[147pt]";
    case 148:
      return "pr-[148pt]";
    case 149:
      return "pr-[149pt]";
    case 150:
      return "pr-[150pt]";
    case 151:
      return "pr-[151pt]";
    case 152:
      return "pr-[152pt]";
    case 153:
      return "pr-[153pt]";
    case 154:
      return "pr-[154pt]";
    case 155:
      return "pr-[155pt]";
    case 156:
      return "pr-[156pt]";
    case 157:
      return "pr-[157pt]";
    case 158:
      return "pr-[158pt]";
    case 159:
      return "pr-[159pt]";
    case 160:
      return "pr-[160pt]";
    case 161:
      return "pr-[161pt]";
    case 162:
      return "pr-[162pt]";
    case 163:
      return "pr-[163pt]";
    case 164:
      return "pr-[164pt]";
    case 165:
      return "pr-[165pt]";
    case 166:
      return "pr-[166pt]";
    case 167:
      return "pr-[167pt]";
    case 168:
      return "pr-[168pt]";
    case 169:
      return "pr-[169pt]";
    case 170:
      return "pr-[170pt]";
    case 171:
      return "pr-[171pt]";
    case 172:
      return "pr-[172pt]";
    case 173:
      return "pr-[173pt]";
    case 174:
      return "pr-[174pt]";
    case 175:
      return "pr-[175pt]";
    case 176:
      return "pr-[176pt]";
    case 177:
      return "pr-[177pt]";
    case 178:
      return "pr-[178pt]";
    case 179:
      return "pr-[179pt]";
    case 180:
      return "pr-[180pt]";
    case 181:
      return "pr-[181pt]";
    case 182:
      return "pr-[182pt]";
    case 183:
      return "pr-[183pt]";
    case 184:
      return "pr-[184pt]";
    case 185:
      return "pr-[185pt]";
    case 186:
      return "pr-[186pt]";
    case 187:
      return "pr-[187pt]";
    case 188:
      return "pr-[188pt]";
    case 189:
      return "pr-[189pt]";
    case 190:
      return "pr-[190pt]";
    case 191:
      return "pr-[191pt]";
    case 192:
      return "pr-[192pt]";
    case 193:
      return "pr-[193pt]";
    case 194:
      return "pr-[194pt]";
    case 195:
      return "pr-[195pt]";
    case 196:
      return "pr-[196pt]";
    case 197:
      return "pr-[197pt]";
    case 198:
      return "pr-[198pt]";
    case 199:
      return "pr-[199pt]";
    case 200:
      return "pr-[200pt]";
    default:
      return "";
  }
}

function getBottomMarginValue(index: number): string {
  switch (index) {
    case 0:
      return "pb-[0pt]";
    case 1:
      return "pb-[1pt]";
    case 2:
      return "pb-[2pt]";
    case 3:
      return "pb-[3pt]";
    case 4:
      return "pb-[4pt]";
    case 5:
      return "pb-[5pt]";
    case 6:
      return "pb-[6pt]";
    case 7:
      return "pb-[7pt]";
    case 8:
      return "pb-[8pt]";
    case 9:
      return "pb-[9pt]";
    case 10:
      return "pb-[10pt]";
    case 11:
      return "pb-[11pt]";
    case 12:
      return "pb-[12pt]";
    case 13:
      return "pb-[13pt]";
    case 14:
      return "pb-[14pt]";
    case 15:
      return "pb-[15pt]";
    case 16:
      return "pb-[16pt]";
    case 17:
      return "pb-[17pt]";
    case 18:
      return "pb-[18pt]";
    case 19:
      return "pb-[19pt]";
    case 20:
      return "pb-[20pt]";
    case 21:
      return "pb-[21pt]";
    case 22:
      return "pb-[22pt]";
    case 23:
      return "pb-[23pt]";
    case 24:
      return "pb-[24pt]";
    case 25:
      return "pb-[25pt]";
    case 26:
      return "pb-[26pt]";
    case 27:
      return "pb-[27pt]";
    case 28:
      return "pb-[28pt]";
    case 29:
      return "pb-[29pt]";
    case 30:
      return "pb-[30pt]";
    case 31:
      return "pb-[31pt]";
    case 32:
      return "pb-[32pt]";
    case 33:
      return "pb-[33pt]";
    case 34:
      return "pb-[34pt]";
    case 35:
      return "pb-[35pt]";
    case 36:
      return "pb-[36pt]";
    case 37:
      return "pb-[37pt]";
    case 38:
      return "pb-[38pt]";
    case 39:
      return "pb-[39pt]";
    case 40:
      return "pb-[40pt]";
    case 41:
      return "pb-[41pt]";
    case 42:
      return "pb-[42pt]";
    case 43:
      return "pb-[43pt]";
    case 44:
      return "pb-[44pt]";
    case 45:
      return "pb-[45pt]";
    case 46:
      return "pb-[46pt]";
    case 47:
      return "pb-[47pt]";
    case 48:
      return "pb-[48pt]";
    case 49:
      return "pb-[49pt]";
    case 50:
      return "pb-[50pt]";
    case 51:
      return "pb-[51pt]";
    case 52:
      return "pb-[52pt]";
    case 53:
      return "pb-[53pt]";
    case 54:
      return "pb-[54pt]";
    case 55:
      return "pb-[55pt]";
    case 56:
      return "pb-[56pt]";
    case 57:
      return "pb-[57pt]";
    case 58:
      return "pb-[58pt]";
    case 59:
      return "pb-[59pt]";
    case 60:
      return "pb-[60pt]";
    case 61:
      return "pb-[61pt]";
    case 62:
      return "pb-[62pt]";
    case 63:
      return "pb-[63pt]";
    case 64:
      return "pb-[64pt]";
    case 65:
      return "pb-[65pt]";
    case 66:
      return "pb-[66pt]";
    case 67:
      return "pb-[67pt]";
    case 68:
      return "pb-[68pt]";
    case 69:
      return "pb-[69pt]";
    case 70:
      return "pb-[70pt]";
    case 71:
      return "pb-[71pt]";
    case 72:
      return "pb-[72pt]";
    case 73:
      return "pb-[73pt]";
    case 74:
      return "pb-[74pt]";
    case 75:
      return "pb-[75pt]";
    case 76:
      return "pb-[76pt]";
    case 77:
      return "pb-[77pt]";
    case 78:
      return "pb-[78pt]";
    case 79:
      return "pb-[79pt]";
    case 80:
      return "pb-[80pt]";
    case 81:
      return "pb-[81pt]";
    case 82:
      return "pb-[82pt]";
    case 83:
      return "pb-[83pt]";
    case 84:
      return "pb-[84pt]";
    case 85:
      return "pb-[85pt]";
    case 86:
      return "pb-[86pt]";
    case 87:
      return "pb-[87pt]";
    case 88:
      return "pb-[88pt]";
    case 89:
      return "pb-[89pt]";
    case 90:
      return "pb-[90pt]";
    case 91:
      return "pb-[91pt]";
    case 92:
      return "pb-[92pt]";
    case 93:
      return "pb-[93pt]";
    case 94:
      return "pb-[94pt]";
    case 95:
      return "pb-[95pt]";
    case 96:
      return "pb-[96pt]";
    case 97:
      return "pb-[97pt]";
    case 98:
      return "pb-[98pt]";
    case 99:
      return "pb-[99pt]";
    case 100:
      return "pb-[100pt]";
    case 101:
      return "pb-[101pt]";
    case 102:
      return "pb-[102pt]";
    case 103:
      return "pb-[103pt]";
    case 104:
      return "pb-[104pt]";
    case 105:
      return "pb-[105pt]";
    case 106:
      return "pb-[106pt]";
    case 107:
      return "pb-[107pt]";
    case 108:
      return "pb-[108pt]";
    case 109:
      return "pb-[109pt]";
    case 110:
      return "pb-[110pt]";
    case 111:
      return "pb-[111pt]";
    case 112:
      return "pb-[112pt]";
    case 113:
      return "pb-[113pt]";
    case 114:
      return "pb-[114pt]";
    case 115:
      return "pb-[115pt]";
    case 116:
      return "pb-[116pt]";
    case 117:
      return "pb-[117pt]";
    case 118:
      return "pb-[118pt]";
    case 119:
      return "pb-[119pt]";
    case 120:
      return "pb-[120pt]";
    case 121:
      return "pb-[121pt]";
    case 122:
      return "pb-[122pt]";
    case 123:
      return "pb-[123pt]";
    case 124:
      return "pb-[124pt]";
    case 125:
      return "pb-[125pt]";
    case 126:
      return "pb-[126pt]";
    case 127:
      return "pb-[127pt]";
    case 128:
      return "pb-[128pt]";
    case 129:
      return "pb-[129pt]";
    case 130:
      return "pb-[130pt]";
    case 131:
      return "pb-[131pt]";
    case 132:
      return "pb-[132pt]";
    case 133:
      return "pb-[133pt]";
    case 134:
      return "pb-[134pt]";
    case 135:
      return "pb-[135pt]";
    case 136:
      return "pb-[136pt]";
    case 137:
      return "pb-[137pt]";
    case 138:
      return "pb-[138pt]";
    case 139:
      return "pb-[139pt]";
    case 140:
      return "pb-[140pt]";
    case 141:
      return "pb-[141pt]";
    case 142:
      return "pb-[142pt]";
    case 143:
      return "pb-[143pt]";
    case 144:
      return "pb-[144pt]";
    case 145:
      return "pb-[145pt]";
    case 146:
      return "pb-[146pt]";
    case 147:
      return "pb-[147pt]";
    case 148:
      return "pb-[148pt]";
    case 149:
      return "pb-[149pt]";
    case 150:
      return "pb-[150pt]";
    case 151:
      return "pb-[151pt]";
    case 152:
      return "pb-[152pt]";
    case 153:
      return "pb-[153pt]";
    case 154:
      return "pb-[154pt]";
    case 155:
      return "pb-[155pt]";
    case 156:
      return "pb-[156pt]";
    case 157:
      return "pb-[157pt]";
    case 158:
      return "pb-[158pt]";
    case 159:
      return "pb-[159pt]";
    case 160:
      return "pb-[160pt]";
    case 161:
      return "pb-[161pt]";
    case 162:
      return "pb-[162pt]";
    case 163:
      return "pb-[163pt]";
    case 164:
      return "pb-[164pt]";
    case 165:
      return "pb-[165pt]";
    case 166:
      return "pb-[166pt]";
    case 167:
      return "pb-[167pt]";
    case 168:
      return "pb-[168pt]";
    case 169:
      return "pb-[169pt]";
    case 170:
      return "pb-[170pt]";
    case 171:
      return "pb-[171pt]";
    case 172:
      return "pb-[172pt]";
    case 173:
      return "pb-[173pt]";
    case 174:
      return "pb-[174pt]";
    case 175:
      return "pb-[175pt]";
    case 176:
      return "pb-[176pt]";
    case 177:
      return "pb-[177pt]";
    case 178:
      return "pb-[178pt]";
    case 179:
      return "pb-[179pt]";
    case 180:
      return "pb-[180pt]";
    case 181:
      return "pb-[181pt]";
    case 182:
      return "pb-[182pt]";
    case 183:
      return "pb-[183pt]";
    case 184:
      return "pb-[184pt]";
    case 185:
      return "pb-[185pt]";
    case 186:
      return "pb-[186pt]";
    case 187:
      return "pb-[187pt]";
    case 188:
      return "pb-[188pt]";
    case 189:
      return "pb-[189pt]";
    case 190:
      return "pb-[190pt]";
    case 191:
      return "pb-[191pt]";
    case 192:
      return "pb-[192pt]";
    case 193:
      return "pb-[193pt]";
    case 194:
      return "pb-[194pt]";
    case 195:
      return "pb-[195pt]";
    case 196:
      return "pb-[196pt]";
    case 197:
      return "pb-[197pt]";
    case 198:
      return "pb-[198pt]";
    case 199:
      return "pb-[199pt]";
    case 200:
      return "pb-[200pt]";
    default:
      return "";
  }
}
