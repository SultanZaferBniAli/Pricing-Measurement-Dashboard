/**
 * TAM wordmark for the nav bar.
 *
 * Renders the official brand asset at `public/tam-logo.webp`. To update it,
 * just replace that one file (keep the name) — it will appear automatically.
 * If the asset ever fails to load, we fall back to a clean text wordmark so the
 * nav bar is never broken.
 */
import { useState } from "react";

export function TamLogo({ className }: { className?: string }) {
  const [ok, setOk] = useState(true);

  return (
    <div className={className}>
      {ok ? (
        <img
          src="/tam-logo.webp"
          alt="TAM"
          className="h-8 w-auto md:h-9 select-none"
          draggable={false}
          onError={() => setOk(false)}
        />
      ) : (
        <span className="text-2xl font-extrabold tracking-tight text-white">
          TAM
        </span>
      )}
    </div>
  );
}
