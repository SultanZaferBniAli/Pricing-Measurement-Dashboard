/**
 * The selection highlight as one moving piece.
 *
 * Apple's controls do not switch a highlight off on one item and on at the
 * next: a single pill glides to the new position with a small spring. This
 * component draws that pill behind whichever child carries data-active="true",
 * re-measuring on resize, language direction change or layout change. Children
 * only need `relative` so they paint above it.
 */
import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import { cx } from "./ui";

export function useSlidingHighlight(ref: RefObject<HTMLElement | null>, activeKey: string | number | boolean) {
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>('[data-active="true"]');
    if (!el) {
      setStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const measure = () =>
      setStyle({
        opacity: 1,
        transform: `translate(${el.offsetLeft}px, ${el.offsetTop}px)`,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, activeKey]);
  return style;
}

/** The pill itself. Place as the first child of a `relative` container. */
export function SlidingHighlight({ style, className }: { style: CSSProperties; className?: string }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cx(
        "pointer-events-none absolute left-0 top-0 will-change-transform transition-[transform,width,height,opacity] duration-[420ms] ease-spring motion-reduce:transition-none",
        className
      )}
    />
  );
}
