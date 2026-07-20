import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0f14",
          panel: "#121820",
          card: "#161d27",
          border: "#232c38",
        },
        status: {
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
          neutral: "#64748b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
