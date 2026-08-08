"use client";

import React from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Button } from "@workspace/ui/components/button";
import { Toggle } from "@workspace/ui/components/toggle";
import {
  ColorPicker,
  ColorPickerAlphaSlider,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerEyeDropper,
  ColorPickerFormatSelect,
  ColorPickerHueSlider,
  ColorPickerInput,
  ColorPickerSwatch,
  ColorPickerTrigger,
} from "@workspace/ui/components/color-picker";
import { fontFamilies, fontSizes } from "@/lib/fonts";
import { ComboboxFont } from "./combobox-font";

interface ToolbarProps {
  editor: Editor | null;
}

export default function Toolbar({ editor }: ToolbarProps) {
  const loadFonts = async () => {
    const WebFont = await import("webfontloader");
    WebFont.load({
      google: {
        families: fontFamilies.map((font) => `${font}:400,700`),
      },
    });
  };

  if (!editor) {
    return null;
  }

  void loadFonts();

  return (
    <div className="flex justify-between items-start mx-6">
      <div className="flex items-center justify-center gap-1">
        <ComboboxFont
          setValue={async (value) => {
            const WebFont = (await import("webfontloader")).default;
            WebFont.load({
              google: {
                families: [`${value}:400,700`],
              },
            });
            editor.chain().focus().setFontFamily(value).run();
          }}
          value={
            fontFamilies.find((font) =>
              editor.isActive("textStyle", { fontFamily: font }),
            ) || "Roboto"
          }
        />
        <Select
          defaultValue="12"
          onValueChange={(value) =>
            editor.chain().focus().setFontSize(`${value}pt`).run()
          }
          value={
            fontSizes.find((size) =>
              editor.isActive("textStyle", { fontSize: `${size}pt` }),
            ) || "12"
          }
        >
          <SelectTrigger className="w-20!">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontSizes.map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ColorPicker
          value={editor.getAttributes("textStyle").color || "#000000"}
          onValueChange={(color) => {
            editor.chain().focus().setColor(color).run();
          }}
          defaultFormat="hex"
        >
          <ColorPickerTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              data-testid="setColor"
            >
              <ColorPickerSwatch className="size-4" />
            </Button>
          </ColorPickerTrigger>
          <ColorPickerContent>
            <ColorPickerArea />
            <div className="flex items-center gap-2">
              <ColorPickerEyeDropper />
              <div className="flex flex-1 flex-col gap-2">
                <ColorPickerHueSlider />
                <ColorPickerAlphaSlider />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ColorPickerFormatSelect />
              <ColorPickerInput />
            </div>
          </ColorPickerContent>
        </ColorPicker>
        <Toggle
          disabled={!editor.can().chain().focus().toggleBold().run()}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          pressed={editor.isActive("bold")}
          size="sm"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          pressed={editor.isActive("heading", { level: 1 })}
          size="sm"
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          pressed={editor.isActive("heading", { level: 2 })}
          size="sm"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          pressed={editor.isActive("heading", { level: 3 })}
          size="sm"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 4 }).run()
          }
          pressed={editor.isActive("heading", { level: 4 })}
          size="sm"
        >
          <Heading4 className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 5 }).run()
          }
          pressed={editor.isActive("heading", { level: 5 })}
          size="sm"
        >
          <Heading5 className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 6 }).run()
          }
          pressed={editor.isActive("heading", { level: 6 })}
          size="sm"
        >
          <Heading6 className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() =>
            editor.chain().focus().setTextAlign("left").run()
          }
          pressed={editor.isActive({ textAlign: "left" })}
          size="sm"
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() =>
            editor.chain().focus().setTextAlign("center").run()
          }
          pressed={editor.isActive({ textAlign: "center" })}
          size="sm"
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() =>
            editor.chain().focus().setTextAlign("right").run()
          }
          pressed={editor.isActive({ textAlign: "right" })}
          size="sm"
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() =>
            editor.chain().focus().setTextAlign("justify").run()
          }
          pressed={editor.isActive({ textAlign: "justify" })}
          size="sm"
        >
          <AlignJustify className="h-4 w-4" />
        </Toggle>
      </div>
      <div className="flex items-center justify-center gap-1">
        <Button
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
          size="sm"
          variant="ghost"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
          size="sm"
          variant="ghost"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
