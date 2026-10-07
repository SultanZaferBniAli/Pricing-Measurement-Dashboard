/**
 * TAM wordmark for the nav bar.
 *
 * Renders the official brand asset at `public/tam-logo.webp`. To update it,
 * just replace that one file (keep the name) - it will appear automatically.
 * If the asset ever fails to load, we fall back to a clean text wordmark so the
 * nav bar is never broken.
 */
import { useState } from "react";
import { assetUrl } from "../lib/asset";

export function TamLogo({ className }: { className?: string }) {
  const [ok, setOk] = useState(true);

  return (
    <div className={className}>
      {ok ? (
        <img
          src={assetUrl("tam-logo.webp")}
          alt="TAM"
          className="tam-wordmark h-8 w-auto select-none md:h-9"
          draggable={false}
          onError={() => setOk(false)}
        />
      ) : (
        <span className="text-2xl font-extrabold tracking-tight text-ink">
          TAM
        </span>
      )}
    </div>
  );
}
