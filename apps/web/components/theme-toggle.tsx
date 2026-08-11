"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@workspace/ui/components/switch";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <div className="flex items-center space-x-2 h-6 w-[99px]">
        <div className="h-[1.2rem] w-[1.2rem] bg-muted rounded-full animate-pulse" />
        <div className="h-6 w-11 bg-muted rounded-full animate-pulse" />
        <div className="h-[1.2rem] w-[1.2rem] bg-muted rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDark
            ? "text-[#A1A1AA] scale-75 rotate-12"
            : "text-foreground scale-100 rotate-0"
        }`}
      />
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label="Cambiar tema"
        className="transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110"
      />
      <Moon
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDark
            ? "text-foreground scale-100 rotate-0"
            : "text-[#A1A1AA] scale-75 rotate-12"
        }`}
      />
    </div>
  );
}
