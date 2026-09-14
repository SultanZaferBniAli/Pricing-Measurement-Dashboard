/**
 * Research-based pricing that is layered on top of the parsed scope catalog.
 *
 * The source scope file deliberately left flights and detailed transport
 * UNPRICED ("no price invented"). TAM's separate research workbooks
 * (Domestic Exercise.xlsx, Riyadh_Driver_Prices.xlsx) DO contain benchmark
 * figures, and the business now wants them applied. This module holds those
 * figures so the enrichment step (src/lib/enrich.ts) can:
 *   1) fill in prices on existing flight lines (matched by id), and
 *   2) add real, selectable ground-transport options (chauffeur + rentals).
 *
 * Everything here is a market benchmark, flagged with priceSource "Research"
 * so it's visually distinct from TAM / Threelines master prices.
 */
import type { ScopeItem } from "../lib/types";

export const RESEARCH_SOURCE = "Research";
export const RESEARCH_MATCH = "RESEARCH";

/** Prices applied to existing flight scope items, keyed by item id. */
export const FLIGHT_PRICING: Record<
  string,
  { price: number; note: string }
> = {
  "logistics-travel-flights-domestic-flight-tickets-economy-class": {
    price: 521,
    note:
      "Benchmark average one-way from Riyadh · range SAR 360-885 by destination (Domestic flight research).",
  },
  "logistics-travel-flights-domestic-flight-tickets-business-class": {
    price: 1408,
    note:
      "Benchmark average one-way from Riyadh · range SAR 1,150-1,990 by destination (Domestic flight research).",
  },
  "logistics-travel-flights-international-flight-tickets-business-class": {
    price: 22222,
    note:
      "Benchmark average round-trip · range SAR 13,000-33,500 by country (International flight research).",
  },
  "logistics-travel-flights-international-flight-tickets-first-class": {
    price: 46750,
    note:
      "Benchmark average round-trip · range SAR 37,500-56,000 (International flight research).",
  },
  // Domestic First: Saudi carriers sell no First cabin - left unpriced.
  // International Economy / Premium Economy: no benchmark data - left unpriced.
};

/** Small factory for research-sourced ground-transport line items. */
function transport(
  partial: Partial<ScopeItem> & {
    id: string;
    name: string;
    type: string;
    unitPrice: number;
    subCategory: string;
  }
): ScopeItem {
  return {
    section: "Logistics",
    sectionKey: "LOGISTICS",
    masterCategory: "Riyadh Transport Research",
    masterQtyUnit: partial.type,
    sourceItem: partial.sourceItem ?? "",
    priceSource: RESEARCH_SOURCE,
    matchStatus: RESEARCH_MATCH,
    defaultQty: 1,
    isPriced: true,
    mappingNote: "",
    ...partial,
  } as ScopeItem;
}

/**
 * Real ground-transport options from the Riyadh car-with-driver study.
 * Two groups: chauffeur (per-day / per-transfer) and monthly rentals.
 * All figures are published market rates (driver included).
 */
export const GROUND_TRANSPORT_ITEMS: ScopeItem[] = [
  // ---- Car with driver / chauffeur ----
  transport({
    id: "research-gt-standard-sedan-8h",
    subCategory: "Car with Driver (Chauffeur)",
    name: "Standard sedan + chauffeur (8 hours)",
    type: "Per day (8 hrs)",
    unitPrice: 1057,
    sourceItem: "Camry / Sonata / Taurus",
    mappingNote: "Best-supported market figure · range SAR 813-1,360.",
  }),
  transport({
    id: "research-gt-standard-sedan-airport",
    subCategory: "Car with Driver (Chauffeur)",
    name: "Standard sedan + chauffeur, airport transfer",
    type: "Per transfer",
    unitPrice: 190,
    sourceItem: "Camry / Sonata / Taurus",
    mappingNote: "One-way airport transfer · range SAR 150-230.",
  }),
  transport({
    id: "research-gt-executive-sedan-day",
    subCategory: "Car with Driver (Chauffeur)",
    name: "Executive sedan + chauffeur (full day)",
    type: "Per day",
    unitPrice: 699,
    sourceItem: "Lexus ES 250",
    mappingNote: "Single published full-day rate.",
  }),
  transport({
    id: "research-gt-large-suv-8h",
    subCategory: "Car with Driver (Chauffeur)",
    name: "Large SUV + chauffeur (8 hours)",
    type: "Per day (8 hrs)",
    unitPrice: 1612,
    sourceItem: "Tahoe / Yukon",
    mappingNote: "Range SAR 1,223-2,000.",
  }),
  transport({
    id: "research-gt-luxury-suv-airport",
    subCategory: "Car with Driver (Chauffeur)",
    name: "Luxury SUV + chauffeur, airport transfer",
    type: "Per transfer",
    unitPrice: 300,
    sourceItem: "Suburban / Expedition / Patrol",
    mappingNote: "Meet & greet, luggage, waiting, flight tracking.",
  }),
  transport({
    id: "research-gt-luxury-sedan-8h",
    subCategory: "Car with Driver (Chauffeur)",
    name: "Luxury sedan + chauffeur (8 hours)",
    type: "Per day (8 hrs)",
    unitPrice: 3300,
    sourceItem: "S450 / BMW 740 / 735i",
    mappingNote: "Range SAR 2,600-4,000.",
  }),
  transport({
    id: "research-gt-van-8h",
    subCategory: "Car with Driver (Chauffeur)",
    name: "Van + chauffeur (8 hrs / full day)",
    type: "Per day",
    unitPrice: 2155,
    sourceItem: "Mercedes Vito / Hyundai Staria",
    mappingNote: "Range SAR 1,309-3,000 by trim.",
  }),
  transport({
    id: "research-gt-minibus-8h",
    subCategory: "Car with Driver (Chauffeur)",
    name: "Minibus + chauffeur (8 hours)",
    type: "Per day (8 hrs)",
    unitPrice: 3500,
    sourceItem: "Mercedes Sprinter",
    mappingNote: "Single published rate.",
  }),

  // ---- Monthly rentals (driver included) ----
  transport({
    id: "research-rent-standard-monthly",
    subCategory: "Car Rental (Monthly)",
    name: "Standard sedan, monthly rental",
    type: "Per month",
    unitPrice: 23970,
    sourceItem: "Ford Taurus (eZhire)",
    mappingNote: "Driver incl. Worth it above ~24 days/month vs daily.",
  }),
  transport({
    id: "research-rent-executive-monthly",
    subCategory: "Car Rental (Monthly)",
    name: "Executive sedan, monthly rental",
    type: "Per month",
    unitPrice: 20999,
    sourceItem: "Lexus ES 250 (eZhire)",
    mappingNote: "Driver incl. Monthly is a premium here, not a discount.",
  }),
  transport({
    id: "research-rent-large-suv-monthly",
    subCategory: "Car Rental (Monthly)",
    name: "Large SUV, monthly rental",
    type: "Per month",
    unitPrice: 38970,
    sourceItem: "GMC Yukon (eZhire)",
    mappingNote: "Driver incl. Worth it above ~24 days/month.",
  }),
  transport({
    id: "research-rent-van-monthly",
    subCategory: "Car Rental (Monthly)",
    name: "Van, monthly rental",
    type: "Per month",
    unitPrice: 31470,
    sourceItem: "Hyundai Staria (eZhire)",
    mappingNote: "Driver incl. Worth it above ~24 days/month.",
  }),
  transport({
    id: "research-rent-luxury-monthly",
    subCategory: "Car Rental (Monthly)",
    name: "Luxury sedan, monthly rental",
    type: "Per month",
    unitPrice: 44970,
    sourceItem: "BMW 740 (eZhire)",
    mappingNote: "Driver incl. Monthly saves ~47% vs 26 daily bookings.",
  }),
];
