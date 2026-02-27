import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#e9e6f2",
        muted: "#b9b1c9",
        bg0: "#07060b",
        bg1: "#0b0a14",
        grave: "#1a1725",
        stone: "#2a2436",
        eerie: "#63ff9c",
        eerie2: "#2bdc79",
        torch: "#ff9b3d",
      },
      boxShadow: {
        panel: "0 18px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)",
        glow: "0 18px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(99,255,156,.20), 0 0 26px rgba(99,255,156,.18), inset 0 1px 0 rgba(255,255,255,.06)",
      },
      borderRadius: {
        xl2: "18px",
      },
      fontFamily: {
        gothic: ['"Pirata One"', "cursive"],
      },
    },
  },
  plugins: [],
} satisfies Config;
