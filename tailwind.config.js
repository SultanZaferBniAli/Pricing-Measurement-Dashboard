/** @type {import('tailwindcss').Config} */

/**
 * Every colour resolves to a CSS variable defined in src/index.css, so a class
 * like `bg-surface/60` works identically in light and dark. The `<alpha-value>`
 * placeholder is what keeps Tailwind's `/opacity` modifiers functioning against
 * a variable.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // surfaces
        bg: token("bg"),
        surface: token("surface"),
        raised: token("raised"),
        rail: token("rail"),
        hover: token("hover"),
        active: token("active"),
        line: token("line"),

        // text
        ink: token("ink"),
        "ink-2": token("ink-2"),
        "ink-muted": token("ink-muted"),
        "on-brand": token("on-brand"),

        // brand
        brand: token("brand"),
        "brand-strong": token("brand-strong"),
        "brand-soft": token("brand-soft"),

        // status, secondary to the brand
        ok: token("ok"),
        "ok-bg": token("ok-bg"),
        warn: token("warn"),
        "warn-bg": token("warn-bg"),
        bad: token("bad"),
        "bad-bg": token("bad-bg"),

        // one purple family for categories and charts
        c1: token("c1"),
        c2: token("c2"),
        c3: token("c3"),
        c4: token("c4"),
        c5: token("c5"),
      },
      /*
       * Brand type and brand fills need opposite treatment: a violet readable
       * ON white is too dark to sit BEHIND white. `text-brand` therefore
       * resolves to its own token while `bg-brand` keeps the fill value.
       */
      textColor: {
        brand: token("brand-text"),
      },
      ringColor: {
        DEFAULT: token("ring"),
        brand: token("ring"),
      },
      fontFamily: {
        sans: [
          "Inter",
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
        control: "12px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        focus: "0 0 0 3px rgb(var(--ring) / 0.28)",
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
