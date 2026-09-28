/**
 * Light / dark switch.
 *
 * WHY THE SWAP IS INSTANT. Chrome does not reliably re-resolve a `var()`-based
 * colour on elements that carry a CSS transition for that property. Most of
 * this app uses `transition-colors`, so animating the theme change left rows
 * painted in the outgoing palette: the custom property read correctly as the
 * new value while the computed background stayed on the old one, permanently.
 *
 * Suppressing transitions for the duration of the swap forces every element to
 * repaint against the new tokens in one go. A 200ms cross-fade is not worth a
 * dashboard that renders half in the wrong theme.
 */
import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import { cx } from "./ui";

/** Swap the palette with every colour transition held off. */
function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.add("theme-instant");
  root.dataset.theme = theme;
  // Reading layout forces the style recalculation to flush before transitions
  // come back, so nothing is left mid-interpolation.
  void root.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("theme-instant"));
  });
}

/** Keeps <html data-theme> in step with the store, including on rehydration. */
export function useThemeEffect() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useT();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      role="switch"
      aria-checked={isDark}
      aria-label={t(isDark ? "themeToLight" : "themeToDark")}
      title={t(isDark ? "themeToLight" : "themeToDark")}
      className={cx(
        "relative inline-flex h-8 w-[3.75rem] shrink-0 items-center rounded-full border border-line bg-raised p-1",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
        className
      )}
    >
      {/* the knob slides; both icons stay put and swap emphasis */}
      <span
        aria-hidden="true"
        className={cx(
          "absolute h-6 w-6 rounded-full bg-brand transition-transform duration-200 ease-out",
          isDark ? "start-[1.8rem]" : "start-1"
        )}
      />
      <span className="relative z-10 flex w-full items-center justify-around">
        <Sun size={14} className={isDark ? "text-ink-muted" : "text-on-brand"} />
        <Moon size={14} className={isDark ? "text-on-brand" : "text-ink-muted"} />
      </span>
    </button>
  );
}
