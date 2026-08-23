/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // TAM brand palette
        navy: "#222242", // Deep Navy — app background
        surface: "#2A2756", // Card surface (dark purple)
        "surface-2": "#33306A", // Elevated surface / hover
        electric: "#5E45FF", // Electric Purple — primary buttons
        core: "#6256F3", // Core Purple
        lavender: "#8A87F4", // Lavender
        "lavender-light": "#B7B2F9", // Light Lavender — secondary text
        gold: "#EBA036", // Gold — highlights / warnings
      },
      fontFamily: {
        sans: [
          '"Helvetica Neue LT Arabic"',
          '"Helvetica Neue"',
          "Arial",
          '"IBM Plex Sans Arabic"',
          '"Noto Sans Arabic"',
          '"Segoe UI"',
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "16px",
      },
      backgroundImage: {
        "tam-gradient":
          "linear-gradient(135deg, #5E45FF 0%, #3E3085 55%, #222242 100%)",
      },
      boxShadow: {
        card: "0 8px 30px -12px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(138,135,244,0.25)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
