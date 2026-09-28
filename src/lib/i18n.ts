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
  themeToDark: "Switch to dark mode",
  themeToLight: "Switch to light mode",

  // ---- sidebar ----
  navOverview: "Overview",
  navHistory: "Exported budgets",
  historyEmpty: "Budgets you export to Excel are saved here, so you can reopen one later.",
  historyOpen: "Open this budget",
  historyOpenInBuilder: "Open in builder",
  historyExportedOn: "Exported",
  historyRfpLabel: "RFP",
  historyGone: "That budget is no longer in the list.",
  historyDrift:
    "This budget totalled {then} when it was exported. Priced against today's catalog it comes to {now}, so a rate has changed since.",
  historyUnpricedNote: "{n} selected lines had no price and were excluded from the total.",
  historyDelete: "Remove from history",
  historyConfirm: "Click again to remove",
  untitledBudget: "Untitled budget",
  exportedNotice: "Exported. “{title}” is saved under Exported budgets, and this is a fresh budget.",
  exportedView: "View it",
  countMatching: "{n} matching",
  sidebarTotalLabel: "Grand total",
  sidebarBaseFeeVat: "{base} base + {fee} fee + {vat} VAT",
  sidebarEmpty: "Nothing selected yet",
  openMenu: "Open menu",
  closeMenu: "Close menu",

  // ---- stat strip ----

  // ---- quantity stepper ----
  decrease: "Decrease quantity",
  increase: "Increase quantity",

  // ---- budget summary header ----
  clientLabel: "Client",
  clientPlaceholder: "Who is this budget for?",
  backToBuilder: "Back to builder",
  addMoreItems: "Add more items",

  // ---- chart ----
  chartTitle: "Spend by Section",
  chartSub: "Grand total incl. 15% fee",
  chartEmpty: "Select items to see the spend breakdown.",

  // ---- builder toolbar ----
  buildTitle: "Build your budget",
  budgetBarHint: "Nothing selected yet",
  budgetBarStatus: "{n} selected",
  budgetBarNeedsPrice: "· {n} still need a price",
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
  clearFilters: "Clear filters",

  // ---- section accordion ----
  countItems: "{n} items",
  countPriced: "{n} priced",
  countSelected: "{n} selected",
  countNeedPrice: "{n} need price",
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
  colUnit: "Unit",
  colBase: "Base",
  badgeCustom: "custom",
  notePlaceholder: "Add a note (optional)...",
  removeItem: "Remove item",
  excludedTitle: "Needs a price",
  percentOfBudgetBase: "{rate}% of the budget base ({base})",
  percentOfSectionBase: "{rate}% of the section base ({base})",

  // ---- vendors ----
  navVendors: "Vendors",
  vendorsTitle: "Who priced what",
  vendorsSub:
    "How much of this budget did somebody quote us, and how much did we assume? Open a supplier to see exactly which of your selected lines they price.",
  vendorsVerifiedEmpty: "Select items to see how much of the budget rests on quoted pricing.",
  vendorsQuotedLabel: "Quoted by a supplier",
  vendorsQuotedBody:
    "{quoted}% of this budget uses a price somebody quoted us. The remaining {assumed}% is our own benchmark or composed pricing, and should be presented as an estimate.",
  vendorsQuoted: "Quoted",
  vendorsAssumed: "Assumed",
  vendorsLinesInBudget: "{n} lines here",
  vendorsOneLineInBudget: "1 line here",
  vendorsNotUsed: "not used here",
  vendorsDetailTitle: "Everything {name} prices",
  vendorsDetailCounts: "{total} lines on their list · {used} in this budget",
  vendorsOnlyInBudget: "Only what I selected",
  vendorsNotSelected: "not selected",
  vendorsDetailEmpty: "Nothing to show for {name}.",
  vendorsCatalogLines: "catalog lines",

  // ---- project brief ----
  reviewTitle: "Review budget",
  briefTitle: "Project brief",
  projectLabel: "Project / RFP",
  projectPlaceholder: "What are we proposing for?",
  dateLabel: "Established",
  projectDescLabel: "About the project",
  projectDescPlaceholder: "A few lines on what the project involves.",

  // ---- RFP scope check ----
  rfpTitle: "Check against the RFP",
  rfpSub:
    "Upload the RFP and this compares its wording against the catalog, then suggests lines to add or drop. It matches terms rather than reading meaning, so every suggestion shows the words it found. Nothing changes until you accept it. The files stay on this machine.",
  rfpDrop: "Drop the RFP here, or click to browse",
  rfpFormats: "PDF, Word (.docx), or plain text · up to 5 files",
  rfpAnalyse: "Analyse",
  rfpAnalysing: "Reading...",
  rfpRemoveFile: "Remove file",
  rfpFailed: "Could not open {files}. {reason}",
  rfpUnreadable:
    "No text could be read from those files. A scanned PDF holds pictures of text, not text, so it needs to be run through OCR first.",
  rfpRead: "Read {n} file(s), {chars} characters",
  rfpConfirmed: "{n} selected lines appear in the RFP",
  rfpNothingToChange: "Nothing to change. Every selected line appears in the RFP, and nothing obvious is missing.",
  rfpMissingTitle: "{n} lines the RFP asks for",
  rfpMissingBody: "These appear in the RFP but are not in the budget.",
  rfpExtraTitle: "{n} lines the RFP does not mention",
  rfpExtraBody: "These are in the budget but nothing in the RFP refers to them. That may be correct: check before dropping.",
  rfpArabic:
    "This RFP is written in Arabic, and the catalog's item names are English, so very little will match. Until the catalog carries Arabic terms, treat the result below as incomplete rather than as a clean bill of health.",
  rfpMixed:
    "This RFP mixes Arabic and English. Only the English parts were matched against the catalog, so the result below is partial.",

  // ---- precedent ----
  precedentTitle: "Budgeted before: {n} similar RFP(s)",
  precedentBody:
    "Budgets you exported against an RFP that reads like this one. What they contained is precedent, not instruction.",
  precedentSimilarity: "{pct}% alike",
  precedentDiff: "shared {same} · only in theirs {missing} · only in yours {extra}",
  precedentAdded: "Added",
  precedentMore: "and {n} more",
  rfpMatchedOn: "Found:",
  rfpAdd: "Add",
  rfpRemove: "Remove",
  rfpDismiss: "Ignore",
  rfpKeep: "Keep",

  // ---- overview ----
  navHome: "Dashboard",
  panelTitle: "Your selection",
  panelEmpty: "Nothing picked yet. Tick items on the left and they appear here.",
  panelJump: "Go to this section",
  panelRemove: "Remove {name}",
  panelClearConfirm: "Click again to clear all",
  newBudgetConfirm:
    "You have {n} items in the current budget that have not been exported. Starting a new one clears them.",
  newBudgetKeep: "Keep working",
  newBudgetDiscard: "Start new",
  productName: "Pricing Intelligence",
  aiCardTitle: "AI-assisted pricing",
  aiCardBody: "Turn an RFP into an accurate budget, faster.",
  navCatalog: "Pricing Catalog",
  overviewTitle: "Pricing Management Dashboard",
  overviewSub: "Build, analyse and manage project budgets",
  overviewNewBudget: "New budget",
  overviewViewAll: "View all",
  overviewVendorsSub: "Who stands behind the prices in this budget",
  overviewVendorsEmpty: "Pick items and this shows which supplier priced each one.",
  kpiTotal: "Final total",
  kpiTotalHint: "Incl. 15% fee and 15% VAT",
  kpiSelected: "Selected items",
  kpiSelectedHint: "of {n} in the catalog",
  kpiFee: "TAM fee",
  kpiFeeHint: "15% of the base cost",
  kpiVendors: "Vendors used",
  kpiVendorsHint: "of {n} price sources",
  kpiPriced: "Priced lines",
  kpiPricedHint: "of {n} in the catalog",
  kpiMissing: "Missing pricing",
  kpiMissingHint: "{n} unpriced in the catalog",
  breakdownTitle: "Budget breakdown",
  breakdownBySection: "By section",
  breakdownByType: "By type",
  breakdownByVendor: "By vendor",
  breakdownCenter: "Subtotal incl. fee",
  breakdownEmpty: "Select items to see how the budget splits.",
  summaryTitle: "Budget summary",
  summaryReview: "Review budget",
  summaryUnpriced: "{n} selected lines still have no price and are excluded.",
  totalVat: "VAT (15%)",
  finalTotal: "Final total",
  recentTitle: "Recent budgets",
  recentCount: "{n} saved",
  recentEmpty: "Budgets you export appear here.",
  recentNoClient: "No client set",
  statusChecked: "RFP checked",
  statusDraft: "No RFP",

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
  themeToDark: "التحويل إلى الوضع الداكن",
  themeToLight: "التحويل إلى الوضع الفاتح",

  // ---- sidebar ----
  navOverview: "نظرة عامة",
  navHistory: "الميزانيات المصدَّرة",
  historyEmpty: "تُحفظ هنا الميزانيات التي تصدّرها إلى إكسل، لتتمكن من فتحها لاحقاً.",
  historyOpen: "فتح هذه الميزانية",
  historyOpenInBuilder: "فتحها في الأداة",
  historyExportedOn: "تاريخ التصدير",
  historyRfpLabel: "كراسة الشروط",
  historyGone: "لم تعد هذه الميزانية ضمن القائمة.",
  historyDrift:
    "بلغ إجمالي هذه الميزانية {then} عند تصديرها. وبتسعيرها وفق الكتالوج الحالي تبلغ {now}، أي أن سعراً ما قد تغيّر منذ ذلك الحين.",
  historyUnpricedNote: "{n} بنداً محدداً بلا سعر واستُبعدت من الإجمالي.",
  historyDelete: "إزالة من السجل",
  historyConfirm: "اضغط مرة أخرى للإزالة",
  untitledBudget: "ميزانية بلا عنوان",
  exportedNotice: "تم التصدير. حُفظت «{title}» ضمن الميزانيات المصدَّرة، وهذه ميزانية جديدة.",
  exportedView: "عرضها",
  countMatching: "{n} مطابق",
  sidebarTotalLabel: "الإجمالي الكلي",
  sidebarBaseFeeVat: "{base} أساسي + {fee} رسوم + {vat} ضريبة",
  sidebarEmpty: "لم تحدد أي بند بعد",
  openMenu: "فتح القائمة",
  closeMenu: "إغلاق القائمة",

  // ---- stat strip ----

  // ---- quantity stepper ----
  decrease: "إنقاص الكمية",
  increase: "زيادة الكمية",

  // ---- budget summary header ----
  clientLabel: "العميل",
  clientPlaceholder: "لمن هذه الميزانية؟",
  backToBuilder: "العودة إلى الأداة",
  addMoreItems: "إضافة بنود أخرى",

  // ---- chart ----
  chartTitle: "الإنفاق حسب القسم",
  chartSub: "الإجمالي الكلي شامل رسوم ١٥٪",
  chartEmpty: "حدد بنوداً لعرض توزيع الإنفاق.",

  // ---- builder toolbar ----
  buildTitle: "ابنِ ميزانيتك",
  budgetBarHint: "لم تحدد أي بند بعد",
  budgetBarStatus: "{n} محدد",
  budgetBarNeedsPrice: "· {n} بحاجة إلى سعر",
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
  clearFilters: "مسح عوامل التصفية",

  // ---- section accordion ----
  countItems: "{n} بنداً",
  countPriced: "{n} مسعّر",
  countSelected: "{n} محدد",
  countNeedPrice: "{n} بحاجة إلى سعر",
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
  colUnit: "الوحدة",
  colBase: "الأساس",
  badgeCustom: "مخصص",
  notePlaceholder: "أضف ملاحظة (اختياري)...",
  removeItem: "إزالة البند",
  excludedTitle: "بحاجة إلى سعر",
  percentOfBudgetBase: "{rate}٪ من أساس الميزانية ({base})",
  percentOfSectionBase: "{rate}٪ من أساس القسم ({base})",

  // ---- vendors ----
  navVendors: "المورّدون",
  vendorsTitle: "من سعّر ماذا",
  vendorsSub:
    "كم من هذه الميزانية مبني على عرض سعر من مورّد، وكم منها تقديري؟ افتح أي مورّد لترى البنود المحددة التي يسعّرها.",
  vendorsVerifiedEmpty: "حدد بنوداً لمعرفة نسبة الميزانية المستندة إلى أسعار بعروض من المورّدين.",
  vendorsQuotedLabel: "بعرض سعر من مورّد",
  vendorsQuotedBody:
    "‏{quoted}٪ من هذه الميزانية تستخدم سعراً قدّمه لنا مورّد. أما {assumed}٪ المتبقية فهي أسعار استرشادية أو مركّبة من إعدادنا، ويجب تقديمها كتقدير.",
  vendorsQuoted: "بعرض سعر",
  vendorsAssumed: "تقديري",
  vendorsLinesInBudget: "{n} بنود هنا",
  vendorsOneLineInBudget: "بند واحد هنا",
  vendorsNotUsed: "غير مستخدم هنا",
  vendorsDetailTitle: "كل ما يسعّره {name}",
  vendorsDetailCounts: "{total} بنداً في قائمتهم · {used} في هذه الميزانية",
  vendorsOnlyInBudget: "ما حددته فقط",
  vendorsNotSelected: "غير محدد",
  vendorsDetailEmpty: "لا يوجد ما يُعرض لـ {name}.",
  vendorsCatalogLines: "بنداً في الكتالوج",

  // ---- project brief ----
  reviewTitle: "مراجعة الميزانية",
  briefTitle: "موجز المشروع",
  projectLabel: "المشروع / كراسة الشروط",
  projectPlaceholder: "ما الذي نقدّم عرضاً له؟",
  dateLabel: "تاريخ الإنشاء",
  projectDescLabel: "عن المشروع",
  projectDescPlaceholder: "سطور قليلة عمّا يتضمنه المشروع.",

  // ---- RFP scope check ----
  rfpTitle: "المطابقة مع كراسة الشروط",
  rfpSub:
    "ارفع كراسة الشروط ليقارن النظام نصّها بالكتالوج، ثم يقترح بنوداً للإضافة أو الحذف. المطابقة تعتمد على المصطلحات لا على فهم المعنى، لذا يعرض كل اقتراح الكلمات التي وجدها. لا يتغير شيء حتى توافق. تبقى الملفات على هذا الجهاز.",
  rfpDrop: "أفلِت كراسة الشروط هنا، أو اضغط للاستعراض",
  rfpFormats: "‏PDF أو وورد (.docx) أو نص عادي · حتى ٥ ملفات",
  rfpAnalyse: "تحليل",
  rfpAnalysing: "جارٍ القراءة...",
  rfpRemoveFile: "إزالة الملف",
  rfpFailed: "تعذّر فتح {files}. {reason}",
  rfpUnreadable:
    "تعذّرت قراءة أي نص من هذه الملفات. ملف PDF الممسوح ضوئياً يحتوي صوراً للنص لا نصاً، ويحتاج إلى معالجة تعرّف ضوئي أولاً.",
  rfpRead: "قُرئ {n} ملف، {chars} حرف",
  rfpConfirmed: "{n} من البنود المحددة تظهر في كراسة الشروط",
  rfpNothingToChange: "لا شيء يحتاج تعديلاً. كل بند محدد يظهر في كراسة الشروط، ولا ينقص شيء واضح.",
  rfpMissingTitle: "{n} بنداً تطلبها كراسة الشروط",
  rfpMissingBody: "تظهر هذه البنود في كراسة الشروط لكنها ليست ضمن الميزانية.",
  rfpExtraTitle: "{n} بنداً لا تذكرها كراسة الشروط",
  rfpExtraBody: "هذه البنود ضمن الميزانية لكن لا شيء في كراسة الشروط يشير إليها. قد يكون ذلك صحيحاً: تحقق قبل الحذف.",
  rfpArabic:
    "كراسة الشروط هذه مكتوبة بالعربية، وأسماء بنود الكتالوج بالإنجليزية، لذا لن يتطابق منها إلا القليل. إلى أن يحمل الكتالوج مصطلحات عربية، اعتبر النتيجة أدناه ناقصة لا شهادة سلامة.",
  rfpMixed:
    "تخلط كراسة الشروط هذه بين العربية والإنجليزية. طوبقت الأجزاء الإنجليزية فقط مع الكتالوج، لذا النتيجة أدناه جزئية.",

  // ---- precedent ----
  precedentTitle: "سبق تسعيرها: {n} كراسة شروط مشابهة",
  precedentBody:
    "ميزانيات صدّرتها سابقاً مقابل كراسة شروط تشبه هذه. ما احتوته سابقة يُستأنس بها، لا تعليمات تُتبع.",
  precedentSimilarity: "تشابه {pct}٪",
  precedentDiff: "مشترك {same} · لديهم فقط {missing} · لديك فقط {extra}",
  precedentAdded: "أُضيف",
  precedentMore: "و{n} غيرها",
  rfpMatchedOn: "وُجد:",
  rfpAdd: "إضافة",
  rfpRemove: "حذف",
  rfpDismiss: "تجاهل",
  rfpKeep: "إبقاء",

  // ---- overview ----
  navHome: "لوحة التحكم",
  panelTitle: "اختيارك",
  panelEmpty: "لم تحدد شيئاً بعد. حدد بنوداً من اليمين لتظهر هنا.",
  panelJump: "الانتقال إلى هذا القسم",
  panelRemove: "إزالة {name}",
  panelClearConfirm: "اضغط مرة أخرى لمسح الكل",
  newBudgetConfirm:
    "لديك {n} بنداً في الميزانية الحالية لم تُصدَّر بعد. بدء ميزانية جديدة سيمسحها.",
  newBudgetKeep: "متابعة العمل",
  newBudgetDiscard: "بدء جديدة",
  productName: "منصة التسعير",
  aiCardTitle: "تسعير بمساعدة الذكاء الاصطناعي",
  aiCardBody: "حوّل كراسة الشروط إلى ميزانية دقيقة، بوقت أقل.",
  navCatalog: "كتالوج الأسعار",
  overviewTitle: "لوحة إدارة التسعير",
  overviewSub: "ابنِ ميزانيات المشاريع وحلّلها وأدرها",
  overviewNewBudget: "ميزانية جديدة",
  overviewViewAll: "عرض الكل",
  overviewVendorsSub: "من يقف خلف الأسعار في هذه الميزانية",
  overviewVendorsEmpty: "حدد بنوداً ليظهر هنا المورّد الذي سعّر كل بند.",
  kpiTotal: "الإجمالي النهائي",
  kpiTotalHint: "شامل رسوم ١٥٪ وضريبة ١٥٪",
  kpiSelected: "البنود المحددة",
  kpiSelectedHint: "من {n} في الكتالوج",
  kpiFee: "رسوم تام",
  kpiFeeHint: "١٥٪ من التكلفة الأساسية",
  kpiVendors: "المورّدون المستخدمون",
  kpiVendorsHint: "من {n} مصادر تسعير",
  kpiPriced: "البنود المسعّرة",
  kpiPricedHint: "من {n} في الكتالوج",
  kpiMissing: "بنود بلا سعر",
  kpiMissingHint: "{n} غير مسعّر في الكتالوج",
  breakdownTitle: "توزيع الميزانية",
  breakdownBySection: "حسب القسم",
  breakdownByType: "حسب النوع",
  breakdownByVendor: "حسب المورّد",
  breakdownCenter: "المجموع شامل الرسوم",
  breakdownEmpty: "حدد بنوداً لعرض توزيع الميزانية.",
  summaryTitle: "ملخص الميزانية",
  summaryReview: "مراجعة الميزانية",
  summaryUnpriced: "{n} بنداً محدداً بلا سعر ومستبعد من الإجمالي.",
  totalVat: "ضريبة القيمة المضافة (١٥٪)",
  finalTotal: "الإجمالي النهائي",
  recentTitle: "أحدث الميزانيات",
  recentCount: "{n} محفوظة",
  recentEmpty: "تظهر هنا الميزانيات التي تصدّرها.",
  recentNoClient: "لم يُحدد عميل",
  statusChecked: "طوبقت مع الكراسة",
  statusDraft: "بلا كراسة",

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
