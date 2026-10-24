"""
Build two audio tracks for the explainer from build/timeline.json:
  build/sfx.wav   - whooshes on cuts, UI clicks, typing, a success chime, counter ticks, riser + impact on the dive
  build/music.wav - a low, driving synthetic bed (ducked under the voice at mix time)
Everything is synthesised here with numpy: no sample library, nothing to license.
"""
import json, os, sys, numpy as np, soundfile as sf

SR = 48000
here = os.path.dirname(os.path.abspath(__file__))
build = os.path.join(here, "build")
tl = json.load(open(os.path.join(build, "timeline.json")))
total = tl["total"] + 0.8
scene = {s["id"]: s["start"] for s in tl["scenes"]}
rng = np.random.default_rng(7)

def env(n, a, d, s=0.0, r=0.05):
    """ADSR-ish envelope in seconds -> samples."""
    a, d, r = int(a*SR), int(d*SR), int(r*SR)
    e = np.zeros(n)
    e[:a] = np.linspace(0, 1, a)
    e[a:a+d] = np.linspace(1, s, d)
    e[a+d:] = s
    if r: e[-r:] *= np.linspace(1, 0, r)
    return e

def noise(n): return rng.standard_normal(n)

def lowpass(x, cutoff):
    # one-pole lowpass; cutoff may be an array for sweeps
    y = np.zeros_like(x); a = np.exp(-2*np.pi*np.asarray(cutoff)/SR)
    if np.isscalar(cutoff): a = np.full(len(x), a)
    acc = 0.0
    for i in range(len(x)):
        acc = a[i]*acc + (1-a[i])*x[i]; y[i] = acc
    return y

def tail(x, delay=0.11, fb=0.45, mix=0.35, n_extra=0.6):
    """A short feedback-delay tail, so hits and whooshes sit in a space instead of stopping dead."""
    d = int(delay*SR); out = np.concatenate([x, np.zeros(int(n_extra*SR))])
    for i in range(d, len(out)):
        out[i] += out[i-d]*fb*mix
    return out

def whoosh(dur=0.45, up=True, flavour=0):
    n = int(dur*SR); t = np.arange(n)/SR; x = noise(n)
    if flavour == 0:   # airy: band-swept noise with a shimmer
        sweep = np.geomspace(400, 9000, n) if up else np.geomspace(9000, 400, n)
        y = lowpass(x, sweep) - lowpass(x, sweep*0.25)
        y = y*env(n, 0.12, dur-0.14, 0.0, 0.02)
    elif flavour == 1: # deep: dark noise plus a sub sweep
        y = lowpass(x, np.geomspace(150, 2500, n))*env(n, 0.15, dur-0.17, 0.0, 0.02)
        y += np.sin(2*np.pi*np.cumsum(np.geomspace(120, 38, n))/SR)*env(n, 0.05, dur-0.1, 0.0, 0.05)*0.9
    else:              # stutter: gated noise that opens into a sweep
        gate = (np.sin(2*np.pi*28*t) > 0).astype(float)*np.linspace(1, 0, n)**2 + np.linspace(0, 1, n)**2
        y = lowpass(x, np.geomspace(500, 7000, n))*gate*env(n, 0.05, dur-0.08, 0.0, 0.03)
    y = tail(y, 0.09, 0.35, 0.3, 0.35)
    return y/(np.abs(y).max()+1e-9)*0.6

def click():
    n = int(0.035*SR); t = np.arange(n)/SR
    y = noise(n)*env(n, 0.001, 0.01, 0.0, 0.01)*0.5 + np.sin(2*np.pi*1800*t)*env(n, 0.0005, 0.02, 0.0, 0.01)*0.6
    return y*0.7

def key():
    n = int(0.03*SR); t = np.arange(n)/SR
    f = rng.uniform(2200, 3600)
    return (np.sin(2*np.pi*f*t)*env(n, 0.0005, 0.012, 0, 0.01)*0.35 + noise(n)*env(n, 0.001, 0.008, 0, 0.005)*0.25)

def chime():
    # plucked, slightly detuned, with octave sparkle and a room tail
    n = int(1.1*SR); t = np.arange(n)/SR
    y = np.zeros(n)
    for i, f in enumerate([659.3, 880, 1318.5]):
        start = int(i*0.06*SR); seg = n-start; tt = t[:seg]
        y[start:] += (np.sin(2*np.pi*f*tt) + 0.4*np.sin(2*np.pi*f*2.003*tt) + 0.2*np.sin(2*np.pi*f*0.5*tt))*np.exp(-tt*5.5)*0.4
    y = tail(y, 0.13, 0.5, 0.4, 0.8)
    return y/(np.abs(y).max()+1e-9)*0.6

def tick():
    n = int(0.02*SR); t = np.arange(n)/SR
    return np.sin(2*np.pi*2600*t)*env(n, 0.0005, 0.012, 0, 0.005)*0.4

def riser(dur=3.6):
    n = int(dur*SR); t = np.arange(n)/SR
    sweep = np.geomspace(120, 5000, n)
    y = lowpass(noise(n), sweep)*np.linspace(0.05, 1, n)**2
    trem = 0.6 + 0.4*np.sign(np.sin(2*np.pi*np.cumsum(np.linspace(4, 28, n))/SR))   # accelerating stutter
    tone = np.sin(2*np.pi*np.cumsum(np.geomspace(55, 330, n))/SR)*np.linspace(0, 0.5, n)
    y = (y/(np.abs(y).max()+1e-9)*trem + tone) * env(n, 0.5, dur-0.6, 1.0, 0.05)
    return y*0.6

def impact():
    n = int(1.6*SR); t = np.arange(n)/SR
    boom = np.sin(2*np.pi*(62*np.exp(-t*2.6)+36)*t)*np.exp(-t*2.6)
    crack = lowpass(noise(n), 3200)*np.exp(-t*22)*0.7
    ring = np.sin(2*np.pi*(196*np.exp(-t*0.6))*t)*np.exp(-t*4)*0.25
    y = tail(boom*0.9 + crack + ring, 0.17, 0.5, 0.45, 0.9)
    return y/(np.abs(y).max()+1e-9)*0.95

def blip():
    n = int(0.12*SR); t = np.arange(n)/SR
    return np.sin(2*np.pi*660*t)*env(n, 0.002, 0.08, 0, 0.03)*0.5

track = np.zeros(int(total*SR))
def put(sound, at, gain=1.0):
    i = int(at*SR); j = min(len(track), i+len(sound))
    if i < 0 or i >= len(track): return
    track[i:j] += sound[:j-i]*gain

# scene cuts: whoosh on every cut, up-sweep into the energetic ones
for i, s in enumerate(tl["scenes"][1:]):
    put(whoosh(0.5, up=True, flavour=i % 3), s["start"]-0.14)
# hook riser into the dive, impact when the pin lands
put(riser(3.8), scene["s1"]-3.6)
put(whoosh(0.45, up=True, flavour=1), scene["s1"]+1.55, 0.9)
put(whoosh(0.45, up=True, flavour=2), scene["s1"]+2.85, 0.9)
put(impact(), scene["s1"]+3.7)
# UI clicks
put(click(), scene["s4"]+1.35)
put(click(), scene["s5"]+5.8)
put(click(), scene["s9"]+2.0)
# typing in the form and the chat
def typing(start, end, cps=14):
    t = start
    while t < end:
        put(key(), t, 0.22); t += rng.uniform(0.6, 1.4)/cps
typing(scene["s5"]+0.3, scene["s5"]+1.4)
typing(scene["s5"]+1.4, scene["s5"]+3.4, 18)
typing(scene["s5"]+3.4, scene["s5"]+5.6, 22)
typing(scene["s6"]+7.8, scene["s6"]+11.2, 24)
# file drop in s6, log lines ticking in s7, chime on pricing submitted
put(whoosh(0.3, up=False, flavour=0), scene["s6"]+0.9, 0.6)
for d in [0.75, 0.9, 1.05]:
    put(tick(), scene["s6"]+d, 0.5)
for d in [0.3, 1.6, 2.2, 2.9, 3.6, 4.5, 5.3]:
    put(tick(), scene["s7"]+d, 0.6)
put(chime(), scene["s7"]+6.3)
# price edit blip and the counter in s9
put(blip(), scene["s8"]+5.2)
for i in range(10):
    put(tick(), scene["s9"]+2.4+i*0.12, 0.7)
put(chime(), scene["s9"]+3.7, 0.7)
# outro sting
put(chime(), scene["s10"]+0.3, 0.8)
sf.write(os.path.join(build, "sfx.wav"), np.clip(track, -1, 1), SR)

# ---------------- music bed: 112 bpm, A minor, pulse + pad, ends with the video
bpm = 112; beat = 60/bpm
n = len(track); t = np.arange(n)/SR
music = np.zeros(n)
# kick-like pulse on every beat
kick_n = int(0.35*SR); kt = np.arange(kick_n)/SR
kick = np.sin(2*np.pi*(55*np.exp(-kt*12)+45)*kt)*np.exp(-kt*9)
# soft hat on off-beats
hat_n = int(0.05*SR); hat = lowpass(noise(hat_n), 9000)*np.exp(-np.arange(hat_n)/SR*90)*0.12
b = 0.0
while b < total:
    put_i = int(b*SR); j = min(n, put_i+kick_n); music[put_i:j] += kick[:j-put_i]*0.9
    off = int((b+beat/2)*SR); k = min(n, off+hat_n)
    if off < n: music[off:k] += hat[:k-off]
    b += beat
# pad: chord changes every 4 bars between Am, F, C, G (roots 110, 87.3, 130.8, 98)
bar = beat*4
chords = [[110, 130.8, 164.8], [87.3, 110, 130.8], [130.8, 164.8, 196], [98, 123.5, 146.8]]
pad = np.zeros(n)
for c in range(int(np.ceil(total/(bar*4)))):
    i0 = int(c*bar*4*SR); i1 = min(n, int((c+1)*bar*4*SR)); seg = np.arange(i1-i0)/SR
    for f in chords[c % 4]:
        pad[i0:i1] += (np.sin(2*np.pi*f*seg) + 0.5*np.sin(2*np.pi*f*1.003*seg) + 0.25*np.sin(2*np.pi*f*2*seg))*0.08
# gentle tremolo and lowpass on the pad
pad = lowpass(pad, 900) * (0.8 + 0.2*np.sin(2*np.pi*0.9*t))
music = music*0.6 + pad
# fades: in over 1.5 s, out over the last 2.5 s, and a lift at the reveal
music *= env(n, 1.5, 0.1, 1.0, 2.5)
music = music/(np.abs(music).max()+1e-9)*0.9
sf.write(os.path.join(build, "music.wav"), music, SR)
print("sfx and music written:", round(total, 1), "s")
