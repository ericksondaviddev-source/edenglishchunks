"""Transcribe all song MP3s with word timestamps (background job for Fase 6 T3).
Outputs assets/songs/.align/<base>.words.json = [{word, start, end}].
Progress: prints per-file lines (redirect to log) + writes .align/_done.txt at end.
"""
import json
import os
import sys
import traceback

from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONGS = os.path.join(ROOT, "assets", "songs")
ALIGN = os.path.join(SONGS, ".align")

os.makedirs(ALIGN, exist_ok=True)

files = sorted(
    f for f in os.listdir(SONGS)
    if f.lower().endswith((".mp3", ".wav")) and os.path.isfile(os.path.join(SONGS, f))
)
print(f"archivos: {len(files)}", flush=True)

model = WhisperModel("base", device="cpu", compute_type="int8")
print("modelo base cargado", flush=True)

done = 0
for fname in files:
    base = os.path.splitext(fname)[0]
    out = os.path.join(ALIGN, base + ".words.json")
    if os.path.exists(out):
        print(f"SKIP {fname} (ya existe)", flush=True)
        done += 1
        continue
    try:
        segments, _info = model.transcribe(
            os.path.join(SONGS, fname), language="en", word_timestamps=True
        )
        words = []
        for seg in segments:
            for w in (seg.words or []):
                words.append({"word": w.word, "start": round(w.start, 2), "end": round(w.end, 2)})
        with open(out, "w", encoding="utf-8") as f:
            json.dump(words, f, ensure_ascii=False)
        done += 1
        print(f"OK {fname}: {len(words)} palabras ({done}/{len(files)})", flush=True)
    except Exception:
        print(f"ERROR {fname}", flush=True)
        traceback.print_exc()

with open(os.path.join(ALIGN, "_done.txt"), "w", encoding="utf-8") as f:
    f.write(f"done={done}/{len(files)}\n")
print(f"TERMINADO done={done}/{len(files)}", flush=True)
