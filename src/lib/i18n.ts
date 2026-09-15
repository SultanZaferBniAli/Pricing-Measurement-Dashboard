/**
 * Bilingual UI strings (English / Arabic) plus the catalog vocabulary.
 *
 * Scope. The interface chrome, the section names, the sub-categories and the
 * pricing bases are translated. Individual line-item names are NOT: they are
 * the wording of the signed scope of work, and a paraphrase in a client-facing
 * budget would be a liability. They stay in English in both languages, which is
 * the usual arrangement for a bilingual commercial document here.
 *
 * `en` is the source of truth: `ar` must cover exactly the same keys, and
 * TypeScript enforces that below.
 */
import { useStore } from "./store";

export type Lang = "en" | "ar";

const en = {
  // ---- app shell ----
  appHome: "Home",
  navAdmin: "Admin",
  barReview: "Review Budget",
  langToggle: "العربية",
  langToggleLabel: "Switch to Arabic",

  // ---- sidebar ----
  navOverview: "Overview",
  navSections: "Sections",
  sidebarTotalLabel: "Grand total",
  sidebarBaseFee: "{base} base + {fee} fee",
  sidebarEmpty: "Nothing selected yet",
  openMenu: "Open menu",
  closeMenu: "Close menu",

  // ---- stat strip ----
  statItems: "items",
  statPriced: "priced",
  statUnpriced: "unpriced",
  statSelected: "selected",
  statFee: "fee",
  kpiNeedPrice: "{n} need a price",

  // ---- quantity stepper ----
  decrease: "Decrease quantity",
  increase: "Increase quantity",

  // ---- budget summary header ----
  clientLabel: "Client",
  clientPlaceholder: "Who is this budget for?",
  titlePlaceholder: "Name this budget",
  backToBuilder: "Back to builder",


  // ---- chart ----
  chartTitle: "Spend by Section",
  chartSub: "Grand total incl. 15% fee",
  chartEmpty: "Select items to see the spend breakdown.",

  // ---- builder toolbar ----
  buildTitle: "Build your budget",
  buildSub: "Click a section to expand it and select items",
  expandAll: "Expand all",
  collapseAll: "Collapse all",
  searchPlaceholder: "Search all items...",
  filterAllPrices: "All prices",
  filterPricedOnly: "Priced only",
  filterUnpricedOnly: "Unpriced only",
  filterAllSources: "All sources",
  filterAllMatches: "All matches",
  matchExact: "Exact",
  matchClose: "Close",
  matchResearch: "Research",
  matchDerived: "Derived",
  matchNotInMaster: "Not in master",
  clear: "Clear",
  noMatches: "No items match “{q}”.",
  clearFilters: "Clear filters",

  // ---- section accordion ----
  countItems: "{n} items",
  countPriced: "{n} priced",
  countSelected: "{n} selected",
  countNeedPrice: "{n} need price",
  subtotalInclFee: "Subtotal (incl. fee)",
  colItem: "Item",
  colQty: "Qty",
  colRate: "Rate",
  colUnitPrice: "Unit Price",
  colRatePct: "Rate %",
  colFee: "Fee 15%",
  colTotal: "Total",
  noFilterMatches: "No items match the current filters.",
  selectAll: "Select all",
  deselectAll: "Deselect all",

  // ---- item row ----
  badgeUnpriced: "Unpriced",
  badgeSetRate: "Set a rate",
  ofBudgetBase: "of budget base",
  ofSectionBase: "of section base",
  setPrice: "Set price",
  setPercent: "Set %",
  selectItem: "Select {name}",
  customPriceHint: "Enter a custom price to include this item in totals",
  percentHint: "Percentage applied to the subtotal of the other selected lines",

  // ---- budget summary ----
  emptyTitle: "Your budget is empty",
  emptyBody: "Head into a section and select the scope items you need.",
  budgetTitleLabel: "Budget title",
  print: "Print",
  clearAll: "Clear all",
  exportExcel: "Export to Excel",
  exporting: "Preparing...",
  totalBaseCost: "Total Base Cost",
  totalFees: "Total Fees (15%)",
  grandTotal: "Grand Total",
  unpricedCalloutOne: "1 selected item has no price",
  unpricedCalloutMany: "{n} selected items have no price",
  unpricedCalloutTailOne:
    "and is excluded from the totals. Set a price (or a rate, for contingency lines) in the section view to include it.",
  unpricedCalloutTailMany:
    "and are excluded from the totals. Set a price (or a rate, for contingency lines) in the section view to include them.",
  colSection: "Section",
  colUnit: "Unit",
  colBase: "Base",
  badgeCustom: "custom",
  notePlaceholder: "Add a note (optional)...",
  removeItem: "Remove item",
  excludedTitle: "Excluded (needs a price)",
  qtyBadge: "Qty {n}",
  percentOfBudgetBase: "{rate}% of the budget base ({base})",
  percentOfSectionBase: "{rate}% of the section base ({base})",

  // ---- admin ----
  adminTitle: "Data Admin",
  adminSub:
    "Re-upload an updated Scope_of_Work_Priced_QTY.xlsx to re-parse the catalog at runtime.",
  adminDrop: "Drop the workbook here or click to browse",
  adminExpects: "Expects the “Scope of Work” sheet layout · .xlsx",
  adminParsing: "Parsing...",
  adminLoaded:
    "Loaded {items} items across {sections} sections ({priced} priced, {unpriced} unpriced). Selections were reset.",
  adminCurrent: "Currently loaded:",
  adminItemsWord: "items",
  adminSectionsWord: "sections",
  adminReset: "Reset to bundled data",
  adminRulesTitle: "Parsing rules",
  adminRule1:
    "Section headers detected: MARKETING, EVENT MANAGEMENT, LOGISTICS, VIDEO PRODUCTIONS.",
  adminRule2: "Subtotal and grand-total rows are ignored for item parsing.",
  adminRule3: "Rows marked NOT IN MASTER / empty price are kept but flagged unpriced.",
  adminRule4:
    "No prices are invented. Unpriced items stay out of totals until a custom price is set.",
} as const;

export type StringKey = keyof typeof en;

const ar: Record<StringKey, string> = {
  // ---- app shell ----
  appHome: "الرئيسية",
  navAdmin: "الإدارة",
  barReview: "مراجعة الميزانية",
  langToggle: "English",
  langToggleLabel: "التحويل إلى الإنجليزية",

  // ---- sidebar ----
  navOverview: "نظرة عامة",
  navSections: "الأقسام",
  sidebarTotalLabel: "الإجمالي الكلي",
  sidebarBaseFee: "{base} أساسي + {fee} رسوم",
  sidebarEmpty: "لم تحدد أي بند بعد",
  openMenu: "فتح القائمة",
  closeMenu: "إغلاق القائمة",

  // ---- stat strip ----
  statItems: "بند",
  statPriced: "مسعّر",
  statUnpriced: "غير مسعّر",
  statSelected: "محدد",
  statFee: "رسوم",
  kpiNeedPrice: "{n} بحاجة إلى سعر",

  // ---- quantity stepper ----
  decrease: "إنقاص الكمية",
  increase: "زيادة الكمية",

  // ---- budget summary header ----
  clientLabel: "العميل",
  clientPlaceholder: "لمن هذه الميزانية؟",
  titlePlaceholder: "سمّ هذه الميزانية",
  backToBuilder: "العودة إلى الأداة",


  // ---- chart ----
  chartTitle: "الإنفاق حسب القسم",
  chartSub: "الإجمالي الكلي شامل رسوم ١٥٪",
  chartEmpty: "حدد بنوداً لعرض توزيع الإنفاق.",

  // ---- builder toolbar ----
  buildTitle: "ابنِ ميزانيتك",
  buildSub: "اضغط على القسم لتوسيعه واختيار البنود",
  expandAll: "توسيع الكل",
  collapseAll: "طي الكل",
  searchPlaceholder: "ابحث في جميع البنود...",
  filterAllPrices: "جميع الأسعار",
  filterPricedOnly: "المسعّرة فقط",
  filterUnpricedOnly: "غير المسعّرة فقط",
  filterAllSources: "جميع المصادر",
  filterAllMatches: "جميع المطابقات",
  matchExact: "مطابق",
  matchClose: "قريب",
  matchResearch: "بحثي",
  matchDerived: "مشتق",
  matchNotInMaster: "غير موجود في السجل الرئيسي",
  clear: "مسح",
  noMatches: "لا توجد بنود تطابق «{q}».",
  clearFilters: "مسح عوامل التصفية",

  // ---- section accordion ----
  countItems: "{n} بنداً",
  countPriced: "{n} مسعّر",
  countSelected: "{n} محدد",
  countNeedPrice: "{n} بحاجة إلى سعر",
  subtotalInclFee: "المجموع الفرعي (شامل الرسوم)",
  colItem: "البند",
  colQty: "الكمية",
  colRate: "النسبة",
  colUnitPrice: "سعر الوحدة",
  colRatePct: "النسبة ٪",
  colFee: "الرسوم ١٥٪",
  colTotal: "الإجمالي",
  noFilterMatches: "لا توجد بنود تطابق عوامل التصفية الحالية.",
  selectAll: "تحديد الكل",
  deselectAll: "إلغاء تحديد الكل",

  // ---- item row ----
  badgeUnpriced: "غير مسعّر",
  badgeSetRate: "حدد نسبة",
  ofBudgetBase: "من أساس الميزانية",
  ofSectionBase: "من أساس القسم",
  setPrice: "حدد السعر",
  setPercent: "حدد ٪",
  selectItem: "تحديد {name}",
  customPriceHint: "أدخل سعراً مخصصاً لإدراج هذا البند ضمن الإجماليات",
  percentHint: "نسبة مئوية تُطبَّق على المجموع الفرعي للبنود المحددة الأخرى",

  // ---- budget summary ----
  emptyTitle: "ميزانيتك فارغة",
  emptyBody: "انتقل إلى أحد الأقسام وحدد بنود نطاق العمل التي تحتاجها.",
  budgetTitleLabel: "عنوان الميزانية",
  print: "طباعة",
  clearAll: "مسح الكل",
  exportExcel: "تصدير إلى إكسل",
  exporting: "جارٍ التحضير...",
  totalBaseCost: "إجمالي التكلفة الأساسية",
  totalFees: "إجمالي الرسوم (١٥٪)",
  grandTotal: "الإجمالي الكلي",
  unpricedCalloutOne: "بند واحد محدد بلا سعر",
  unpricedCalloutMany: "{n} بنود محددة بلا سعر",
  unpricedCalloutTailOne:
    "ومستبعد من الإجماليات. حدد سعراً (أو نسبة، لبنود الطوارئ) من عرض القسم لإدراجه.",
  unpricedCalloutTailMany:
    "ومستبعدة من الإجماليات. حدد سعراً (أو نسبة، لبنود الطوارئ) من عرض القسم لإدراجها.",
  colSection: "القسم",
  colUnit: "الوحدة",
  colBase: "الأساس",
  badgeCustom: "مخصص",
  notePlaceholder: "أضف ملاحظة (اختياري)...",
  removeItem: "إزالة البند",
  excludedTitle: "مستبعد (بحاجة إلى سعر)",
  qtyBadge: "الكمية {n}",
  percentOfBudgetBase: "{rate}٪ من أساس الميزانية ({base})",
  percentOfSectionBase: "{rate}٪ من أساس القسم ({base})",

  // ---- admin ----
  adminTitle: "إدارة البيانات",
  adminSub:
    "أعد رفع ملف Scope_of_Work_Priced_QTY.xlsx المحدّث لإعادة تحليل الكتالوج مباشرة.",
  adminDrop: "أفلِت الملف هنا أو اضغط للاستعراض",
  adminExpects: "يتوقع تنسيق ورقة «Scope of Work» · ‏.xlsx",
  adminParsing: "جارٍ التحليل...",
  adminLoaded:
    "تم تحميل {items} بنداً عبر {sections} أقسام ({priced} مسعّر، {unpriced} غير مسعّر). أُعيد ضبط التحديدات.",
  adminCurrent: "المحمّل حالياً:",
  adminItemsWord: "بنداً",
  adminSectionsWord: "أقسام",
  adminReset: "إعادة الضبط إلى البيانات المضمّنة",
  adminRulesTitle: "قواعد التحليل",
  adminRule1:
    "عناوين الأقسام المكتشفة: MARKETING، EVENT MANAGEMENT، LOGISTICS، VIDEO PRODUCTIONS.",
  adminRule2: "تُتجاهل صفوف المجاميع الفرعية والإجمالي عند تحليل البنود.",
  adminRule3:
    "تُحفظ الصفوف المعلَّمة NOT IN MASTER أو ذات السعر الفارغ لكنها تُميَّز كغير مسعّرة.",
  adminRule4:
    "لا تُختلق أي أسعار. تبقى البنود غير المسعّرة خارج الإجماليات حتى يُحدد سعر مخصص.",
};

const DICT: Record<Lang, Record<StringKey, string>> = { en, ar };

/** Catalog vocabulary. Falls back to the English source string when unmapped. */
const SECTION_AR: Record<string, string> = {
  Marketing: "التسويق",
  "Event Management": "إدارة الفعاليات",
  Logistics: "الخدمات اللوجستية",
  "Video Productions": "الإنتاج المرئي",
};

const SUBCATEGORY_AR: Record<string, string> = {
  Accommodation: "الإقامة",
  "Branding & Collateral": "الهوية والمطبوعات",
  "Campaign Content": "محتوى الحملة",
  "Content Production": "إنتاج المحتوى",
  "Digital Advertising": "الإعلان الرقمي",
  "Event Documentation": "توثيق الفعالية",
  "Giveaways & Stationery": "الهدايا والقرطاسية",
  "Ground Transport": "النقل البري",
  Hospitality: "الضيافة",
  "Onsite Logistics": "اللوجستيات الميدانية",
  "Permits & Coordination": "التصاريح والتنسيق",
  "Production Items": "مستلزمات الإنتاج",
  "Staffing & Onsite": "الكوادر والتشغيل الميداني",
  "Travel & Flights": "السفر والطيران",
  "Venue & Setup": "الموقع والتجهيز",
  "Video Deliverables": "المخرجات المرئية",
  "Visa & Airport Services": "التأشيرات وخدمات المطار",
};

const TYPE_AR: Record<string, string> = {
  "Basis unclear": "الأساس غير واضح",
  "Fixed per event": "ثابت لكل فعالية",
  "Per attendee": "لكل مشارك",
  "Per day": "لكل يوم",
  "Per deliverable": "لكل مُخرَج",
  "Per discrete unit": "لكل وحدة",
  "Per room": "لكل غرفة",
  "Per square metre": "لكل متر مربع",
};

const MATCH_AR: Record<string, string> = {
  EXACT: "مطابق",
  CLOSE: "قريب",
  RESEARCH: "بحثي",
  DERIVED: "مشتق",
  "NOT IN MASTER": "غير موجود في السجل الرئيسي",
};

const SOURCE_AR: Record<string, string> = {
  TAM: "تام",
  Threelines: "ثري لاينز",
  Research: "بحثي",
  Derived: "مشتق",
  Pricing_V1: "قائمة الأسعار v1",
  "(no source on file)": "(لا يوجد مصدر مسجل)",
};

function lookup(table: Record<string, string>, value: string, lang: Lang) {
  if (lang === "en") return value;
  return table[value] ?? value;
}

/** Fill {placeholders} in a string. */
function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) =>
    k in vars ? String(vars[k]) : m
  );
}

export function translate(
  lang: Lang,
  key: StringKey,
  vars?: Record<string, string | number>
) {
  return interpolate(DICT[lang][key], vars);
}

/**
 * Translation hook. Returns the active language, its writing direction, the
 * string lookup `t`, and helpers for the catalog vocabulary.
 */
export function useT() {
  const lang = useStore((s) => s.language);
  return {
    lang,
    dir: (lang === "ar" ? "rtl" : "ltr") as "rtl" | "ltr",
    isRtl: lang === "ar",
    t: (key: StringKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    tSection: (v: string) => lookup(SECTION_AR, v, lang),
    tSubCategory: (v: string) => lookup(SUBCATEGORY_AR, v, lang),
    tType: (v: string) => lookup(TYPE_AR, v, lang),
    tMatch: (v: string) => lookup(MATCH_AR, (v || "").toUpperCase(), lang),
    tSource: (v: string) => lookup(SOURCE_AR, v, lang),
  };
}
