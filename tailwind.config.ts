import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        empresa: {
          terramare: "#0f6e6e",
          cleansea: "#1d4ed8",
          parana: "#a16207",
          hf: "#7c3aed",
        },
      },
    },
  },
  plugins: [],
};

export default config;
