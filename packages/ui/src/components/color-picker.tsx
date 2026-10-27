"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { PipetteIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  type ColorFormat,
  colorFormats,
  type ColorValue,
  colorToString,
  colorsEqual,
  type HSVColorValue,
  hexToRgb,
  hslToRgb,
  hsvEqual,
  hsvToRgb,
  parseColorString,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
} from "@workspace/ui/lib/color";
import { useComposedRefs } from "@workspace/ui/lib/compose-refs";
import { cn } from "@workspace/ui/lib/utils";
import { VisuallyHiddenInput } from "@workspace/ui/components/visually-hidden-input";

/**
 * @see https://gist.github.com/bkrmendy/f4582173f50fab209ddfef1377ab31e3
 */
interface EyeDropper {
  open: (options?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }>;
}

declare global {
  interface Window {
    EyeDropper?: {
      new (): EyeDropper;
    };
  }
}

type Direction = "ltr" | "rtl";

const DirectionContext = React.createContext<Direction | undefined>(undefined);

function useDirection(dirProp?: Direction): Direction {
  const contextDir = React.useContext(DirectionContext);
  return dirProp ?? contextDir ?? "ltr";
}

function useLazyRef<T>(fn: () => T) {
  const ref = React.useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = fn();
  }

  return ref as React.RefObject<T>;
}

interface ColorPickerStoreState {
  color: ColorValue;
  hsv: HSVColorValue;
  open: boolean;
  format: ColorFormat;
}

interface ColorPickerStoreCallbacks {
  onColorChange?: (colorString: string) => void;
  onOpenChange?: (open: boolean) => void;
  onFormatChange?: (format: ColorFormat) => void;
}

interface ColorPickerStore {
  subscribe: (cb: () => void) => () => void;
  getState: () => ColorPickerStoreState;
  setColor: (value: ColorValue) => void;
  setHsv: (value: HSVColorValue) => void;
  syncValue: (color: ColorValue, hsv: HSVColorValue) => void;
  setOpen: (value: boolean) => void;
  setFormat: (value: ColorFormat) => void;
  notify: () => void;
}

function createColorPickerStore(
  listenersRef: React.RefObject<Set<() => void>>,
  stateRef: React.RefObject<ColorPickerStoreState>,
  callbacksRef: React.RefObject<ColorPickerStoreCallbacks>,
): ColorPickerStore {
  const store: ColorPickerStore = {
    subscribe: (cb) => {
      if (listenersRef.current) {
        listenersRef.current.add(cb);
        return () => listenersRef.current?.delete(cb);
      }
      return () => {};
    },
    getState: () =>
      stateRef.current || {
        color: { r: 0, g: 0, b: 0, a: 1 },
        hsv: { h: 0, s: 0, v: 0, a: 1 },
        open: false,
        format: "hex" as ColorFormat,
      },
    setColor: (value: ColorValue) => {
      if (!stateRef.current) return;
      if (colorsEqual(stateRef.current.color, value)) return;

      const prevState = { ...stateRef.current };
      stateRef.current.color = value;

      const colorString = colorToString(value, prevState.format);
      callbacksRef.current?.onColorChange?.(colorString);

      store.notify();
    },
    setHsv: (value: HSVColorValue) => {
      if (!stateRef.current) return;
      if (hsvEqual(stateRef.current.hsv, value)) return;

      const prevState = { ...stateRef.current };
      stateRef.current.hsv = value;

      const colorValue = hsvToRgb(value);
      const colorString = colorToString(colorValue, prevState.format);
      callbacksRef.current?.onColorChange?.(colorString);

      store.notify();
    },
    // Sync controlled `value` into internal state without notifying the parent.
    syncValue: (color: ColorValue, hsv: HSVColorValue) => {
      if (!stateRef.current) return;
      const colorChanged = !colorsEqual(stateRef.current.color, color);
      const hsvChanged = !hsvEqual(stateRef.current.hsv, hsv);
      if (!colorChanged && !hsvChanged) return;

      if (colorChanged) stateRef.current.color = color;
      if (hsvChanged) stateRef.current.hsv = hsv;
      store.notify();
    },
    setOpen: (value: boolean) => {
      if (!stateRef.current) return;
      if (Object.is(stateRef.current.open, value)) return;

      stateRef.current.open = value;

      callbacksRef.current?.onOpenChange?.(value);

      store.notify();
    },
    setFormat: (value: ColorFormat) => {
      if (!stateRef.current) return;
      if (Object.is(stateRef.current.format, value)) return;

      stateRef.current.format = value;

      callbacksRef.current?.onFormatChange?.(value);

      store.notify();
    },
    notify: () => {
      if (listenersRef.current) {
        for (const cb of listenersRef.current) {
          cb();
        }
      }
    },
  };

  return store;
}

function useColorPickerStoreContext(consumerName: string) {
  const context = React.useContext(ColorPickerStoreContext);
  if (!context) {
    throw new Error(
      `\`${consumerName}\` must be used within \`ColorPickerRoot\``,
    );
  }
  return context;
}

function useColorPickerStore<U>(
  selector: (state: ColorPickerStoreState) => U,
): U {
  const store = useColorPickerStoreContext("useColorPickerStoreSelector");

  const getSnapshot = React.useCallback(
    () => selector(store.getState()),
    [store, selector],
  );

  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface ColorPickerContextValue {
  dir: Direction;
  disabled?: boolean;
  inline?: boolean;
  readOnly?: boolean;
  required?: boolean;
}

const ColorPickerStoreContext = React.createContext<ColorPickerStore | null>(
  null,
);
const ColorPickerContext = React.createContext<ColorPickerContextValue | null>(
  null,
);

function useColorPickerContext(consumerName: string) {
  const context = React.useContext(ColorPickerContext);
  if (!context) {
    throw new Error(
      `\`${consumerName}\` must be used within \`ColorPickerRoot\``,
    );
  }
  return context;
}

interface ColorPickerRootProps
  extends
    Omit<React.ComponentProps<"div">, "onValueChange">,
    Pick<
      React.ComponentProps<typeof Popover>,
      "defaultOpen" | "open" | "onOpenChange" | "modal"
    > {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  dir?: Direction;
  format?: ColorFormat;
  defaultFormat?: ColorFormat;
  onFormatChange?: (format: ColorFormat) => void;
  name?: string;
  asChild?: boolean;
  disabled?: boolean;
  inline?: boolean;
  readOnly?: boolean;
  required?: boolean;
}

function ColorPickerRoot(props: ColorPickerRootProps) {
  const {
    value: valueProp,
    defaultValue = "#000000",
    onValueChange,
    format: formatProp,
    defaultFormat = "hex",
    onFormatChange,
    defaultOpen,
    open: openProp,
    onOpenChange,
    name,
    disabled,
    inline,
    readOnly,
    required,
    ...rootProps
  } = props;

  const initialColor = React.useMemo(() => {
    const colorString = valueProp ?? defaultValue;
    const color = hexToRgb(colorString);

    return {
      color,
      hsv: rgbToHsv(color),
      open: openProp ?? defaultOpen ?? false,
      format: formatProp ?? defaultFormat,
    };
  }, [
    valueProp,
    defaultValue,
    formatProp,
    defaultFormat,
    openProp,
    defaultOpen,
  ]);

  const stateRef = useLazyRef(() => initialColor);
  const listenersRef = useLazyRef(() => new Set<() => void>());
  const callbacksRef = React.useRef<ColorPickerStoreCallbacks>({
    onColorChange: onValueChange,
    onOpenChange: onOpenChange,
    onFormatChange: onFormatChange,
  });
  // eslint-disable-next-line react-hooks/refs -- latest-callbacks ref, read only from store event handlers
  callbacksRef.current = {
    onColorChange: onValueChange,
    onOpenChange: onOpenChange,
    onFormatChange: onFormatChange,
  };

  const store = React.useMemo(
    // eslint-disable-next-line react-hooks/refs -- the store keeps the ref objects and reads them outside render
    () => createColorPickerStore(listenersRef, stateRef, callbacksRef),
    [listenersRef, stateRef],
  );

  return (
    <ColorPickerStoreContext.Provider value={store}>
      <ColorPickerRootImpl
        {...rootProps}
        value={valueProp}
        defaultOpen={defaultOpen}
        open={openProp}
        onOpenChange={onOpenChange}
        name={name}
        disabled={disabled}
        inline={inline}
        readOnly={readOnly}
        required={required}
      />
    </ColorPickerStoreContext.Provider>
  );
}

type ColorPickerRootImplProps = Omit<
  ColorPickerRootProps,
  | "defaultValue"
  | "onValueChange"
  | "format"
  | "defaultFormat"
  | "onFormatChange"
>;

function ColorPickerRootImpl(props: ColorPickerRootImplProps) {
  const {
    value: valueProp,
    dir: dirProp,
    defaultOpen,
    open: openProp,
    onOpenChange,
    name,
    ref,
    asChild,
    disabled,
    inline,
    modal,
    readOnly,
    required,
    ...rootProps
  } = props;

  const store = useColorPickerStoreContext("ColorPickerRootImpl");

  const dir = useDirection(dirProp);

  const [formTrigger, setFormTrigger] = React.useState<HTMLDivElement | null>(
    null,
  );
  const composedRef = useComposedRefs(ref, (node) => setFormTrigger(node));

  const isFormControl = formTrigger ? !!formTrigger.closest("form") : true;

  React.useEffect(() => {
    if (valueProp === undefined) return;
    const currentState = store.getState();
    const color = hexToRgb(valueProp, currentState.color.a);
    const hsv = rgbToHsv(color);
    store.syncValue(color, hsv);
  }, [valueProp, store]);

  React.useEffect(() => {
    if (openProp !== undefined) {
      store.setOpen(openProp);
    }
  }, [openProp, store]);

  const contextValue = React.useMemo<ColorPickerContextValue>(
    () => ({
      dir,
      disabled,
      inline,
      readOnly,
      required,
    }),
    [dir, disabled, inline, readOnly, required],
  );

  const value = useColorPickerStore((state) => rgbToHex(state.color));

  const open = useColorPickerStore((state) => state.open);

  const onPopoverOpenChange = React.useCallback(
    (newOpen: boolean) => {
      store.setOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only store.setOpen is used, not the whole store
    [store.setOpen, onOpenChange],
  );

  const RootPrimitive = asChild ? Slot : "div";

  if (inline) {
    return (
      <ColorPickerContext.Provider value={contextValue}>
        <RootPrimitive {...rootProps} ref={composedRef} />
        {isFormControl && (
          <VisuallyHiddenInput
            type="hidden"
            control={formTrigger}
            name={name}
            value={value}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
          />
        )}
      </ColorPickerContext.Provider>
    );
  }

  return (
    <ColorPickerContext.Provider value={contextValue}>
      <Popover
        defaultOpen={defaultOpen}
        open={open}
        onOpenChange={onPopoverOpenChange}
        modal={modal}
      >
        <RootPrimitive {...rootProps} ref={composedRef} />
        {isFormControl && (
          <VisuallyHiddenInput
            type="hidden"
            control={formTrigger}
            name={name}
            value={value}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
          />
        )}
      </Popover>
    </ColorPickerContext.Provider>
  );
}

type ColorPickerTriggerProps = React.ComponentProps<typeof PopoverTrigger>;

function ColorPickerTrigger(props: ColorPickerTriggerProps) {
  const { asChild, ...triggerProps } = props;
  const context = useColorPickerContext("ColorPickerTrigger");

  const TriggerPrimitive = asChild ? Slot : Button;

  return (
    <PopoverTrigger asChild disabled={context.disabled}>
      <TriggerPrimitive data-slot="color-picker-trigger" {...triggerProps} />
    </PopoverTrigger>
  );
}

type ColorPickerContentProps = React.ComponentProps<typeof PopoverContent>;

function ColorPickerContent(props: ColorPickerContentProps) {
  const { asChild, className, children, ...popoverContentProps } = props;
  const context = useColorPickerContext("ColorPickerContent");

  if (context.inline) {
    const ContentPrimitive = asChild ? Slot : "div";

    return (
      <ContentPrimitive
        data-slot="color-picker-content"
        {...popoverContentProps}
        className={cn("flex w-85 flex-col gap-4 p-4", className)}
      >
        {children}
      </ContentPrimitive>
    );
  }

  return (
    <PopoverContent
      data-slot="color-picker-content"
      asChild={asChild}
      {...popoverContentProps}
      className={cn("flex w-85 flex-col gap-4 p-4", className)}
    >
      {children}
    </PopoverContent>
  );
}

interface ColorPickerAreaProps extends React.ComponentProps<"div"> {
  asChild?: boolean;
}

function ColorPickerArea(props: ColorPickerAreaProps) {
  const { asChild, className, ref, ...areaProps } = props;
  const context = useColorPickerContext("ColorPickerArea");
  const store = useColorPickerStoreContext("ColorPickerArea");

  const hsv = useColorPickerStore((state) => state.hsv);

  const isDraggingRef = React.useRef(false);
  const areaRef = React.useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs(ref, areaRef);

  const updateColorFromPosition = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!areaRef.current) return;

      const rect = areaRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(
        0,
        Math.min(1, 1 - (clientY - rect.top) / rect.height),
      );

      const newHsv: HSVColorValue = {
        h: hsv?.h ?? 0,
        s: Math.round(x * 100),
        v: Math.round(y * 100),
        a: hsv?.a ?? 1,
      };

      store.setHsv(newHsv);
      store.setColor(hsvToRgb(newHsv));
    },
    [hsv, store],
  );

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent) => {
      if (context.disabled) return;

      isDraggingRef.current = true;
      areaRef.current?.setPointerCapture(event.pointerId);
      updateColorFromPosition(event.clientX, event.clientY);
    },
    [context.disabled, updateColorFromPosition],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent) => {
      if (isDraggingRef.current) {
        updateColorFromPosition(event.clientX, event.clientY);
      }
    },
    [updateColorFromPosition],
  );

  const onPointerUp = React.useCallback((event: React.PointerEvent) => {
    isDraggingRef.current = false;
    areaRef.current?.releasePointerCapture(event.pointerId);
  }, []);

  const hue = hsv?.h ?? 0;
  const backgroundHue = hsvToRgb({ h: hue, s: 100, v: 100, a: 1 });

  const AreaPrimitive = asChild ? Slot : "div";

  return (
    <AreaPrimitive
      data-slot="color-picker-area"
      {...areaProps}
      className={cn(
        "relative h-40 w-full cursor-crosshair touch-none rounded-sm border",
        context.disabled && "pointer-events-none opacity-50",
        className,
      )}
      ref={composedRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="absolute inset-0 overflow-hidden rounded-sm">
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: `rgb(${backgroundHue.r}, ${backgroundHue.g}, ${backgroundHue.b})`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, #fff, transparent)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, transparent, #000)",
          }}
        />
      </div>
      <div
        className="-translate-x-1/2 -translate-y-1/2 absolute size-3 rounded-full border-2 border-white shadow-sm"
        style={{
          left: `${hsv?.s ?? 0}%`,
          top: `${100 - (hsv?.v ?? 0)}%`,
        }}
      />
    </AreaPrimitive>
  );
}

type ColorPickerHueSliderProps = React.ComponentProps<
  typeof SliderPrimitive.Root
>;

function ColorPickerHueSlider(props: ColorPickerHueSliderProps) {
  const { className, ...sliderProps } = props;
  const context = useColorPickerContext("ColorPickerHueSlider");
  const store = useColorPickerStoreContext("ColorPickerHueSlider");

  const hsv = useColorPickerStore((state) => state.hsv);

  const onValueChange = React.useCallback(
    (values: number[]) => {
      const newHsv: HSVColorValue = {
        h: values[0] ?? 0,
        s: hsv?.s ?? 0,
        v: hsv?.v ?? 0,
        a: hsv?.a ?? 1,
      };
      store.setHsv(newHsv);
      store.setColor(hsvToRgb(newHsv));
    },
    [hsv, store],
  );

  return (
    <SliderPrimitive.Root
      data-slot="color-picker-hue-slider"
      {...sliderProps}
      max={360}
      step={1}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className,
      )}
      value={[hsv?.h ?? 0]}
      onValueChange={onValueChange}
      disabled={context.disabled}
    >
      <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-[linear-gradient(to_right,#ff0000_0%,#ffff00_16.66%,#00ff00_33.33%,#00ffff_50%,#0000ff_66.66%,#ff00ff_83.33%,#ff0000_100%)]">
        <SliderPrimitive.Range className="absolute h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
}

type ColorPickerAlphaSliderProps = React.ComponentProps<
  typeof SliderPrimitive.Root
>;

function ColorPickerAlphaSlider(props: ColorPickerAlphaSliderProps) {
  const { className, ...sliderProps } = props;
  const context = useColorPickerContext("ColorPickerAlphaSlider");
  const store = useColorPickerStoreContext("ColorPickerAlphaSlider");

  const color = useColorPickerStore((state) => state.color);
  const hsv = useColorPickerStore((state) => state.hsv);

  const onValueChange = React.useCallback(
    (values: number[]) => {
      const alpha = (values[0] ?? 0) / 100;
      const newColor = { ...color, a: alpha };
      const newHsv = { ...hsv, a: alpha };
      store.setColor(newColor);
      store.setHsv(newHsv);
    },
    [color, hsv, store],
  );

  const gradientColor = `rgb(${color?.r ?? 0}, ${color?.g ?? 0}, ${color?.b ?? 0})`;

  return (
    <SliderPrimitive.Root
      data-slot="color-picker-alpha-slider"
      {...sliderProps}
      max={100}
      step={1}
      disabled={context.disabled}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className,
      )}
      value={[Math.round((color?.a ?? 1) * 100)]}
      onValueChange={onValueChange}
    >
      <SliderPrimitive.Track
        className="relative h-3 w-full grow overflow-hidden rounded-full"
        style={{
          background:
            "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(to right, transparent, ${gradientColor})`,
          }}
        />
        <SliderPrimitive.Range className="absolute h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
}

interface ColorPickerSwatchProps extends React.ComponentProps<"div"> {
  asChild?: boolean;
}

function ColorPickerSwatch(props: ColorPickerSwatchProps) {
  const { asChild, className, ...swatchProps } = props;
  const context = useColorPickerContext("ColorPickerSwatch");

  const color = useColorPickerStore((state) => state.color);
  const format = useColorPickerStore((state) => state.format);

  const backgroundStyle = React.useMemo(() => {
    if (!color) {
      return {
        background:
          "linear-gradient(to bottom right, transparent calc(50% - 1px), hsl(var(--destructive)) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) no-repeat",
      };
    }

    const colorString = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

    if (color.a < 1) {
      return {
        background: `linear-gradient(${colorString}, ${colorString}), repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0% 50% / 8px 8px`,
      };
    }

    return {
      backgroundColor: colorString,
    };
  }, [color]);

  const ariaLabel = !color
    ? "No color selected"
    : `Current color: ${colorToString(color, format)}`;

  const SwatchPrimitive = asChild ? Slot : "div";

  return (
    <SwatchPrimitive
      role="img"
      aria-label={ariaLabel}
      data-slot="color-picker-swatch"
      {...swatchProps}
      className={cn(
        "box-border size-8 rounded-sm border shadow-sm",
        context.disabled && "opacity-50",
        className,
      )}
      style={{
        ...backgroundStyle,
        forcedColorAdjust: "none",
      }}
    />
  );
}

type ColorPickerEyeDropperProps = React.ComponentProps<typeof Button>;

function ColorPickerEyeDropper(props: ColorPickerEyeDropperProps) {
  const { children, size, ...buttonProps } = props;
  const context = useColorPickerContext("ColorPickerEyeDropper");
  const store = useColorPickerStoreContext("ColorPickerEyeDropper");

  const color = useColorPickerStore((state) => state.color);

  const onEyeDropper = React.useCallback(async () => {
    if (!window.EyeDropper) return;

    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();

      if (result.sRGBHex) {
        const currentAlpha = color?.a ?? 1;
        const newColor = hexToRgb(result.sRGBHex, currentAlpha);
        const newHsv = rgbToHsv(newColor);
        store.setColor(newColor);
        store.setHsv(newHsv);
      }
    } catch (error) {
      console.warn("EyeDropper error:", error);
    }
  }, [color, store]);

  const hasEyeDropper = typeof window !== "undefined" && !!window.EyeDropper;

  if (!hasEyeDropper) return null;

  const buttonSize = size ?? (children ? "default" : "icon");

  return (
    <Button
      data-slot="color-picker-eye-dropper"
      {...buttonProps}
      variant="outline"
      size={buttonSize}
      onClick={onEyeDropper}
      disabled={context.disabled}
    >
      {children ?? <PipetteIcon />}
    </Button>
  );
}

interface ColorPickerFormatSelectProps
  extends
    Omit<React.ComponentProps<typeof Select>, "value" | "onValueChange">,
    Pick<React.ComponentProps<typeof SelectTrigger>, "size" | "className"> {}

function ColorPickerFormatSelect(props: ColorPickerFormatSelectProps) {
  const { size, className, ...selectProps } = props;
  const context = useColorPickerContext("ColorPickerFormatSelector");
  const store = useColorPickerStoreContext("ColorPickerFormatSelector");

  const format = useColorPickerStore((state) => state.format);

  const onFormatChange = React.useCallback(
    (value: ColorFormat) => {
      store.setFormat(value);
    },
    [store],
  );

  return (
    <Select
      data-slot="color-picker-format-select"
      {...selectProps}
      value={format}
      onValueChange={onFormatChange}
      disabled={context.disabled}
    >
      <SelectTrigger
        data-slot="color-picker-format-select-trigger"
        size={size ?? "sm"}
        className={cn(className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {colorFormats.map((format) => (
          <SelectItem key={format} value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ColorPickerInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "color"
> {
  withoutAlpha?: boolean;
}

function ColorPickerInput(props: ColorPickerInputProps) {
  const context = useColorPickerContext("ColorPickerInput");
  const store = useColorPickerStoreContext("ColorPickerInput");

  const color = useColorPickerStore((state) => state.color);
  const format = useColorPickerStore((state) => state.format);
  const hsv = useColorPickerStore((state) => state.hsv);

  const onColorChange = React.useCallback(
    (newColor: ColorValue) => {
      const newHsv = rgbToHsv(newColor);
      store.setColor(newColor);
      store.setHsv(newHsv);
    },
    [store],
  );

  if (format === "hex") {
    return (
      <HexInput
        color={color}
        onColorChange={onColorChange}
        context={context}
        {...props}
      />
    );
  }

  if (format === "rgb") {
    return (
      <RgbInput
        color={color}
        onColorChange={onColorChange}
        context={context}
        {...props}
      />
    );
  }

  if (format === "hsl") {
    return (
      <HslInput
        color={color}
        onColorChange={onColorChange}
        context={context}
        {...props}
      />
    );
  }

  if (format === "hsb") {
    return (
      <HsbInput
        hsv={hsv}
        onColorChange={onColorChange}
        context={context}
        {...props}
      />
    );
  }
}

const inputGroupItemVariants = cva(
  "h-8 [-moz-appearance:_textfield] focus-visible:z-10 focus-visible:ring-1 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
  {
    variants: {
      position: {
        first: "rounded-e-none",
        middle: "-ms-px rounded-none border-l-0",
        last: "-ms-px rounded-s-none border-l-0",
        isolated: "",
      },
    },
    defaultVariants: {
      position: "isolated",
    },
  },
);

interface InputGroupItemProps
  extends
    React.ComponentProps<typeof Input>,
    VariantProps<typeof inputGroupItemVariants> {}

function InputGroupItem({
  className,
  position,
  ...props
}: InputGroupItemProps) {
  return (
    <Input
      data-slot="color-picker-input"
      className={cn(inputGroupItemVariants({ position }), className)}
      {...props}
    />
  );
}

interface FormatInputProps extends ColorPickerInputProps {
  color: ColorValue;
  onColorChange: (color: ColorValue) => void;
  context: ColorPickerContextValue;
}

function HexInput(props: FormatInputProps) {
  const {
    color,
    onColorChange,
    context,
    withoutAlpha,
    className,
    ...inputProps
  } = props;

  const hexValue = rgbToHex(color);
  const alphaValue = Math.round((color?.a ?? 1) * 100);

  const onHexChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      const parsedColor = parseColorString(value);
      if (parsedColor) {
        onColorChange({ ...parsedColor, a: color?.a ?? 1 });
      }
    },
    [color, onColorChange],
  );

  const onAlphaChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10);
      if (!Number.isNaN(value) && value >= 0 && value <= 100) {
        onColorChange({ ...color, a: value / 100 });
      }
    },
    [color, onColorChange],
  );

  if (withoutAlpha) {
    return (
      <InputGroupItem
        aria-label="Hex color value"
        position="isolated"
        {...inputProps}
        placeholder="#000000"
        className={cn("font-mono", className)}
        value={hexValue}
        onChange={onHexChange}
        disabled={context.disabled}
      />
    );
  }

  return (
    <div
      data-slot="color-picker-input-wrapper"
      className={cn("flex items-center", className)}
    >
      <InputGroupItem
        aria-label="Hex color value"
        position="first"
        {...inputProps}
        placeholder="#000000"
        className="flex-1 font-mono"
        value={hexValue}
        onChange={onHexChange}
        disabled={context.disabled}
      />
      <InputGroupItem
        aria-label="Alpha transparency percentage"
        position="last"
        {...inputProps}
        placeholder="100"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="100"
        className="w-14"
        value={alphaValue}
        onChange={onAlphaChange}
        disabled={context.disabled}
      />
    </div>
  );
}

function RgbInput(props: FormatInputProps) {
  const {
    color,
    onColorChange,
    context,
    withoutAlpha,
    className,
    ...inputProps
  } = props;

  const rValue = Math.round(color?.r ?? 0);
  const gValue = Math.round(color?.g ?? 0);
  const bValue = Math.round(color?.b ?? 0);
  const alphaValue = Math.round((color?.a ?? 1) * 100);

  const onChannelChange = React.useCallback(
    (channel: "r" | "g" | "b" | "a", max: number, isAlpha = false) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseInt(event.target.value, 10);
        if (!Number.isNaN(value) && value >= 0 && value <= max) {
          const newValue = isAlpha ? value / 100 : value;
          onColorChange({ ...color, [channel]: newValue });
        }
      },
    [color, onColorChange],
  );

  return (
    <div
      data-slot="color-picker-input-wrapper"
      className={cn("flex items-center", className)}
    >
      <InputGroupItem
        aria-label="Red color component (0-255)"
        position="first"
        {...inputProps}
        placeholder="0"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="255"
        className="w-14"
        value={rValue}
        onChange={onChannelChange("r", 255)}
        disabled={context.disabled}
      />
      <InputGroupItem
        aria-label="Green color component (0-255)"
        position="middle"
        {...inputProps}
        placeholder="0"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="255"
        className="w-14"
        value={gValue}
        onChange={onChannelChange("g", 255)}
        disabled={context.disabled}
      />
      <InputGroupItem
        aria-label="Blue color component (0-255)"
        position={withoutAlpha ? "last" : "middle"}
        {...inputProps}
        placeholder="0"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="255"
        className="w-14"
        value={bValue}
        onChange={onChannelChange("b", 255)}
        disabled={context.disabled}
      />
      {!withoutAlpha && (
        <InputGroupItem
          aria-label="Alpha transparency percentage"
          position="last"
          {...inputProps}
          placeholder="100"
          inputMode="numeric"
          pattern="[0-9]*"
          min="0"
          max="100"
          className="w-14"
          value={alphaValue}
          onChange={onChannelChange("a", 100, true)}
          disabled={context.disabled}
        />
      )}
    </div>
  );
}

function HslInput(props: FormatInputProps) {
  const {
    color,
    onColorChange,
    context,
    withoutAlpha,
    className,
    ...inputProps
  } = props;

  const hsl = React.useMemo(() => rgbToHsl(color), [color]);
  const alphaValue = Math.round((color?.a ?? 1) * 100);

  const onHslChannelChange = React.useCallback(
    (channel: "h" | "s" | "l", max: number) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseInt(event.target.value, 10);
        if (!Number.isNaN(value) && value >= 0 && value <= max) {
          const newHsl = { ...hsl, [channel]: value };
          const newColor = hslToRgb(newHsl, color?.a ?? 1);
          onColorChange(newColor);
        }
      },
    [hsl, color, onColorChange],
  );

  const onAlphaChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10);
      if (!Number.isNaN(value) && value >= 0 && value <= 100) {
        onColorChange({ ...color, a: value / 100 });
      }
    },
    [color, onColorChange],
  );

  return (
    <div
      data-slot="color-picker-input-wrapper"
      className={cn("flex items-center", className)}
    >
      <InputGroupItem
        aria-label="Hue degree (0-360)"
        position="first"
        {...inputProps}
        placeholder="0"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="360"
        className="w-14"
        value={hsl.h}
        onChange={onHslChannelChange("h", 360)}
        disabled={context.disabled}
      />
      <InputGroupItem
        aria-label="Saturation percentage (0-100)"
        position="middle"
        {...inputProps}
        placeholder="0"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="100"
        className="w-14"
        value={hsl.s}
        onChange={onHslChannelChange("s", 100)}
        disabled={context.disabled}
      />
      <InputGroupItem
        aria-label="Lightness percentage (0-100)"
        position={withoutAlpha ? "last" : "middle"}
        {...inputProps}
        placeholder="0"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="100"
        className="w-14"
        value={hsl.l}
        onChange={onHslChannelChange("l", 100)}
        disabled={context.disabled}
      />
      {!withoutAlpha && (
        <InputGroupItem
          aria-label="Alpha transparency percentage"
          position="last"
          {...inputProps}
          placeholder="100"
          inputMode="numeric"
          pattern="[0-9]*"
          min="0"
          max="100"
          className="w-14"
          value={alphaValue}
          onChange={onAlphaChange}
          disabled={context.disabled}
        />
      )}
    </div>
  );
}

interface HsbInputProps extends Omit<FormatInputProps, "color"> {
  hsv: HSVColorValue;
}

function HsbInput(props: HsbInputProps) {
  const {
    hsv,
    onColorChange,
    context,
    withoutAlpha,
    className,
    ...inputProps
  } = props;

  const alphaValue = Math.round((hsv?.a ?? 1) * 100);

  const onHsvChannelChange = React.useCallback(
    (channel: "h" | "s" | "v", max: number) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseInt(event.target.value, 10);
        if (!Number.isNaN(value) && value >= 0 && value <= max) {
          const newHsv = { ...hsv, [channel]: value };
          const newColor = hsvToRgb(newHsv);
          onColorChange(newColor);
        }
      },
    [hsv, onColorChange],
  );

  const onAlphaChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10);
      if (!Number.isNaN(value) && value >= 0 && value <= 100) {
        const currentColor = hsvToRgb(hsv);
        onColorChange({ ...currentColor, a: value / 100 });
      }
    },
    [hsv, onColorChange],
  );

  return (
    <div
      data-slot="color-picker-input-wrapper"
      className={cn("flex items-center", className)}
    >
      <InputGroupItem
        aria-label="Hue degree (0-360)"
        position="first"
        {...inputProps}
        placeholder="0"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="360"
        className="w-14"
        value={hsv?.h ?? 0}
        onChange={onHsvChannelChange("h", 360)}
        disabled={context.disabled}
      />
      <InputGroupItem
        aria-label="Saturation percentage (0-100)"
        position="middle"
        {...inputProps}
        placeholder="0"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="100"
        className="w-14"
        value={hsv?.s ?? 0}
        onChange={onHsvChannelChange("s", 100)}
        disabled={context.disabled}
      />
      <InputGroupItem
        aria-label="Brightness percentage (0-100)"
        position={withoutAlpha ? "last" : "middle"}
        {...inputProps}
        placeholder="0"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        max="100"
        className="w-14"
        value={hsv?.v ?? 0}
        onChange={onHsvChannelChange("v", 100)}
        disabled={context.disabled}
      />
      {!withoutAlpha && (
        <InputGroupItem
          aria-label="Alpha transparency percentage"
          position="last"
          {...inputProps}
          placeholder="100"
          inputMode="numeric"
          pattern="[0-9]*"
          min="0"
          max="100"
          className="w-14"
          value={alphaValue}
          onChange={onAlphaChange}
          disabled={context.disabled}
        />
      )}
    </div>
  );
}

export {
  ColorPickerRoot as ColorPicker,
  ColorPickerTrigger,
  ColorPickerContent,
  ColorPickerArea,
  ColorPickerHueSlider,
  ColorPickerAlphaSlider,
  ColorPickerSwatch,
  ColorPickerEyeDropper,
  ColorPickerFormatSelect,
  ColorPickerInput,
  //
  ColorPickerRoot as Root,
  ColorPickerTrigger as Trigger,
  ColorPickerContent as Content,
  ColorPickerArea as Area,
  ColorPickerHueSlider as HueSlider,
  ColorPickerAlphaSlider as AlphaSlider,
  ColorPickerSwatch as Swatch,
  ColorPickerEyeDropper as EyeDropper,
  ColorPickerFormatSelect as FormatSelect,
  ColorPickerInput as Input,
  //
  useColorPickerStore as useColorPicker,
};
