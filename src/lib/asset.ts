/**
 * Resolve a file in `public/` to a URL that works wherever the app is served.
 *
 * On localhost the app sits at the domain root, but the deployed build is a
 * GitHub Pages project site under /Pricing-Measurement-Dashboard/. A path
 * written as "/tam-logo.webp" is correct in the first case and a 404 in the
 * second, so public assets go through here instead of being written by hand.
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
