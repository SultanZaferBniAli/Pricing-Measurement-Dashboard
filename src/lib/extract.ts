/**
 * Turn an uploaded RFP file into text for the model. PDF, DOCX and plain text
 * go through the existing RFP reader; spreadsheets are flattened row by row.
 * Everything runs in the browser; only the text reaches the server.
 */
import { extractText } from "./rfp";

export interface ExtractedFile {
  name: string;
  /** Extracted text, for documents. Empty for images. */
  text: string;
  chars: number;
  /** Set for screenshots and photos: sent to the model as an image, not text. */
  image?: { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string };
  error?: string;
}

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
/** Claude reads images best at or under this long edge; bigger only costs tokens. */
const MAX_EDGE = 1568;

/** Decode, downscale if large, and re-encode as base64 (no data: prefix). */
async function prepareImage(file: File): Promise<ExtractedFile> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  // Screenshots compress well as PNG; photos (jpeg) stay jpeg to keep them small.
  const mediaType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const dataUrl = canvas.toDataURL(mediaType, 0.9);
  const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { name: file.name, text: "", chars: 0, image: { mediaType, data } };
}

async function extractPptx(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const out: string[] = [];
  for (const name of slides) {
    const xml = await zip.file(name)!.async("string");
    const text = xml
      .replace(/<\/a:p>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/[ \t]+/g, " ")
      .trim();
    out.push(`## Slide ${name.match(/\d+/)![0]}\n${text}`);
  }
  return out.join("\n\n");
}

export async function extractFile(file: File): Promise<ExtractedFile> {
  const lower = file.name.toLowerCase();
  if (IMAGE_TYPES.has(file.type) || /\.(png|jpe?g|webp|gif)$/.test(lower)) {
    try {
      return await prepareImage(file);
    } catch (e) {
      return { name: file.name, text: "", chars: 0, error: (e as Error).message };
    }
  }
  if (lower.endsWith(".pptx")) {
    try {
      const text = await extractPptx(file);
      return { name: file.name, text, chars: text.length };
    } catch (e) {
      return { name: file.name, text: "", chars: 0, error: (e as Error).message };
    }
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const out: string[] = [];
      wb.eachSheet((ws) => {
        out.push(`## Sheet: ${ws.name}`);
        ws.eachRow((row) => {
          const cells = (row.values as unknown[]).slice(1).map((v) => {
            if (v == null) return "";
            if (typeof v === "object" && v !== null && "result" in v) return String((v as { result: unknown }).result ?? "");
            if (typeof v === "object" && v !== null && "richText" in v)
              return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
            return String(v);
          });
          if (cells.some((c) => c.trim())) out.push(cells.join(" | "));
        });
      });
      const text = out.join("\n");
      return { name: file.name, text, chars: text.length };
    } catch (e) {
      return { name: file.name, text: "", chars: 0, error: (e as Error).message };
    }
  }
  const doc = await extractText(file);
  return { name: doc.name, text: doc.text, chars: doc.chars, error: doc.error };
}
