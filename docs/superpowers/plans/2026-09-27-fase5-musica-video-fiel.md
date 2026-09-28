# Fase 5 — Camas musicales + video fiel por pieza Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Generar 3 camas musicales ambientales por síntesis y activarlas en el selector de música. (2) Que el botón 🎬 de cada pieza de Biblioteca genere video con el AUDIO PROPIO de la pieza (no clips TTS) usando el motor canvas 2D existente.

**Architecture:** Música: script Python reproducible (`tools/build-music-beds.py`, numpy) → WAV 44.1 kHz estéreo 60 s en loop perfecto → `ffmpeg loudnorm` −20 LUFS → MP3 160k en `assets/music/` + entradas en `assets/music/index.json` (el flujo Fase 4 las activa sin cambios de código). Video fiel: `preparePieceVideoMedia(entry)` construye `{samples, timeline, totalDuration}` desde el audio propio (fetch + decode + resample a mono 44100) con timeline proporcional a las líneas (peso = longitud+1; sin pausa de repetición: repeatStart=repeatEnd=end); el maker gana modo pieza (`sequenceState.videoPiece` + media cacheada) que alimenta preview y exportación con los controles de calidad existentes; 🎬 abre ese modo (ya NO añade chunks a la secuencia).

**Tech Stack:** Python + numpy (síntesis), ffmpeg (loudnorm + MP3), Web Audio decode, canvas 2D engine (reutilizado), WebCodecs/MediaRecorder (reutilizados).

---

## Contexto que debes conocer antes de tocar nada

| Hecho | Dónde |
|---|---|
| `decodeMusicTrack(musicId, targetRate)` (fetch+decode+resample+cache, null si falla) | `index.html`, de Fase 4 |
| `mixSequenceMusic(voice, music, rate)` | `index.html`, de Fase 4 |
| `sequenceState.musicId/musicTracks`, `renderSequenceMusicOptions` | `index.html`, de Fase 4 |
| `drawSequenceVideoFrame(canvas, media, time, themeName)` (puro en t; escala lógica 720×1280) | `index.html`, de Fase 3 |
| `SEQUENCE_VIDEO_THEMES` + `VIDEO_TRANSITION_SECONDS` | `index.html`, de Fase 3 |
| `renderSequenceVideoPreview` (usa `sequenceVideoPreviewData` de items) | `index.html`, de Fase 3 |
| `openSequenceVideoMaker` (guarda items vacíos/exportando) | `index.html`, de Fase 3 |
| `encodeSequenceMp4WebCodecs/Recorder(media)` (solo necesitan `media`) | `index.html`, de Fase 3 |
| `exportSequenceMp4` (resize canvas + selects + finally) | `index.html`, de Fase 3 |
| Botón 🎬 actual: `addCreativeChunksToSequence(lines)` + `openSequenceVideoMaker()` | `renderCreative`, de Fase 3 |
| Botón ⬇ MP3 actual: `<a download>` al audio propio | `renderCreative`, de Fase 3 |
| Test: 113 checks, `TODO OK (0 fallos)` | `tools/check-ui.mjs` |

### Invariantes

1. No tocar `exportSequenceMp3`, validación 9/2250, `podcast-series.json`, ni nada de Fases 1-4 que funciona.
2. El modo pieza NUNCA muta `sequenceState.items` (la secuencia del usuario queda intacta).
3. Sin audio decodificable → aviso + no abrir el maker (nunca exportar vacío).
4. No regresiones: `TODO OK` al final; respaldo antes de editar.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `index.pre-fase5.html` | Respaldo | Crear |
| `tools/build-music-beds.py` | Generador reproducible de camas | Crear |
| `assets/music/amanecer.mp3`, `noche.mp3`, `pulso.mp3` | Camas (60 s, loop, −20 LUFS) | Crear |
| `assets/music/index.json` | 3 entradas {id,title,file} | Modificar |
| `tools/check-ui.mjs` | Sección 10 (Fase 5) | Modificar |
| `index.html` | Modo pieza en maker + 🎬 fiel | Modificar |
| `index.post-fase5.html` | Snapshot | Crear |
| `README.txt` | Registro Fase 5 | Modificar |

---

## Task 1: Camas musicales (síntesis + índice + test)

**Files:**
- Create: `tools/build-music-beds.py`, 3 MP3, (modificar `assets/music/index.json`)
- Modify: `tools/check-ui.mjs` (sección 10)

- [ ] **Step 1: Generador `tools/build-music-beds.py`**

```python
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
```

> Notas: `root_sub + chord[0] % 12 - chord[0] % 12` = `root_sub` (el sub sigue la tónica grave fija; simplificación intencional y estable). El loop es perfecto por construcción (crossfade final→inicio). Ejecutar con `python tools/build-music-beds.py` (requiere `numpy` + `ffmpeg`).

- [ ] **Step 2: Ejecutar y verificar**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
python tools\build-music-beds.py
foreach ($f in @("amanecer","noche","pulso")) {
  $p = "assets\music\$f.mp3"
  $d = & ffprobe -v error -show_entries format=duration,bit_rate -of default=noprint_wrappers=1 $p 2>$null
  "$f => " + ($d -join " ")
}
```

Expected: 3 MP3, `duration` ≈ 60 s cada uno, `bit_rate=160000`.

- [ ] **Step 3: Sección 10 en check-ui.mjs** (antes del console.log final)

```js
// ---- 10. Fase 5: camas + video fiel ----
const musicIndex = parseJson(readSafe("assets/music/index.json"));
ok("music/index: >= 3 pistas", Array.isArray(musicIndex) && musicIndex.length >= 3,
  `entries=${Array.isArray(musicIndex) ? musicIndex.length : "JSON invalido"}`);
if (Array.isArray(musicIndex)) {
  const missingMusic = musicIndex.map((t) => t.file).filter((f) => typeof f !== "string" || !existsSync(resolve(ROOT, f)));
  ok("music/index: audios presentes", missingMusic.length === 0, "faltan: " + missingMusic.join(", "));
  ok("music/index: esquema {id,title,file}", musicIndex.every((t) => t && typeof t.id === "string" && typeof t.title === "string" && typeof t.file === "string"), "esquema inválido");
}
if (html) {
  ok("video fiel: prepara media desde la pieza", html.includes("function preparePieceVideoMedia"),
    "sin preparePieceVideoMedia");
  ok("video fiel: modo pieza en el maker", html.includes("sequenceState.videoPiece"),
    "sin videoPiece");
  ok("video fiel: 🎬 abre el modo pieza", html.includes("openSequenceVideoMaker(current)"),
    "sin apertura por pieza");
}
```

- [ ] **Step 4: ROJO parcial** — los checks de música deben ponerse VERDES tras Step 2; los 3 de video fiel siguen FAIL hasta T2. `node tools\check-ui.mjs`.

---

## Task 2: Video fiel por pieza

**Files:**
- Modify: `index.html` (preparePieceVideoMedia + modo pieza + 🎬 fiel + CSS mínimo)

- [ ] **Step 1: `preparePieceVideoMedia(entry)`** (junto a `prepareSequenceVideoMedia`; localizar por nombre)

```js
    async function preparePieceVideoMedia(entry) {
      const targetRate = 44100;
      const response = await fetch(entry.audio);
      if (!response.ok) throw new Error("audio-no-disponible");
      const bytes = await response.arrayBuffer();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext || window.OfflineAudioContext;
      if (!AudioContextClass) throw new Error("audio-context-unavailable");
      let context = null;
      let mono = null;
      try {
        context = new AudioContextClass();
        const decoded = await context.decodeAudioData(bytes.slice(0));
        const channel = decoded.getChannelData(0);
        const ratio = decoded.sampleRate / targetRate;
        const outLength = Math.max(1, Math.floor(channel.length / ratio));
        mono = new Float32Array(outLength);
        for (let index = 0; index < outLength; index += 1) {
          const position = index * ratio;
          const left = Math.floor(position);
          const frac = position - left;
          mono[index] = channel[left] * (1 - frac) + (channel[Math.min(channel.length - 1, left + 1)] || 0) * frac;
        }
      } finally {
        if (context && context.close) { try { await context.close(); } catch (error) {} }
      }
      const lines = Array.isArray(entry.lines) ? entry.lines : [];
      const weights = lines.map(function(line) { return String(line.en || line.text || "").length + 1; });
      const totalWeight = weights.reduce(function(sum, weight) { return sum + weight; }, 0) || 1;
      const contentDuration = mono.length / targetRate;
      const timeline = [];
      let cursor = SEQUENCE_VIDEO_INTRO_SECONDS;
      lines.forEach(function(line, index) {
        const duration = Math.max(.8, contentDuration * (weights[index] / totalWeight));
        const start = cursor;
        const end = cursor + duration;
        timeline.push({ start: start, audioEnd: end, repeatStart: end, repeatEnd: end, end: end,
          text: line.en || line.text || "", translation: line.es || "", index: index });
        cursor = end;
      });
      const pieces = [new Int16Array(Math.round(targetRate * SEQUENCE_VIDEO_INTRO_SECONDS))];
      const voice = new Int16Array(mono.length);
      for (let index = 0; index < mono.length; index += 1) {
        voice[index] = Math.round(Math.max(-1, Math.min(1, mono[index])) * 32767);
      }
      pieces.push(voice);
      pieces.push(new Int16Array(Math.round(targetRate * SEQUENCE_VIDEO_OUTRO_SECONDS)));
      const totalSamples = pieces.reduce(function(sum, piece) { return sum + piece.length; }, 0);
      const joined = new Int16Array(totalSamples);
      let offset = 0;
      pieces.forEach(function(piece) { joined.set(piece, offset); offset += piece.length; });
      return {
        samples: joined,
        timeline: timeline,
        introDuration: SEQUENCE_VIDEO_INTRO_SECONDS,
        outroDuration: SEQUENCE_VIDEO_OUTRO_SECONDS,
        totalDuration: joined.length / targetRate,
        sampleRate: targetRate
      };
    }
```

> Nota: `audioEnd = repeatStart = repeatEnd = end` → sin pausa "AHORA TÚ" (video continuo karaoke). Las líneas se reparten proporcionalmente; el audio manda en duración total.

- [ ] **Step 2: Modo pieza en el maker**

En `sequenceState` (junto a videoRes/videoBitrate/videoFps): añadir `videoPiece: null`.

En `openSequenceVideoMaker`: cambiar la firma a `openSequenceVideoMaker(piece)` y al inicio:

```js
    async function openSequenceVideoMaker(piece) {
      if (sequenceState.exporting) return;
      sequenceState.videoPiece = piece && piece.audio ? piece : null;
      if (sequenceState.videoPiece) {
        setSequenceVideoStatus("Preparando «" + sequenceState.videoPiece.title + "»…", false);
        sequenceVideoMaker.hidden = false;
        try {
          sequenceState.videoPieceMedia = await preparePieceVideoMedia(sequenceState.videoPiece);
        } catch (error) {
          sequenceVideoMaker.hidden = true;
          sequenceState.videoPiece = null;
          sequenceState.videoPieceMedia = null;
          setSequenceVideoStatus("No se pudo preparar el audio de la pieza.", true);
          showToast("No se pudo preparar el audio de la pieza.");
          return;
        }
        setSequenceVideoStatus("Video de «" + sequenceState.videoPiece.title + "» con su audio original.", false);
        renderSequenceVideoPreview();
        sequenceVideoMaker.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
        return;
      }
      if (!sequenceState.items.length) return;
      stopSequencePreview();
      sequenceVideoMaker.hidden = false;
      ... (resto actual intacto)
```

En `renderSequenceVideoPreview`: al inicio, rama pieza:

```js
    function renderSequenceVideoPreview() {
      if (sequenceState.videoPiece && sequenceState.videoPieceMedia) {
        const media = sequenceState.videoPieceMedia;
        const first = media.timeline[0] || { start: 0 };
        const previewTime = media.introDuration + .48;
        drawSequenceVideoFrame(sequenceVideoCanvas, media, previewTime, sequenceState.videoTheme);
        sequenceVideoCanvas.setAttribute("aria-label", "Vista previa: " + sequenceState.videoPiece.title);
        return;
      }
      ... (resto actual intacto)
```

En `closeSequenceVideoMaker` (localizar; hoy hace `sequenceVideoMaker.hidden = true; sequenceVideoBtn.focus();` si no exporta): añadir limpieza:

```js
      sequenceState.videoPiece = null;
      sequenceState.videoPieceMedia = null;
```

En `exportSequenceMp4`: la media debe venir de la pieza si hay modo pieza. Localizar `const media = await prepareSequenceVideoMedia();` y reemplazar por:

```js
      const media = sequenceState.videoPiece && sequenceState.videoPieceMedia
        ? sequenceState.videoPieceMedia
        : await prepareSequenceVideoMedia();
```

- [ ] **Step 3: 🎬 fiel en Biblioteca** (en `renderCreative`, reemplazar el listener actual)

Reemplazar:

```js
      document.getElementById("creativeMp4Btn").addEventListener("click", function() {
        addCreativeChunksToSequence(lines);
        if (sequenceState.items.length) openSequenceVideoMaker();
      });
```

por:

```js
      document.getElementById("creativeMp4Btn").addEventListener("click", function() {
        openSequenceVideoMaker(current);
      });
```

> `current` es la pieza visible; `openSequenceVideoMaker(entry)` con entry sin audio → `videoPiece = null` → cae al flujo de secuencia actual (comportamiento anterior preservado para piezas sin audio).

---

## Task 3: Test verde, snapshot y cierre

- [ ] **Step 1: Test**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
```

Expected: `TODO OK (0 fallos)`, exit 0 (~122 checks).

- [ ] **Step 2: Sintaxis inline** (`node --check` como en Fases 3/4).

- [ ] **Step 3: Snapshot + README**

```powershell
Copy-Item "$root\index.html" "$root\index.post-fase5.html"
```

README: sección "Camas musicales + video fiel (Fase 5)" + respaldos.

---

## Self-review (ejecutado al escribir el plan)

- **Música**: 3 camas 60 s loop + −20 LUFS + índice → el flujo Fase 4 las activa sin código nuevo (selector las lista; MP3/MP4 las mezclan con ducking).
- **Video fiel**: audio propio decodificado (no clips), timeline proporcional, sin pausa de repetición, motor 2D + controles de calidad reutilizados, secuencia del usuario intacta (videoPiece separado), fallback con aviso.
- **Placeholders**: ninguno.
- **Consistencia**: `videoPiece/videoPieceMedia`, `preparePieceVideoMedia`, `openSequenceVideoMaker(current)` se usan igual en maker, preview, export y test.
