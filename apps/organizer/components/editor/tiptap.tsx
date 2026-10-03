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
  Cloud,
  CloudDownload,
  LayoutTemplate,
  Download,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DialogDocumentSettings } from "@/components/editor/dialog-document-settings";
import { TextTransform } from "@/components/editor/extensions/text-transform";
import { FontSize } from "@/components/editor/extensions/font-size";
import { DesignLibraryDialog } from "@/components/design-library-dialog";
import { participation, podium } from "@/data/certificates";
import Toolbar from "./toolbar";
import suggestionPodiumEs from "./mentions/suggestions/suggestion-podium";
import suggestionParticipationEs from "./mentions/suggestions/suggestion-participation";
import Submenu from "./submenu";
import {
  getBottomMarginValue,
  getLeftMarginValue,
  getRightMarginValue,
  getTopMarginValue,
} from "./margin-classes";
import { isSavedDocumentFile, type SavedDocumentFile } from "./saved-document";

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
  const [cloudMode, setCloudMode] = useState<
    "save" | "load" | "templates" | null
  >(null);

  const designModule =
    variant === "podium" ? "certificate_podium" : "certificate_participation";

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

  const getDocumentFile = (): SavedDocumentFile => ({
    content: editor.getJSON(),
    pageConfig: {
      pageSize,
      pageOrientation,
      pageMargins,
    },
  });

  const applyDocumentFile = (value: unknown) => {
    if (!isSavedDocumentFile(value)) {
      toast.error("El diseño no tiene un formato válido de certificado.");
      return;
    }
    setPageSize(value.pageConfig.pageSize);
    setPageOrientation(value.pageConfig.pageOrientation);
    setPageMargins(value.pageConfig.pageMargins);
    editor.commands.setContent(value.content);
    handleChange(value.content);
  };

  const saveContent = () => {
    const documentFile = getDocumentFile();
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
        applyDocumentFile(parsed);
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
      {cloudMode ? (
        <DesignLibraryDialog
          open
          onOpenChange={(open) => {
            if (!open) setCloudMode(null);
          }}
          mode={cloudMode}
          competitionId={competitionId}
          module={designModule}
          getJson={() => getDocumentFile()}
          onApply={(json) => applyDocumentFile(json)}
        />
      ) : null}
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
            <MenubarItem onClick={() => setCloudMode("save")}>
              <Cloud />
              Guardar en la nube
            </MenubarItem>
            <MenubarItem onClick={() => setCloudMode("load")}>
              <CloudDownload />
              Cargar desde la nube
            </MenubarItem>
            <MenubarItem onClick={() => setCloudMode("templates")}>
              <LayoutTemplate />
              Plantillas
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={saveContent}>
              <Download />
              Descargar JSON
            </MenubarItem>
            <MenubarItem onClick={loadContent}>
              <Upload />
              Subir JSON
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
