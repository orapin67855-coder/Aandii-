import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#EEF2FB", 100: "#DCE5F7", 300: "#9DB4E6", 500: "#5B7BC4", 600: "#4F6FB5", 700: "#3F5A96" },
        cream: "#FBF8F1",
        sun: { 100: "#FDF1C7", 400: "#F6C945", 600: "#B88A00" },
        mint: { 100: "#DDF3E8", 400: "#8FD5B3", 700: "#2F7D5B" },
        ink: { DEFAULT: "#1F2A44", soft: "#55607D" },
      },
      boxShadow: { soft: "0 10px 28px -14px rgba(63,90,150,.35)" },
      keyframes: {
        bob: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        zz: { "0%": { transform: "translate(0, 6px)", opacity: "0" }, "30%": { opacity: "1" }, "100%": { transform: "translate(8px, -18px)", opacity: "0" } },
      },
      animation: { bob: "bob 3.2s ease-in-out infinite", zz: "zz 2.2s ease-in-out infinite" },
    },
  },
  plugins: [],
} satisfies Config;
