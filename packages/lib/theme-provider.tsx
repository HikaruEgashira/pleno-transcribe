import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors, type ColorScheme } from "@/packages/constants/theme";
import { Storage } from "@/packages/platform";

const THEME_STORAGE_KEY = 'theme-preference';

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Use fixed initial value to avoid hydration mismatch (SSR vs client)
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("light");
  const [isLoaded, setIsLoaded] = useState(false);
  const systemScheme = useSystemColorScheme();

  const applyScheme = useCallback((scheme: ColorScheme) => {
    // Validate scheme before applying
    if (scheme !== "light" && scheme !== "dark") {
      return;
    }
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      if (palette) {
        Object.entries(palette).forEach(([token, value]) => {
          root.style.setProperty(`--color-${token}`, value);
        });
      }
    }
  }, []);

  // Load saved theme preference on mount, fallback to system scheme
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await Storage.getItem(THEME_STORAGE_KEY);
        if (saved === "dark" || saved === "light") {
          setColorSchemeState(saved);
          applyScheme(saved);
        } else if (systemScheme) {
          // No saved preference, use system scheme
          setColorSchemeState(systemScheme);
          applyScheme(systemScheme);
        }
      } catch (error) {
        console.error('[ThemeProvider] Failed to load theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, [applyScheme, systemScheme]);

  const setColorScheme = useCallback(async (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    applyScheme(scheme);
    // Save to storage
    try {
      await Storage.setItem(THEME_STORAGE_KEY, scheme);
    } catch (error) {
      console.error('[ThemeProvider] Failed to save theme:', error);
    }
  }, [applyScheme]);

  // Apply scheme when it changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      applyScheme(colorScheme);
    }
  }, [applyScheme, colorScheme, isLoaded]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
    }),
    [colorScheme, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
