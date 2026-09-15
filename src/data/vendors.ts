/**
 * Who stands behind each price.
 *
 * The catalog's `priceSource` says where a figure came from. This turns that
 * into the distinction that matters when a client asks "is this a real quote?":
 * a price is either QUOTED, meaning a named party is answerable for it, or it is
 * an ASSUMPTION we made ourselves and should say so.
 *
 * LOGOS. Drop a file at `public/vendors/<logo>` and it appears on the card. No
 * file, no problem: the card falls back to the vendor's initials. Nothing else
 * needs changing.
 */

export type PriceBacking = "quoted" | "assumed";

export interface VendorProfile {
  /** Matches ScopeItem.priceSource exactly. */
  source: string;
  name: string;
  /** One line on who they are and what standing their prices have. */
  role: string;
  backing: PriceBacking;
  /** Path under /public, or null to use initials. */
  logo: string | null;
  accent: string;
}

export const VENDORS: VendorProfile[] = [
  {
    source: "TAM",
    name: "TAM Development",
    role: "In-house rate card. Priced by TAM and owned by TAM.",
    backing: "quoted",
    logo: "/tam-logo.webp",
    accent: "#5E45FF",
  },
  {
    source: "Threelines",
    name: "Threelines",
    role: "Contracted supplier. Prices taken from their rate card.",
    backing: "quoted",
    logo: "/vendors/threelines.png",
    accent: "#8A87F4",
  },
  {
    source: "Pricing_V1",
    name: "Pricing list v1",
    role: "An earlier internal price list. Agreed, but worth re-confirming.",
    backing: "quoted",
    logo: null,
    accent: "#6256F3",
  },
  {
    source: "Research",
    name: "Market research",
    role: "Benchmark figures from the travel and transport studies. Nobody has quoted these.",
    backing: "assumed",
    logo: null,
    accent: "#EBA036",
  },
  {
    source: "Derived",
    name: "Composed in-house",
    role: "Built by summing Pricing Master rows. The components are real; the bundle is our own.",
    backing: "assumed",
    logo: null,
    accent: "#EBA036",
  },
];

const BY_SOURCE = new Map(VENDORS.map((v) => [v.source, v]));

/** Anything the scope file left without a usable source. */
export const UNSOURCED: VendorProfile = {
  source: "",
  name: "No source on file",
  role: "The scope file left these without a price or a supplier. Any figure here is one you typed.",
  backing: "assumed",
  logo: null,
  accent: "#4b4870",
};

export function vendorFor(priceSource: string): VendorProfile {
  return BY_SOURCE.get(priceSource) ?? UNSOURCED;
}

/** Initials for the logo fallback, e.g. "Threelines" -> "TL". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
