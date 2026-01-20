"use client";

/**
 * Theme Provider
 * 
 * Provides dark mode support using next-themes.
 * Wraps the application to enable theme switching.
 */

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
