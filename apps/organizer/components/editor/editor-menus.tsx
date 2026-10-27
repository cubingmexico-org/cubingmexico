"use client";

import type { Editor } from "@tiptap/react";
import {
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@workspace/ui/components/menubar";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Clipboard,
  Files,
  Heading,
  Plus,
  Redo,
  RemoveFormatting,
  Scissors,
  Sheet,
  TableCellsMerge,
  TableCellsSplit,
  TextSelect,
  Trash2,
  Undo,
} from "lucide-react";
import Submenu from "./submenu";

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export function EditMenu({ editor }: { editor: Editor }) {
  return (
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
  );
}

export function InsertMenu({ editor }: { editor: Editor }) {
  return (
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
  );
}

export function FormatMenu({ editor }: { editor: Editor }) {
  return (
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
            {HEADING_LEVELS.map((level) => (
              <MenubarCheckboxItem
                key={level}
                checked={editor.isActive("heading", { level })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level }).run()
                }
              >
                Encabezado {level}
              </MenubarCheckboxItem>
            ))}
          </MenubarSubContent>
        </MenubarSub>
        <MenubarSub>
          <MenubarSubTrigger className="[&_svg:not([class*='size-'])]:size-4 gap-2">
            <AlignLeft />
            Alinear
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
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
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
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
  );
}
