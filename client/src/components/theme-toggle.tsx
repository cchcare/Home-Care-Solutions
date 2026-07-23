import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Light / Dark / System theme switcher. Reads/writes via next-themes, whose
 * storage key matches the anti-flash inline script in index.html.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // next-themes resolves the real value only after mount (avoids SSR
  // mismatch); this app is a client-only SPA but next-themes' hook still
  // reports `undefined` on the very first render, so guard the icon choice.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg text-muted-foreground hover:text-foreground"
          data-testid="button-theme-toggle"
          aria-label="Toggle theme"
        >
          {current === "dark" ? (
            <Moon className="h-[1.1rem] w-[1.1rem]" />
          ) : current === "light" ? (
            <Sun className="h-[1.1rem] w-[1.1rem]" />
          ) : (
            <Monitor className="h-[1.1rem] w-[1.1rem]" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => setTheme("light")} data-testid="menuitem-theme-light">
          <Sun className="mr-2 h-4 w-4" />
          Light
          {current === "light" && <span className="ml-auto text-xs text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} data-testid="menuitem-theme-dark">
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {current === "dark" && <span className="ml-auto text-xs text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} data-testid="menuitem-theme-system">
          <Monitor className="mr-2 h-4 w-4" />
          System
          {current === "system" && <span className="ml-auto text-xs text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
