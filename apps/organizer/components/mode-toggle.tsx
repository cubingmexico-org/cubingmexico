"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@workspace/ui/components/switch";

export function ModeToggle(): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";

  React.useEffect(() => {
    if (theme === "system") {
      setTheme("light");
    }
  }, [theme, setTheme]);

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isDarkMode}
        defaultChecked={!isDarkMode}
        onCheckedChange={toggleTheme}
      />
      {isDarkMode ? <Moon /> : <Sun />}
    </div>
  );
}
