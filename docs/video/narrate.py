import json, sys, os, soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
voice, outdir = sys.argv[1], sys.argv[2]
os.makedirs(outdir, exist_ok=True)
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
lang = "en-gb" if voice.startswith("b") else "en-us"
for it in json.load(open(sys.argv[3])):
    samples, sr = k.create(it["text"], voice=voice, speed=it.get("speed", 1.06), lang=lang)
    # trim leading/trailing silence, keep 120 ms of air
    idx = np.where(np.abs(samples) > 0.01)[0]
    if len(idx): samples = samples[max(0, idx[0]-int(0.12*sr)):min(len(samples), idx[-1]+int(0.12*sr))]
    sf.write(f"{outdir}/{it['id']}.wav", samples, sr)
    print(it["id"], round(len(samples)/sr, 1), "s")
