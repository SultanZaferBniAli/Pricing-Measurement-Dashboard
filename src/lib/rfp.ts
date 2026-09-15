/**
 * Reading an RFP and checking it against the selected budget.
 *
 * WHAT THIS IS. A rules-based first pass, not comprehension. It extracts the
 * text of the RFP, then scores every catalog item by how much of its own
 * vocabulary appears in that text. It is useful because it is fast, free, runs
 * entirely in the browser (no RFP text leaves the machine) and, above all,
 * because it SHOWS ITS WORKING: every suggestion carries the exact terms that
 * triggered it, so a human can judge it in a second. It cannot understand
 * intent, negation, or anything implied rather than written.
 *
 * SWAPPING IN AN LLM. `analyseRfp` is the only entry point the UI uses, and
 * `ScopeSuggestion` is the only shape it returns. A model-backed version needs
 * to satisfy that signature and nothing else. Keep `matchedTerms` populated
 * whatever the engine: a suggestion a user cannot check is a suggestion a user
 * cannot trust.
 */
import type { ScopeItem, Section } from "./types";

export interface RfpDocument {
  name: string;
  /** Characters of text extracted. 0 means nothing readable came out. */
  chars: number;
  text: string;
  /**
   * Set when extraction threw. A file that fails to open is a different problem
   * from one that opens and holds no text, and the two must not be reported the
   * same way: the first is a bug to fix, the second needs OCR.
   */
  error?: string;
}

export type SuggestionKind = "add" | "review";

export interface ScopeSuggestion {
  item: ScopeItem;
  kind: SuggestionKind;
  /** 0..1. How much of the item's vocabulary the RFP actually contains. */
  confidence: number;
  /** The terms found in the RFP, verbatim, so the user can check the call. */
  matchedTerms: string[];
}

export interface RfpAnalysis {
  documents: RfpDocument[];
  /** Catalog items the RFP asks for that are not in the budget. */
  add: ScopeSuggestion[];
  /** Selected items the RFP never mentions. */
  review: ScopeSuggestion[];
  /** Selected items the RFP does mention, so they need no attention. */
  confirmedCount: number;
  analysedAt: string;
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

/** Pull readable text out of a PDF, DOCX, or plain-text file. */
export async function extractText(file: File): Promise<RfpDocument> {
  const name = file.name;
  const lower = name.toLowerCase();

  try {
    let text = "";
    if (lower.endsWith(".pdf")) {
      text = await extractPdf(file);
    } else if (lower.endsWith(".docx")) {
      text = await extractDocx(file);
    } else {
      text = await file.text();
    }
    return { name, text, chars: text.length };
  } catch (e) {
    const message = (e as Error)?.message || String(e);
    // Keep it in the console too: the UI shows one line, the stack is here.
    console.error(`[rfp] could not read ${name}`, e);
    return { name, text: "", chars: 0, error: message };
  }
}

async function extractPdf(file: File): Promise<string> {
  // Lazy-loaded: pdf.js is large and most sessions never open a PDF.
  const pdfjs = await import("pdfjs-dist");
  // `?url` is Vite's own way to get a hashed, emitted asset URL for a bare
  // specifier. `new URL(spec, import.meta.url)` does NOT resolve bare
  // specifiers: it treats them as relative, which silently produced a 404 and
  // left the worker dead.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
    .default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((it) => ("str" in it ? (it as { str: string }).str : ""))
        .join(" ")
    );
  }
  return pages.join("\n");
}

async function extractDocx(file: File): Promise<string> {
  // A .docx is a zip; the body text lives in word/document.xml.
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  return xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ");
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Words too common in any RFP to carry signal. Matching on "service" or
 * "management" would light up half the catalog.
 */
const STOPWORDS = new Set([
  "and","the","for","with","per","not","any","all","from","into","that","this",
  "will","shall","must","may","are","was","were","has","have","had","been","its",
  "his","her","their","our","your","other","such","each","than","then","them",
  "these","those","there","here","when","where","which","while","also","only",
  "more","most","some","both","after","before","above","below","between",
  "service","services","management","managing","provide","provided","providing",
  "including","include","included","required","require","requirement","general",
  "event","events","project","projects","work","scope","item","items","cost",
  "costs","price","prices","pricing","total","budget","quantity","unit","units",
  "day","days","class","related","support","overall","additional","various",
]);

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * The vocabulary of one catalog item, split by how much it proves.
 *
 * `name` words identify THIS line. Category words (sub-category, master
 * category) are shared by a dozen siblings, so on their own they prove nothing:
 * "accommodation" appearing in an RFP is not evidence that it asked for
 * glamping. They are kept only to break ties between items that already match
 * on their own name.
 */
function itemTerms(item: ScopeItem): {
  phrases: string[];
  nameWords: string[];
  contextWords: string[];
} {
  // Only the item's own name and its master row identify it. masterCategory is
  // a bucket ("stage setup") and would score every sibling a perfect match.
  const phrases = [item.name, item.sourceItem]
    .filter((v) => v && !v.startsWith("-"))
    .map((v) => v.toLowerCase().trim())
    .filter((v) => v.length >= 8);

  const keep = (w: string) => w.length >= 4 && !STOPWORDS.has(w);
  const nameWords = Array.from(new Set(tokenise(item.name).filter(keep)));
  const contextWords = Array.from(
    new Set(
      tokenise([item.subCategory, item.masterCategory].join(" "))
        .filter(keep)
        .filter((w) => !nameWords.includes(w))
    )
  );

  return { phrases, nameWords, contextWords };
}

/**
 * Score one item against the RFP text.
 *
 * The item's own name has to appear, in whole or in part. A whole-name phrase
 * hit is conclusive; scattered name words are proportional; category words only
 * nudge an item that already matched on its name.
 */
function scoreItem(
  item: ScopeItem,
  haystack: string,
  haystackWords: Set<string>
): { confidence: number; matchedTerms: string[] } {
  const { phrases, nameWords, contextWords } = itemTerms(item);

  for (const p of phrases) {
    if (haystack.includes(p)) return { confidence: 1, matchedTerms: [p] };
  }

  const hitName = nameWords.filter((w) => haystackWords.has(w));
  if (hitName.length === 0) return { confidence: 0, matchedTerms: [] };

  const hitContext = contextWords.filter((w) => haystackWords.has(w));
  const nameShare = hitName.length / nameWords.length;
  const contextBonus =
    contextWords.length > 0 ? (hitContext.length / contextWords.length) * 0.15 : 0;

  return {
    confidence: Math.min(1, nameShare * 0.9 + contextBonus),
    matchedTerms: [...hitName, ...hitContext].slice(0, 6),
  };
}

/** Below this, a match is more likely to be coincidence than intent. */
const ADD_THRESHOLD = 0.55;

export function analyseRfp(
  documents: RfpDocument[],
  sections: Section[],
  selections: Record<string, unknown>
): RfpAnalysis {
  const haystack = documents.map((d) => d.text).join("\n").toLowerCase();
  const haystackWords = new Set(tokenise(haystack));

  const add: ScopeSuggestion[] = [];
  const review: ScopeSuggestion[] = [];
  let confirmedCount = 0;

  for (const section of sections) {
    for (const item of section.items) {
      const { confidence, matchedTerms } = scoreItem(item, haystack, haystackWords);
      const isSelected = Boolean(selections[item.id]);

      if (isSelected) {
        if (matchedTerms.length === 0) {
          review.push({ item, kind: "review", confidence, matchedTerms });
        } else {
          confirmedCount += 1;
        }
      } else if (confidence >= ADD_THRESHOLD) {
        add.push({ item, kind: "add", confidence, matchedTerms });
      }
    }
  }

  add.sort((a, b) => b.confidence - a.confidence);
  review.sort((a, b) => a.item.name.localeCompare(b.item.name));

  return {
    documents,
    add,
    review,
    confirmedCount,
    analysedAt: new Date().toISOString(),
  };
}
