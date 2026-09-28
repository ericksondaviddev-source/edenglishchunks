import numpy as np, subprocess, json, os

SR = 44100
SECS = 60
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "music")

def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def pad_chord(freqs, dur, gain=0.2, attack=3.0, release=3.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / release)
    env = env * env * (3 - 2 * env)
    sig = np.zeros(n)
    for f in freqs:
        for det in (-0.03, 0.0, 0.03):
            ff = f * 2 ** (det / 100)
            sig += np.sin(2 * np.pi * ff * t) + 0.3 * np.sin(2 * np.pi * 3 * ff * t)
    sig /= max(1, len(freqs) * 3)
    return (gain * env * sig).astype(np.float64)

def bed(prog, root_sub=36, gain=0.22, shimmer=True, pulse=None, bpm=0):
    total = np.zeros(int(SR * SECS))
    chord_dur = SECS / len(prog)
    for i, chord in enumerate(prog):
        seg = pad_chord([midi(m) for m in chord], chord_dur, gain=gain)
        total[i * len(seg):(i + 1) * len(seg)] += seg
        sub = 0.25 * gain * np.sin(2 * np.pi * midi(root_sub + chord[0] % 12 - chord[0] % 12) * np.arange(len(seg)) / SR)
        total[i * len(seg):(i + 1) * len(seg)] += sub
        if shimmer:
            t = np.arange(len(seg)) / SR
            shim = 0.05 * gain * np.sin(2 * np.pi * midi(chord[-1] + 24) * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t))
            total[i * len(seg):(i + 1) * len(seg)] += shim
    if pulse:
        beat = 60.0 / bpm
        tt = 0.0
        k = 0
        while tt < SECS:
            chord = prog[(k // 2) % len(prog)]
            f = midi(chord[k % len(chord)] + 12)
            d = int(SR * 0.35)
            s = int(tt * SR)
            if s + d < len(total):
                te = np.arange(d) / SR
                pluck = pulse * np.sin(2 * np.pi * f * te) * np.exp(-te * 9)
                total[s:s + d] += pluck
            tt += beat / 2
            k += 1
    # loop perfecto: crossfade de 4 s del final sobre el inicio
    fade = int(SR * 4)
    ramp = 0.5 - 0.5 * np.cos(np.pi * np.arange(fade) / fade)
    total[:fade] = total[:fade] * (1 - ramp) + total[-fade:] * ramp
    total = total[:-fade] if False else total
    peak = np.max(np.abs(total))
    if peak > 0.85:
        total *= 0.85 / peak
    stereo = np.stack([total, total * 0.96], axis=1)
    return stereo

BEDS = {
    "amanecer": dict(prog=[[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], gain=0.24, shimmer=True, pulse=None, bpm=0),
    "noche": dict(prog=[[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]], gain=0.20, shimmer=False, pulse=None, bpm=0),
    "pulso": dict(prog=[[60, 64, 67], [60, 64, 67], [57, 60, 64], [59, 62, 65]], gain=0.18, shimmer=True, pulse=0.10, bpm=96),
}

os.makedirs(OUT, exist_ok=True)
index = []
for name, kw in BEDS.items():
    stereo = bed(**kw)
    wav = os.path.join(OUT, name + ".wav")
    import wave
    frames = (np.clip(stereo, -1, 1) * 32767).astype(np.int16)
    with wave.open(wav, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(frames.tobytes())
    mp3 = os.path.join(OUT, name + ".mp3")
    subprocess.run(["ffmpeg", "-y", "-i", wav, "-af", "loudnorm=I=-20:TP=-1.5:LRA=11",
                    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "160k", mp3], check=True)
    os.remove(wav)
    index.append({"id": name, "title": {"amanecer": "Amanecer · pads cálidos",
                                        "noche": "Noche · calma profunda",
                                        "pulso": "Pulso · pulso suave"}[name],
                  "file": "assets/music/" + name + ".mp3"})
with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, indent=2)
    f.write("\n")
print("camas:", [e["id"] for e in index])
