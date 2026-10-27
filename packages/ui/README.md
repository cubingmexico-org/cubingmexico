# `@workspace/ui`

Shared UI component library built with shadcn/ui, Radix UI, and Tailwind CSS for the monorepo workspace.

## ✨ Features

- 🎨 **40+ Components** - Comprehensive set of accessible, customizable UI components
- ♿ **Accessibility** - Built on Radix UI primitives with ARIA support
- 🎯 **Type-Safe** - Full TypeScript support
- 🎨 **Customizable** - Tailwind CSS with CSS variables for theming
- 🌗 **Dark Mode** - Theme support with next-themes
- 📦 **Tree-Shakeable** - Import only what you need
- 🔧 **Composable** - Build complex UIs from simple components
- 📱 **Responsive** - Mobile-first design

## 📦 Available Components

### Form Inputs

- `button` - Customizable button with variants
- `input` - Text input field
- `textarea` - Multi-line text input
- `checkbox` - Checkbox input
- `radio-group` - Radio button group
- `switch` - Toggle switch
- `slider` - Range slider
- `select` - Dropdown select
- `combobox` - Searchable select
- `color-picker` - Color selection input
- `file-upload` - File upload component
- `calendar` - Date picker calendar
- `mention` - @mention component
- `visually-hidden-input` - Accessible hidden input

### Layout

- `card` - Container with header, content, footer
- `separator` - Visual divider
- `scroll-area` - Custom scrollable area
- `tabs` - Tabbed interface
- `accordion` - Collapsible sections

### Navigation

- `breadcrumb` - Breadcrumb navigation
- `navigation-menu` - Responsive navigation
- `menubar` - Application menu bar
- `command` - Command palette

### Overlays

- `dialog` - Modal dialog
- `sheet` - Slide-out panel
- `drawer` - Bottom drawer
- `popover` - Popover overlay
- `dropdown-menu` - Dropdown menu
- `alert-dialog` - Confirmation dialog
- `tooltip` - Tooltip component

### Feedback

- `alert` - Alert message component
- `badge` - Status badge
- `progress` - Progress indicator
- `skeleton` - Loading skeleton

### Data Display

- `table` - Data table
- `avatar` - User avatar
- `faceted` - Faceted filter component

### Utilities

- `button-group` - Group of buttons
- `toggle` - Toggle button
- `toggle-group` - Group of toggle buttons
- `label` - Form label

## 🚀 Usage

### Installation

This package is automatically available in the monorepo workspace:

```json
{
  "dependencies": {
    "@workspace/ui": "workspace:*"
  }
}
```

### Importing Components

```tsx
// Import individual components
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card } from "@workspace/ui/components/card";

// Use in your component
export function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text..." />
      <Button>Submit</Button>
    </Card>
  );
}
```

### Using Utility Functions

```tsx
import { cn } from "@workspace/ui/lib/utils";

export function MyComponent({ className }) {
  return <div className={cn("px-4 py-2", className)}>Content</div>;
}
```

### Using Hooks

```tsx
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query";

export function MyComponent() {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return <div>{isMobile ? "Mobile View" : "Desktop View"}</div>;
}
```

## 🎨 Theming

The UI library uses CSS variables for theming, making it easy to customize colors and appearance.

### Tailwind Configuration

In your app's `tailwind.config.ts`:

```typescript
import sharedConfig from "@workspace/ui/tailwind.config";

const config = {
  presets: [sharedConfig],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    // Include UI package components
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
```

### CSS Variables

Import the global styles in your app:

```tsx
import "@workspace/ui/styles/globals.css";
```

Colors are defined as CSS variables and can be customized in your app's CSS.

## 🔧 Adding New Components

Add components using the shadcn/ui CLI:

```bash
# From the monorepo root
pnpm dlx shadcn@latest add <component-name> -c packages/ui

# Examples
pnpm dlx shadcn@latest add button -c packages/ui
pnpm dlx shadcn@latest add dialog -c packages/ui
```

This will:

1. Download the component from shadcn/ui
2. Place it in `packages/ui/src/components/`
3. Make it available to all apps in the workspace

## 📚 Component Examples

### Button Variants

```tsx
import { Button } from "@workspace/ui/components/button"

<Button variant="default">Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

### Card Component

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@workspace/ui/components/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>Card content goes here</CardContent>
  <CardFooter>Card footer</CardFooter>
</Card>;
```

### Dialog Component

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";

<Dialog>
  <DialogTrigger>Open Dialog</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description</DialogDescription>
    </DialogHeader>
    {/* Dialog content */}
  </DialogContent>
</Dialog>;
```

## 🛠️ Tech Stack

- **UI Primitives:** Radix UI
- **Styling:** Tailwind CSS with class-variance-authority
- **Icons:** Lucide React
- **Utilities:** clsx, tailwind-merge
- **Forms:** React Hook Form support
- **Date:** date-fns
- **Theme:** next-themes
- **Carousels:** Embla Carousel

## 📁 Package Structure

```
packages/ui/
├── src/
│   ├── components/      # UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   └── styles/         # Global styles
├── components.json     # shadcn/ui configuration
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## 🎯 Best Practices

1. **Import from the package** - Always use `@workspace/ui/components/...` imports
2. **Don't modify components directly** - Extend or wrap them instead
3. **Use the cn() utility** - For conditional class names
4. **Follow Radix patterns** - Use composition for complex components
5. **Keep components unstyled** - Let consuming apps add layout styles
6. **Export all component parts** - For maximum flexibility

## 📚 Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Documentation](https://www.radix-ui.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Class Variance Authority](https://cva.style/docs)
