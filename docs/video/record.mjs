/**
 * Record the explainer page to MP4 with narration.
 *   node docs/video/record.mjs
 * Uses the installed Google Chrome through puppeteer-core, Chrome's screencast
 * for the picture, the per-scene narration files for the sound, ffmpeg to mix.
 */
import puppeteer from "puppeteer-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "explainer-v2.src.html");
const page = path.join(here, "explainer-v2.html");
const build = path.join(here, "build");
const webm = path.join(build, "video.webm");
const out = path.join(here, "TAM-Pricing-Dashboard-Explainer.mp4");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const mixOnly = process.argv.includes("--mix-only");

// Narration files: s0..s10 as mp3, wav, m4a or aiff, whichever exists. Their
// measured lengths set the scene lengths, so a new voice re-times the cut.
const voDir = path.join(build, "vo");
const IDS = ["s0","s1","s2","s3","s4","s5","s6","s7","s8","s9","s10"];
function voFile(id) {
  for (const ext of ["mp3", "wav", "m4a", "aiff"]) {
    const f = path.join(voDir, `${id}.${ext}`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}
const durations = {};
for (const id of IDS) {
  const f = voFile(id);
  if (!f) continue;
  durations[id] = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
}
// word timestamps (Vosk) so on-screen words land on the spoken ones
let words = {};
if (process.env.VOSK_MODEL) {
  try { execFileSync(process.env.SFX_PYTHON || "python3", [path.join(here, "align.py"), process.env.VOSK_MODEL], { stdio: "pipe" }); } catch (e) { console.warn("align.py failed:", String(e.stderr || e.message).slice(0, 200)); }
}
try { words = JSON.parse(fs.readFileSync(path.join(voDir, "words.json"), "utf8")); } catch { /* none */ }
fs.writeFileSync(page, fs.readFileSync(src, "utf8").replace("__DURATIONS__", JSON.stringify(durations)).replace("__WORDS__", JSON.stringify(words)));
console.log("narration:", Object.entries(durations).map(([k, v]) => `${k}=${v.toFixed(1)}s`).join(" "));
const timelineFile = path.join(build, "timeline.json");
let timeline;
if (!mixOnly) {
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--window-size=1280,720", "--hide-scrollbars", "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required"] });
const tab = await browser.newPage();
await tab.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await tab.goto("file://" + page + "?record=1", { waitUntil: "load" });
await tab.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 800));
timeline = await tab.evaluate(() => window.__timeline);
fs.writeFileSync(timelineFile, JSON.stringify(timeline));
console.log("total", timeline.total.toFixed(1), "s");

const rec = await tab.screencast({ path: webm, fps: 30 });
// Let the capture settle before the clock starts; LEAD seconds are trimmed off the front at mix time.
const LEAD = 1.5;
await new Promise((r) => setTimeout(r, LEAD * 1000));
await tab.evaluate(() => window.__start());
await new Promise((r) => setTimeout(r, (timeline.total + 0.6) * 1000));
await rec.stop();
await browser.close();
} else {
  timeline = JSON.parse(fs.readFileSync(timelineFile, "utf8"));
}
// Sound design and music are generated from the timeline (needs numpy + soundfile).
try {
  execFileSync(process.env.SFX_PYTHON || "python3", [path.join(here, "sfx.py")], { stdio: "inherit" });
} catch {
  console.warn("sfx.py failed; mixing without sound design");
}

// Audio: each narration clip placed at its scene's start.
const inputs = [], delays = [];
timeline.scenes.forEach((s, i) => {
  const f = voFile(s.id);
  if (!f) return;
  inputs.push("-i", f);
  // input 0 is the video; narration clips are inputs 1..n
  const at = Math.round((s.start + 0.25 + (s.voOffset || 0)) * 1000);
  delays.push(`[${inputs.length / 2}:a]adelay=${at}|${at}[a${i}]`);
});
const n = delays.length;
// Voice bed, then sound design and music if they exist. The music is ducked
// under the voice with a sidechain compressor so the narration always leads.
const sfx = path.join(build, "sfx.wav");
const music = path.join(build, "music.wav");
const extra = [];
let graph = delays.join(";") + ";" + delays.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${n}:normalize=0:dropout_transition=0,volume=1.5,aresample=48000[vo]`;
let mixInputs = "[vo]";
let mixCount = 1;
const nextIndex = () => 1 + inputs.length / 2 + extra.length / 2;
if (fs.existsSync(music)) {
  const mi = nextIndex(); extra.push("-i", music);
  graph += `;[vo]asplit=2[vo_out][vo_key];[${mi}:a]volume=0.16[m];[m][vo_key]sidechaincompress=threshold=0.015:ratio=7:attack=15:release=500:makeup=1[m_duck]`;
  mixInputs = "[vo_out][m_duck]"; mixCount = 2;
}
if (fs.existsSync(sfx)) {
  const si = nextIndex(); extra.push("-i", sfx);
  graph += `;[${si}:a]volume=0.42[s]`;
  mixInputs += "[s]"; mixCount += 1;
}
graph += `;${mixInputs}amix=inputs=${mixCount}:normalize=0:dropout_transition=0,alimiter=limit=0.95[out]`;
execFileSync("ffmpeg", ["-y", "-ss", String(typeof LEAD === "number" ? LEAD : 1.5), "-i", webm, ...inputs, ...extra, "-filter_complex", graph, "-map", "0:v", "-map", "[out]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
console.log("wrote", out);
