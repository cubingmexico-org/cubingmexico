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
  MenubarSeparator,
  MenubarTrigger,
} from "@workspace/ui/components/menubar";
import {
  RotateCcw,
  FileDown,
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
import { DEFAULT_TEMPLATES } from "@/data/certificates";
import Toolbar from "./toolbar";
import suggestionPodiumEs from "./mentions/suggestions/suggestion-podium";
import suggestionParticipationEs from "./mentions/suggestions/suggestion-participation";
import { EditMenu, FormatMenu, InsertMenu } from "./editor-menus";
import { isSavedDocumentFile, type SavedDocumentFile } from "./saved-document";

const MAX_PAGE_MARGIN = 200;

// Only [left, top] or [left, top, right, bottom] arrays are applied in the editor.
function marginsToPadding(pageMargins: Margins): string {
  if (!Array.isArray(pageMargins)) {
    return "";
  }

  const sides: [string, number | undefined][] = [
    ["left", pageMargins[0]],
    ["top", pageMargins[1]],
    ["right", pageMargins.length === 4 ? pageMargins[2] : undefined],
    ["bottom", pageMargins.length === 4 ? pageMargins[3] : undefined],
  ];

  return sides
    .filter(
      (side): side is [string, number] =>
        side[1] !== undefined && side[1] >= 0 && side[1] <= MAX_PAGE_MARGIN,
    )
    .map(([side, value]) => `padding-${side}: ${value}pt; `)
    .join("");
}

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
      // No italic font files are bundled, so italics could not be exported to PDF.
      StarterKit.configure({ italic: false }),
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
        style:
          marginsToPadding(pageMargins) +
          (background
            ? `background-image: url(${background}); background-size: contain; background-repeat: no-repeat; background-position: center;`
            : ""),
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
              disabled={content === DEFAULT_TEMPLATES[variant].content}
              onClick={() => applyDocumentFile(DEFAULT_TEMPLATES[variant])}
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
        <EditMenu editor={editor} />
        <InsertMenu editor={editor} />
        <FormatMenu editor={editor} />
      </Menubar>
      <Toolbar editor={editor} />
      <div className="flex justify-center bg-secondary py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
