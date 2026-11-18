"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@workspace/ui/components/switch";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useEffect, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
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
      <div className={cn("flex h-6 w-24.75 items-center space-x-2", className)}>
        <Skeleton className="h-[1.2rem] w-[1.2rem] rounded-full" />
        <Skeleton className="h-6 w-11 rounded-full" />
        <Skeleton className="h-[1.2rem] w-[1.2rem] rounded-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center space-x-2 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        className,
      )}
    >
      <Sun
        className={cn(
          "h-[1.2rem] w-[1.2rem] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark ? "scale-75 rotate-12 opacity-40" : "scale-100 rotate-0 opacity-100",
        )}
      />
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label="Cambiar tema"
        className="transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110"
      />
      <Moon
        className={cn(
          "h-[1.2rem] w-[1.2rem] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-75 rotate-12 opacity-40",
        )}
      />
    </div>
  );
}
