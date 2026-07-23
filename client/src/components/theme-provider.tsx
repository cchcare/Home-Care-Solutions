import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wraps next-themes with this app's conventions: class-based dark mode
 * (matches tailwind.config.ts `darkMode: ["class"]`), a dedicated storage
 * key (also read by the anti-flash inline script in index.html), and
 * default to the visitor's OS preference rather than forcing light.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="hcs-theme"
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
