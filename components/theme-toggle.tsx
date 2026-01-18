"use client";

import { useTheme } from "./theme-provider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const cycleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={cycleTheme}
      className="rounded-full border border-border p-2.5 text-muted-foreground transition-all hover:border-border-strong hover:text-foreground"
      aria-label={`Current theme: ${resolvedTheme}. Click to change.`}
      title={`Theme: ${resolvedTheme}`}
    >
      {resolvedTheme === "light" && <Sun className="h-5 w-5" />}
      {resolvedTheme === "dark" && <Moon className="h-5 w-5" />}
    </button>
  );
}
