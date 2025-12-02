import { createSystem, defaultConfig } from "@chakra-ui/react";

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        // Gold/Amber accent colors
        gold: {
          50: { value: "#fef3c7" },
          100: { value: "#fde68a" },
          200: { value: "#fcd34d" },
          300: { value: "#fbbf24" },
          400: { value: "#f59e0b" }, // Primary gold
          500: { value: "#d97706" }, // Darker gold
          600: { value: "#b45309" },
        },
        // Black for sidebar and headings
        brand: {
          black: { value: "#000000" },
          white: { value: "#FFFFFF" },
        },
      },
      fonts: {
        body: { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif" },
        heading: { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif" },
      },
      fontWeights: {
        normal: { value: 400 },
        medium: { value: 500 },
      },
      fontSizes: {
        xs: { value: "0.75rem" },
        sm: { value: "0.875rem" },
        md: { value: "1rem" },
        lg: { value: "1.125rem" },
        xl: { value: "1.25rem" },
        "2xl": { value: "1.5rem" },
        "3xl": { value: "1.875rem" },
      },
    },
  },
});
