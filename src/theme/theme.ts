import { createSystem, defaultConfig } from "@chakra-ui/react";

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        gold: {
          50: { value: "#fff8dc" },
          100: { value: "#fce8a1" },
          200: { value: "#f7d76b" },
          300: { value: "#f2c436" },
          400: { value: "#d4af37" },
          500: { value: "#b8962d" },
        },
      },
      fonts: {
        heading: { value: `"Merriweather", serif` },
        body: { value: `"Inter", sans-serif` },
      },
    },
  },
});
