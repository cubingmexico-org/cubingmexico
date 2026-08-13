"use client";

import React from "react";
import type { Editor } from "@tiptap/react";
import {
  MenubarItem,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
} from "@workspace/ui/components/menubar";

interface SubmenuProps {
  editor: Editor | null;
}

export default function Submenu({ editor }: SubmenuProps) {
  if (!editor) {
    return null;
  }

  return (
    <MenubarSub>
      <MenubarSubTrigger>Uso de mayúsculas</MenubarSubTrigger>
      <MenubarSubContent>
        <MenubarItem
          onClick={() => editor.chain().focus().setTransform("lowercase").run()}
        >
          minúsculas
        </MenubarItem>
        <MenubarItem
          onClick={() => editor.chain().focus().setTransform("uppercase").run()}
        >
          MAYÚSCULAS
        </MenubarItem>
        <MenubarItem
          onClick={() =>
            editor.chain().focus().setTransform("capitalize").run()
          }
        >
          Todas Las Palabras Con Mayúscula
        </MenubarItem>
      </MenubarSubContent>
    </MenubarSub>
  );
}
