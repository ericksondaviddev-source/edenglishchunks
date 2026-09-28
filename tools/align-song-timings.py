"""Alineacion de timings de canciones (Fase 6, Tarea 3b).

Para cada MP3 de assets/songs:
  - carga su transcript de palabras assets/songs/.align/<base>.words.json
  - carga las lineas `en` del indice de su .letra.md (mismo parser que build-songs-index.mjs)
  - puntuacion por linea/posicion: subsecuencia difusa (exacta o similar foneticamente)
    sobre ventana deslizante; camino monotono optimo por programacion dinamica
    (tolera versos ausentes o reordenados en versiones alternativas)
  - lineas con score < UMBRAL -> interpolacion entre vecinas emparejadas
  - post-proceso y escribe <base>.timing.json ([{start,end}] x lineas del indice)

Uso: python tools/align-song-timings.py
Solo stdlib (json, os, re, subprocess, difflib).
"""
import difflib
import json
import math
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONGS = os.path.join(ROOT, "assets", "songs")
ALIGN = os.path.join(SONGS, ".align")

# Mismo mapeo que tools/build-songs-index.mjs (slug, version, archivo)
FILES = [
    ("sunrise-city", "Version original", "Sunrise City Chunks.mp3"),
    ("sunrise-city", "Version 2", "Sunrise City Chunks 2.mp3"),
    ("sunrise-city", "Tropical House", "6. Sunrise City - Tropical House.mp3"),
    ("market-day", "Version original", "Market Day Chunks.mp3"),
    ("market-day", "Version 2", "Market Day Chunks 2.mp3"),
    ("market-day", "Folk Pop", "5. Market Day - Folk Pop.mp3"),
    ("golden-hour-drive", "Version original", "Golden Hour Chunks.mp3"),
    ("golden-hour-drive", "Version 2", "Golden Hour Chunks 2.mp3"),
    ("golden-hour-drive", "Synthwave", "4. Golden Hour - Synthwave.mp3"),
    ("common-ground", "R&B Soul", "3. Evening Chunks - R&B Soul.mp3"),
    ("common-ground", "Danceable", "Evening Chunks Danceable.mp3"),
    ("common-ground", "Danceable 2", "Evening Chunks Danceable 2.mp3"),
    ("talk-fast", "Nu-Disco", "7. Connected Speech - Nu-Disco.mp3"),
    ("talk-fast", "Version original", "Connected Speech Chunks.mp3"),
    ("talk-fast", "Version 2", "Connected Speech Chunks 2.mp3"),
    ("work-it-out", "Version original", "Progress Chunks.mp3"),
    ("work-it-out", "Version 2", "Progress Chunks 2.mp3"),
    ("big-picture", "Bossa Nova", "1. Startup Chunks - Bossa Nova.mp3"),
    ("big-picture", "Latin Pop", "2. Startup Bilingual - Latin Pop.mp3"),
    ("big-picture", "Balada", "Startup Chunks Ballad.mp3"),
    ("big-picture", "Balada 2", "Startup Chunks Ballad 2.mp3"),
]

LINE_RE = re.compile(r"^- \[(.+?)\] (.+?) \u2014 (.+?) \u2190 (C|F)\s*$", re.MULTILINE)
THRESHOLD = 0.4
SLACK = 12  # palabras extra del transcript toleradas dentro de la ventana

_sim_cache = {}


def similar(a, b):
    """True si los tokens son iguales o lo bastante parecidos (whisper en voz cantada)."""
    if a == b:
        return True
    if NUMWORDS.get(a) == b or NUMWORDS_REV.get(a) == b:
        return True
    key = (a, b) if a < b else (b, a)
    hit = _sim_cache.get(key)
    if hit is None:
        if len(a) < 4 or len(b) < 4:
            hit = False
        else:
            hit = difflib.SequenceMatcher(None, a, b).ratio() >= 0.8
        _sim_cache[key] = hit
    return hit


# Reducciones del habla (letra) -> forma plena (whisper). Se aplica a AMBOS
# lados para que la comparacion sea simetrica.
EXPAND = {
    "gimme": ["give", "me"],
    "lemme": ["let", "me"],
    "gotta": ["got", "to"],
    "gonna": ["going", "to"],
    "wanna": ["want", "to"],
    "hafta": ["have", "to"],
    "kinda": ["kind", "of"],
    "sorta": ["sort", "of"],
    "outta": ["out", "of"],
    "lotsa": ["lots", "of"],
    "innit": ["is", "not", "it"],
    "dontcha": ["don't", "you"],
    "whatcha": ["what", "you"],
    "gotcha": ["got", "you"],
    "cmon": ["come", "on"],
    "imma": ["i'm", "gonna"],
    "needa": ["need", "to"],
    "ya": ["you"],
    "i'm": ["i", "am"],
    "i'll": ["i", "will"],
    "i've": ["i", "have"],
    "i'd": ["i", "would"],
    "we'll": ["we", "will"],
    "we've": ["we", "have"],
    "you're": ["you", "are"],
    "you've": ["you", "have"],
    "you'll": ["you", "will"],
}

# equivalencia numero <-> digito (whisper escribe "6", la letra dice "Six")
NUMWORDS = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "ten": "10",
}
NUMWORDS_REV = {v: k for k, v in NUMWORDS.items()}


def _expand_tok(tok, depth=0):
    sub = EXPAND.get(tok)
    if sub is None or depth > 2:
        return [tok]
    out = []
    for t in sub:
        out.extend(_expand_tok(t, depth + 1))
    return out


def norm_words(text):
    toks = []
    for tok in re.sub(r"[^a-z0-9' ]", " ", text.lower()).split():
        toks.extend(_expand_tok(tok))
    return toks


def parse_letra(slug):
    with open(os.path.join(SONGS, slug + ".letra.md"), encoding="utf-8") as f:
        raw = f.read()
    start = raw.index("## \u00cdndice")
    lines = [m.group(2).strip() for m in LINE_RE.finditer(raw[start:])]
    if not lines:
        raise ValueError("Indice vacio: " + slug)
    return lines


def duration_of(path, fallback):
    try:
        res = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", path],
            capture_output=True, text=True, timeout=60)
        value = float((res.stdout or "").strip())
        if value > 0:
            return value
    except Exception:
        pass
    return fallback


def match_from(flat, s, ltoks):
    """Puntuacion de ltoks en flat[s:s+len+SLACK].

    max(subsecuencia ordenada, 0.9 * cobertura bolsa-de-palabras): la primera
    palabra cantada suele salir garbada en whisper y bloquearia la subsecuencia.
    -> (score, first_wi, last_wi) para el span ordenado.
    """
    window = flat[s:s + len(ltoks) + SLACK]
    li = 0
    count = 0
    first = last = -1
    for tok, wi in window:
        if li < len(ltoks) and similar(tok, ltoks[li]):
            if first < 0:
                first = wi
            last = wi
            count += 1
            li += 1
    ordered = count / len(ltoks)
    used = [False] * len(window)
    bag = 0
    for lt in ltoks:
        for k, (tok, _wi) in enumerate(window):
            if not used[k] and similar(tok, lt):
                used[k] = True
                bag += 1
                break
    score = max(ordered, 0.9 * bag / len(ltoks))
    return score, first, last


def align_file(audio_fname, slug):
    base = os.path.splitext(audio_fname)[0]
    with open(os.path.join(ALIGN, base + ".words.json"), encoding="utf-8") as f:
        words = json.load(f)
    lyric_lines = parse_letra(slug)
    flat = []  # (token, word_idx)
    for i, w in enumerate(words):
        for tok in norm_words(w.get("word", "")):
            flat.append((tok, i))
    n = len(flat)
    lnorm = [norm_words(line) for line in lyric_lines]
    nlines = len(lyric_lines)

    # matriz de puntuacion: score[i][s], span[i][s]
    score = []
    span = []
    for ltoks in lnorm:
        if not ltoks or n == 0:
            score.append([0.0] * max(n, 1))
            span.append([(0, 0)] * max(n, 1))
            continue
        srow, prow = [], []
        for s in range(n):
            sc, first, last = match_from(flat, s, ltoks)
            srow.append(sc)
            prow.append((first if first >= 0 else 0, last if last >= 0 else 0))
        score.append(srow)
        span.append(prow)

    # programacion dinamica: camino monotono (s no-decreciente) de maximo score
    # dp_prev[s] = mejor total hasta la linea anterior terminando en <= s (prefijo max)
    # con desempate hacia s mayores para repartir estribillos repetidos
    back = []  # back[i][s] = s' elegido de la linea i-1
    prev = [-1.0] * n
    if nlines > 0 and n > 0:
        prev = list(score[0])
        back.append([-1] * n)
        for i in range(1, nlines):
            # prefijo max de prev con desempate a indice mayor
            best_val = [-1.0] * n
            best_idx = [0] * n
            bv = -1.0
            bi = 0
            for s in range(n):
                if prev[s] > bv:
                    bv = prev[s]
                    bi = s
                best_val[s] = bv
                best_idx[s] = bi
            cur = [0.0] * n
            bcur = [0] * n
            si = score[i]
            for s in range(n):
                cur[s] = si[s] + best_val[s]
                bcur[s] = best_idx[s]
            prev = cur
            back.append(bcur)
    # retroceso: mejor s final (desempate a mayor s)
    path = [0] * nlines
    if n > 0:
        s_best = max(range(n), key=lambda s: (prev[s], s))
        path[nlines - 1] = s_best
        for i in range(nlines - 1, 0, -1):
            path[i - 1] = back[i][path[i]]

    spans = []
    matched = 0
    for i in range(nlines):
        sc = score[i][path[i]] if n > 0 else 0.0
        if sc >= THRESHOLD and lnorm[i]:
            first, last = span[i][path[i]]
            spans.append((first, last))
            matched += 1
        else:
            spans.append(None)

    starts = [None] * nlines
    ends = [None] * nlines
    for i, sp in enumerate(spans):
        if sp is not None:
            starts[i] = float(words[sp[0]]["start"])
            ends[i] = float(words[sp[1]]["end"])

    last_end = float(words[-1]["end"]) if words else 0.0
    dur = duration_of(os.path.join(SONGS, audio_fname), last_end + 2.0)

    idx_matched = [i for i, sp in enumerate(spans) if sp is not None]
    if not idx_matched:
        step = dur / nlines
        for i in range(nlines):
            starts[i] = round(i * step, 2)
            ends[i] = round((i + 1) * step, 2)
    else:
        first_m = idx_matched[0]
        for i in range(first_m):
            frac0 = i / first_m
            frac1 = (i + 1) / first_m
            starts[i] = round(frac0 * starts[first_m], 2)
            ends[i] = round(frac1 * starts[first_m], 2)
        last_m = idx_matched[-1]
        tail = nlines - 1 - last_m
        for k in range(1, tail + 1):
            i = last_m + k
            starts[i] = round(ends[last_m] + (k - 1) * (dur - ends[last_m]) / tail, 2)
            ends[i] = round(ends[last_m] + k * (dur - ends[last_m]) / tail, 2)
        for a, b in zip(idx_matched, idx_matched[1:]):
            gap_n = b - a - 1
            if gap_n <= 0:
                continue
            gap0, gap1 = ends[a], starts[b]
            if gap1 < gap0:
                gap1 = gap0
            for k in range(1, gap_n + 1):
                i = a + k
                starts[i] = round(gap0 + (k - 1) * (gap1 - gap0) / gap_n, 2)
                ends[i] = round(gap0 + k * (gap1 - gap0) / gap_n, 2)

    # post-proceso (dur_full = duracion real; dur = truncada: el redondeo no debe salirse)
    dur_full = dur
    dur = math.floor(dur * 100) / 100
    out = []
    for i in range(nlines):
        s = max(0.0, min(float(starts[i]), dur))
        e = max(0.0, min(float(ends[i]), dur))
        out.append([s, e])
    for i in range(1, nlines):
        if out[i][0] < out[i - 1][0]:
            out[i][0] = out[i - 1][0]
    for i in range(nlines - 1):
        if out[i][1] > out[i + 1][0]:
            out[i][1] = out[i + 1][0]
    for i in range(nlines):
        s, e = out[i]
        if e <= s:
            e = min(s + 1.0, dur)
            if e <= s:
                s = max(0.0, dur - 1.0)
                e = dur
            out[i] = [s, e]
    # re-aplicar: el repair puede reabrir overlaps
    for i in range(nlines - 1):
        if out[i][1] > out[i + 1][0]:
            out[i][1] = out[i + 1][0]
    timings = []
    for s, e in out:
        s2 = round(min(max(0.0, s), dur_full), 2)
        e2 = round(min(max(0.0, e), dur_full), 2)
        if e2 <= s2:
            e2 = round(min(s2 + 0.05, dur_full), 2)
            if e2 <= s2:
                s2 = round(max(0.0, dur_full - 0.05), 2)
        timings.append({"start": s2, "end": e2})

    with open(os.path.join(SONGS, base + ".timing.json"), "w", encoding="utf-8") as f:
        json.dump(timings, f, ensure_ascii=False, indent=1)
        f.write("\n")

    ratio = matched / nlines
    print("%s: lineas=%d matched=%d ratio=%d%% dur=%.1fs -> %s.timing.json"
          % (audio_fname, nlines, matched, round(ratio * 100), dur, base), flush=True)
    return ratio


def main():
    ratios = []
    for slug, _version, fname in FILES:
        ratios.append(align_file(fname, slug))
    mean = sum(ratios) / len(ratios) if ratios else 0.0
    print("MEDIA matched=%d%% sobre %d archivos" % (round(mean * 100), len(ratios)), flush=True)


if __name__ == "__main__":
    main()
