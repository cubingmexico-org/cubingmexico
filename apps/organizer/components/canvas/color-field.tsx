"use client";

import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
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

interface ColorFieldProps {
  id: string;
  label: string;
  value: string | undefined;
  fallback: string;
  onValueChange: (color: string) => void;
}

/** Labeled color picker that only reports colors different from `value`. */
export function ColorField({
  id,
  label,
  value,
  fallback,
  onValueChange,
}: ColorFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <ColorPicker
        value={value || fallback}
        onValueChange={(color) => {
          if (color !== value) {
            onValueChange(color);
          }
        }}
        defaultFormat="hex"
        className="w-full"
      >
        <div className="flex items-center gap-3">
          <ColorPickerTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 px-3">
              <ColorPickerSwatch className="size-4" />
              {value || fallback}
            </Button>
          </ColorPickerTrigger>
        </div>
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
    </div>
  );
}
