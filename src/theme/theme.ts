import { createSystem, defaultConfig, defineRecipe } from "@chakra-ui/react";

const buttonRecipe = defineRecipe({
  base: {
    fontFamily: "'Playfair Display', serif",
    fontWeight: "400 !important",
    fontSize: "0.95rem",
    letterSpacing: "0.01em",
    transition: "all 0.2s ease",
    cursor: "pointer",
    borderRadius: "2px",
    _focusVisible: {
      outline: "2px solid",
      outlineOffset: "2px",
    },
  },
  variants: {
    visual: {
      solid: {
        bg: "gold.400",
        color: "black",
        _hover: {
          bg: "gold.500",
          transform: "translateY(-1px)",
        },
        _active: {
          transform: "translateY(0)",
        },
      },
    },
  },
  defaultVariants: {
    visual: "solid",
  },
});

const cardRecipe = defineRecipe({
  base: {
    bg: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    transition: "all 0.3s",
    _hover: {
      boxShadow: "0 8px 16px rgba(0,0,0,0.12)",
      transform: "translateY(-2px)",
    },
  },
});

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
    semanticTokens: {
      colors: {
        bg: { value: "#f8f9fa" },
        "bg-muted": { value: "#f3f4f6" },
        "fg": { value: "#111827" },
        "fg-muted": { value: "#6b7280" },
      },
    },
    recipes: {
      button: buttonRecipe,
      card: cardRecipe,
    },
  },
});
