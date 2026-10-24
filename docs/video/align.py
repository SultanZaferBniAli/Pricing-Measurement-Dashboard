"""
Word timestamps for each narration file, using Vosk (offline).
Writes build/vo/words.json: { "s0": [{"w": "bored", "t": 0.31}, ...], ... }
The recogniser's words are matched to the script's words, so every script word
gets a time even when the recogniser mishears one.
"""
import json, os, sys, wave, subprocess, difflib, re
from vosk import Model, KaldiRecognizer, SetLogLevel
SetLogLevel(-1)
here = os.path.dirname(os.path.abspath(__file__)); vo = os.path.join(here, "build", "vo")
model = Model(sys.argv[1])
script = {it["id"]: it["text"] for it in json.load(open(os.path.join(here, "narration.json")))}
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())
out = {}
for sid, text in script.items():
    src = next((os.path.join(vo, f"{sid}.{e}") for e in ["wav", "mp3", "m4a", "aiff"] if os.path.exists(os.path.join(vo, f"{sid}.{e}"))), None)
    if not src: continue
    pcm = os.path.join(vo, f"_{sid}_16k.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "16000", "-sample_fmt", "s16", pcm], check=True)
    wf = wave.open(pcm, "rb"); rec = KaldiRecognizer(model, 16000); rec.SetWords(True)
    heard = []
    while True:
        data = wf.readframes(4000)
        if not data: break
        if rec.AcceptWaveform(data): heard += json.loads(rec.Result()).get("result", [])
    heard += json.loads(rec.FinalResult()).get("result", [])
    os.remove(pcm)
    words = [w for w in text.split() if norm(w)]
    a = [norm(w) for w in words]; b = [h["word"] for h in heard]
    times = [None]*len(words)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal":
            for k in range(i2-i1): times[i1+k] = heard[j1+k]["start"]
        elif tag == "replace":
            # spread the heard span over the script span
            span = heard[j1:j2]
            for k in range(i2-i1):
                times[i1+k] = span[min(k, len(span)-1)]["start"] if span else None
    # fill gaps by interpolation between known neighbours
    total = wf.getnframes()/16000
    known = [i for i, t in enumerate(times) if t is not None]
    for i in range(len(times)):
        if times[i] is not None: continue
        prev = max([k for k in known if k < i], default=None); nxt = min([k for k in known if k > i], default=None)
        t0 = times[prev] if prev is not None else 0.1; t1 = times[nxt] if nxt is not None else total*0.95
        i0 = prev if prev is not None else -1; i1 = nxt if nxt is not None else len(times)
        times[i] = t0 + (t1-t0)*(i-i0)/(i1-i0)
    out[sid] = [{"w": w, "t": round(t, 3)} for w, t in zip(words, times)]
    print(sid, " ".join(f"{w}@{t:.2f}" for w, t in zip(words, times)))
json.dump(out, open(os.path.join(vo, "words.json"), "w"), indent=1)
