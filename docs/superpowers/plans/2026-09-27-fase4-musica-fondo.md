# Fase 4 — Música de fondo en exportaciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir cama musical opcional a las exportaciones MP3 y MP4 de Secuencias (pista bucleada con fades + ducking bajo la voz), con fallback a "sin música" que nunca bloquea la exportación.

**Architecture:** Un selector en la toolbar de Secuencias (`Sin música` + pistas de `assets/music/index.json`, cargado opcionalmente en `loadData`). Dos helpers compartidos: `decodeMusicTrack(id)` (descarga + `decodeAudioData` a mono 44100) y `mixSequenceMusic(voiceFloat, musicFloat, sampleRate)` (bucle + fade-in 1 s + fade-out 2 s + ducking: 0.30 cama / 0.16 bajo voz con umbral, ataque 80 ms, liberación 250 ms). MP3: la voz se acumula primero como Float32Array, se mezcla, y se codifica con lamejs en ESTÉREO (192k) si hay música o MONO (128k) como hoy si no. MP4: la mezcla se aplica sobre `media.samples` tras `prepareSequenceVideoMedia()` — cubre WebCodecs Y Recorder sin tocar el grafo (desviación documentada del spec, mismo resultado, ambos caminos cubiertos). Sin música o con error → camino actual intacto + aviso, nunca bloqueo.

**Tech Stack:** Web Audio (`decodeAudioData`, sin grafo en vivo), lamejs (mono/estéreo), Float32Array mixing.

---

## Contexto que debes conocer antes de tocar nada

| Hecho | Dónde |
|---|---|
| `exportSequenceMp3` (mono, lamejs 128k, silencio .14) | localiza por nombre |
| `clipToMonoInt16(clip, targetRate)` | localiza por nombre |
| `prepareSequenceVideoMedia` → `{samples (Int16Array mono), timeline, totalDuration, sampleRate}` | localiza por nombre |
| `exportSequenceMp4` (try WebCodecs → catch Recorder) | localiza por nombre |
| `loadData` → `Promise.all([offsets, podcastSeries])` | localiza por nombre |
| `setSequenceStatus(message, isError)` | existe |
| lamejs API: `new Mp3Encoder(1, rate, 128)` + `encodeBuffer(monoChunk)` (mono); para estéreo: `new Mp3Encoder(2, rate, 192)` + `encodeBuffer(left1152, right1152)` — dos Int16Array de 1152 muestras cada uno | `assets/lamejs.iife.min.js` |
| Toolbar de Secuencias (botones + status) | sección Secuencias |
| Test actual: 104 checks, `TODO OK (0 fallos)` | `tools/check-ui.mjs` |

### Invariantes

1. **Nunca** tocar `exportSequenceMp3` cuando NO hay música: el camino `Sin música` (y cualquier fallo de música) usa el código actual byte por byte.
2. **Nunca** bloquear una exportación por la música: pista ausente / error de decodificación → exportar sin música + avisar.
3. No regresiones: `TODO OK` al final; respaldo antes de editar.

### Decisiones ya tomadas (no re-preguntar)

- `assets/music/index.json` se crea con array vacío `[]` + nota (el usuario aún no entrega instrumentales).
- Mezcla en samples para MP4 (cubre ambos encoders) en vez de fuente en vivo en el grafo.
- Ducking solo en MP3/MP4-muestras (envolvente de voz umbral 0.02, cama 0.30, bajo voz 0.16).

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `index.pre-fase4.html` | Respaldo | Crear |
| `tools/check-ui.mjs` | Sección 9 (Fase 4) | Modificar |
| `assets/music/index.json` | Índice de pistas (`[]` inicial) | Crear |
| `index.html` | Selector + helpers + MP3 + MP4 | Modificar |
| `index.post-fase4.html` | Snapshot | Crear |
| `README.txt` | Registro Fase 4 | Modificar |

---

## Task 1: Respaldo y test rojo

**Files:**
- Create: `index.pre-fase4.html`
- Modify: `tools/check-ui.mjs` (sección 9 antes del console.log final)

- [ ] **Step 1: Respaldo**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Copy-Item "$root\index.html" "$root\index.pre-fase4.html"
Get-Item "$root\index.pre-fase4.html" | Select-Object Name, Length
```

- [ ] **Step 2: Sección 9**

```js
// ---- 9. Fase 4: música de fondo en exportaciones ----
ok("existe assets/music/index.json", Boolean(readSafe("assets/music/index.json")), "no encontrado");
if (html) {
  ok("selector de música en Secuencias", html.includes('id="sequenceMusicSelect"') &&
    html.includes("Sin música"), "sin selector");
  ok("música: índice opcional", html.includes("assets/music/index.json"),
    "sin carga del índice");
  ok("música: decode + mezcla compartidos", html.includes("function decodeMusicTrack") &&
    html.includes("function mixSequenceMusic"), "sin helpers");
  ok("música: ducking bajo voz", html.includes("mixSequenceMusic") &&
    /0\.16|duck/.test(html), "sin ducking");
  ok("MP3: estéreo cuando hay música", html.includes("Mp3Encoder(2"),
    "sin codificador estéreo");
  ok("MP3: camino mono intacto sin música", html.includes("Mp3Encoder(1"),
    "sin codificador mono");
  ok("MP4: cama mezclada en samples", html.includes("mixSequenceMusic(media") ||
    html.includes("mixSequenceMusic(voice"),
    "sin mezcla en MP4");
  ok("música: fallback sin bloqueo", html.includes("Sin música") &&
    html.includes("sequenceState.musicId"), "sin fallback");
}
```

- [ ] **Step 3: ROJO**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
```

Expected: los 104 previos PASS, los ~9 nuevos FAIL (el de `existe assets/music/index.json` también FAIL hasta T2), exit 1. Ningún previo puede fallar.

---

## Task 2: Selector de música + índice

**Files:**
- Create: `assets/music/index.json` (contenido: `[]` + comentario NO permitido en JSON — solo `[]`)
- Modify: `index.html` (select en toolbar + carga opcional + estado)

- [ ] **Step 1: Crear `assets/music/index.json`**

```json
[]
```

- [ ] **Step 2: Select en la toolbar de Secuencias** (después de los botones de la toolbar, antes de `.sequence-status`; ancla: el `</div>` de `.sequence-controls` y `<p class="sequence-status" id="sequenceStatus"`)

```html
          <label class="sequence-music" for="sequenceMusicSelect">
            <span>Música de fondo</span>
            <select id="sequenceMusicSelect">
              <option value="" selected>Sin música</option>
            </select>
            <small>Solo en las descargas (MP3 y MP4). Deja tus instrumentales en assets/music/.</small>
          </label>
```

- [ ] **Step 3: CSS** (junto a `.sequence-video-pace` o reglas de Secuencias)

```css
    .sequence-music { display: block; margin: 2px 0 10px; color: var(--muted); font-size: .78rem; font-weight: 700; }
    .sequence-music select { display: block; width: 100%; margin-top: 4px; border: 1px solid var(--line); border-radius: 9px; padding: 9px 10px; font: inherit; color: var(--ink); background: var(--surface); }
    .sequence-music small { display: block; margin-top: 4px; font-weight: 400; }
```

- [ ] **Step 4: Estado + carga + wiring** (junto a `sequenceState.videoRes/videoBitrate/videoFps`)

En `sequenceState`: añadir `musicId: ""` y `musicTracks: []`.

Carga opcional en `loadData` (dentro del try, tras la fusión de extra-stories/songs — localizar el bloque `await Promise.all([fetch("assets/extra-stories.json")...])` y añadir después):

```js
        await fetch("assets/music/index.json")
          .then(function(response) { return response.ok ? response.json() : null; })
          .then(function(data) {
            if (Array.isArray(data)) sequenceState.musicTracks = data.filter(function(track) {
              return track && typeof track.id === "string" && typeof track.title === "string" && typeof track.file === "string";
            });
          })
          .catch(function() {});
        renderSequenceMusicOptions();
```

Render + wiring (junto a los listeners de videoRes/videoBitrate/videoFps):

```js
    const sequenceMusicSelect = document.getElementById("sequenceMusicSelect");
    function renderSequenceMusicOptions() {
      const current = sequenceState.musicId || "";
      sequenceMusicSelect.innerHTML = '<option value=""' + (current === "" ? " selected" : "") + '>Sin música</option>' +
        sequenceState.musicTracks.map(function(track) {
          return '<option value="' + escapeHtml(track.id) + '"' + (current === track.id ? " selected" : "") + '>' + escapeHtml(track.title) + '</option>';
        }).join("");
    }
    sequenceMusicSelect.addEventListener("change", function() { sequenceState.musicId = sequenceMusicSelect.value || ""; });
```

---

## Task 3: MP3 con cama musical

**Files:**
- Modify: `index.html` (helpers + reescritura parcial de `exportSequenceMp3`)

- [ ] **Step 1: Helpers** (antes de `exportSequenceMp3`; localizar por nombre)

```js
    let sequenceMusicCache = { id: "", samples: null, sampleRate: 0 };
    async function decodeMusicTrack(musicId, targetRate) {
      const track = sequenceState.musicTracks.find(function(entry) { return entry.id === musicId; });
      if (!track || !track.file) return null;
      if (sequenceMusicCache.id === musicId && sequenceMusicCache.sampleRate === targetRate && sequenceMusicCache.samples) {
        return sequenceMusicCache.samples;
      }
      const response = await fetch(track.file);
      if (!response.ok) return null;
      const bytes = await response.arrayBuffer();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext || window.OfflineAudioContext;
      if (!AudioContextClass) return null;
      let context = null;
      try {
        context = new AudioContextClass();
        const decoded = await context.decodeAudioData(bytes.slice(0));
        const channel = decoded.getChannelData(0);
        const ratio = decoded.sampleRate / targetRate;
        const outLength = Math.max(1, Math.floor(channel.length / ratio));
        const out = new Float32Array(outLength);
        for (let index = 0; index < outLength; index += 1) {
          const position = index * ratio;
          const left = Math.floor(position);
          const frac = position - left;
          out[index] = channel[left] * (1 - frac) + (channel[Math.min(channel.length - 1, left + 1)] || 0) * frac;
        }
        const scale = out.reduce(function(peak, value) { return Math.max(peak, Math.abs(value)); }, 0);
        if (scale > 1) { for (let index = 0; index < out.length; index += 1) out[index] /= scale; }
        sequenceMusicCache = { id: musicId, samples: out, sampleRate: targetRate };
        return out;
      } catch (error) {
        return null;
      } finally {
        if (context && context.close) { try { await context.close(); } catch (error) {} }
      }
    }

    function mixSequenceMusic(voiceFloat, musicFloat, sampleRate) {
      const total = voiceFloat.length;
      const out = new Float32Array(total);
      const fadeIn = Math.min(total, Math.round(sampleRate * 1));
      const fadeOut = Math.min(total, Math.round(sampleRate * 2));
      let envelope = 0;
      const attackCoeff = 1 - Math.exp(-1 / (.08 * sampleRate));
      const releaseCoeff = 1 - Math.exp(-1 / (.25 * sampleRate));
      let gain = .3;
      for (let index = 0; index < total; index += 1) {
        const voice = voiceFloat[index] || 0;
        const absolute = Math.abs(voice);
        envelope += (absolute - envelope) * (absolute > envelope ? attackCoeff : releaseCoeff);
        const ducked = envelope > .02;
        gain += ((ducked ? .16 : .3) - gain) * (ducked ? attackCoeff : releaseCoeff);
        let music = 0;
        if (musicFloat && musicFloat.length) {
          music = musicFloat[index % musicFloat.length] || 0;
          const fade = Math.min(1, index / Math.max(1, fadeIn)) * Math.min(1, (total - index) / Math.max(1, fadeOut));
          music *= fade;
        }
        out[index] = voice + gain * music;
        if (out[index] > 1) out[index] = 1;
        else if (out[index] < -1) out[index] = -1;
      }
      return out;
    }
```

- [ ] **Step 2: Reescribir `exportSequenceMp3`** (reemplazar la función COMPLETA por)

```js
    async function exportSequenceMp3() {
      if (!sequenceState.items.length || sequenceState.exporting) return;
      stopSequencePreview();
      sequenceState.exporting = true;
      renderSequenceList();
      sequenceDownloadBtn.textContent = "Preparando audios…";
      sequenceDownloadBtn.disabled = true;
      try {
        setSequenceStatus("Cargando el codificador MP3…", false);
        await loadOptionalScript("assets/lamejs.iife.min.js", function() {
          return Boolean(window.lamejs && window.lamejs.Mp3Encoder);
        });
        const targetRate = 44100;
        const withMusic = Boolean(sequenceState.musicId);
        let musicFloat = null;
        if (withMusic) {
          setSequenceStatus("Cargando la música de fondo…", false);
          musicFloat = await decodeMusicTrack(sequenceState.musicId, targetRate);
        }
        const useBed = withMusic && musicFloat && musicFloat.length;
        if (withMusic && !useBed) {
          setSequenceStatus("No se pudo cargar la música. Se exporta sin ella.", true);
        }
        const voicePieces = [];
        for (let itemIndex = 0; itemIndex < sequenceState.items.length; itemIndex += 1) {
          setSequenceStatus("Preparando audio " + (itemIndex + 1) + " de " + sequenceState.items.length + "…", false);
          const clip = await sequenceAudioClip(sequenceState.items[itemIndex]);
          const samples = clipToMonoInt16(clip, targetRate);
          voicePieces.push(samples);
          if (itemIndex < sequenceState.items.length - 1) voicePieces.push(new Int16Array(Math.round(targetRate * .14)));
          await new Promise(function(resolve) { setTimeout(resolve, 0); });
        }
        const voiceLength = voicePieces.reduce(function(sum, piece) { return sum + piece.length; }, 0);
        const voiceFloat = new Float32Array(voiceLength);
        let voiceOffset = 0;
        voicePieces.forEach(function(piece) {
          for (let index = 0; index < piece.length; index += 1) voiceFloat[voiceOffset + index] = piece[index] / 32768;
          voiceOffset += piece.length;
        });
        const mp3Parts = [];
        if (useBed) {
          const mixed = mixSequenceMusic(voiceFloat, musicFloat, targetRate);
          const encoder = new window.lamejs.Mp3Encoder(2, targetRate, 192);
          for (let offset = 0; offset < mixed.length; offset += 1152) {
            const left = new Int16Array(1152);
            const right = new Int16Array(1152);
            for (let index = 0; index < 1152 && offset + index < mixed.length; index += 1) {
              const value = Math.max(-1, Math.min(1, mixed[offset + index]));
              left[index] = Math.round(value * 32767);
              right[index] = Math.round(value * 32767);
            }
            const encoded = encoder.encodeBuffer(left, right);
            if (encoded.length) mp3Parts.push(encoded);
          }
          const tail = encoder.flush();
          if (tail.length) mp3Parts.push(tail);
        } else {
          const encoder = new window.lamejs.Mp3Encoder(1, targetRate, 128);
          const silence = new Int16Array(Math.round(targetRate * .14));
          for (let itemIndex = 0; itemIndex < sequenceState.items.length; itemIndex += 1) {
            setSequenceStatus("Codificando audio " + (itemIndex + 1) + " de " + sequenceState.items.length + "…", false);
            const clip = await sequenceAudioClip(sequenceState.items[itemIndex]);
            const samples = clipToMonoInt16(clip, targetRate);
            const pieces = itemIndex === sequenceState.items.length - 1 ? [samples] : [samples, silence];
            for (const piece of pieces) {
              for (let offset = 0; offset < piece.length; offset += 1152) {
                const encoded = encoder.encodeBuffer(piece.subarray(offset, Math.min(offset + 1152, piece.length)));
                if (encoded.length) mp3Parts.push(encoded);
              }
            }
            await new Promise(function(resolve) { setTimeout(resolve, 0); });
          }
          const tail = encoder.flush();
          if (tail.length) mp3Parts.push(tail);
        }
        const blob = new Blob(mp3Parts, { type: "audio/mpeg" });
        if (blob.size < 100) throw new Error("empty-mp3");
        downloadSequenceFile(blob, "mi-secuencia-chunks.mp3");
        setSequenceStatus("MP3 listo y descargado.", false);
      } catch (error) {
        setSequenceStatus("No se pudo crear el MP3. Revisa los audios propios o vuelve a intentarlo.", true);
      } finally {
        sequenceState.exporting = false;
        sequenceDownloadBtn.textContent = "↓ Descargar MP3";
        renderSequenceList();
      }
    }
```

> Nota: la rama `else` (sin música) reproduce el código actual con un `setSequenceStatus("Codificando…")` añadido — comportamiento idéntico (mono 128k, silencio .14).

---

## Task 4: MP4 con cama musical

**Files:**
- Modify: `index.html` (mezcla en `exportSequenceMp4`)

- [ ] **Step 1: Mezcla tras `prepareSequenceVideoMedia()`** (en `exportSequenceMp4`, localizar `const media = await prepareSequenceVideoMedia();` y la línea siguiente donde empieza el try de WebCodecs)

Insertar inmediatamente después de `const media = await prepareSequenceVideoMedia();`:

```js
        if (sequenceState.musicId) {
          setSequenceVideoStatus("Mezclando la música de fondo…", false);
          const musicFloat = await decodeMusicTrack(sequenceState.musicId, media.sampleRate);
          if (musicFloat && musicFloat.length) {
            const voiceFloat = new Float32Array(media.samples.length);
            for (let index = 0; index < media.samples.length; index += 1) voiceFloat[index] = media.samples[index] / 32768;
            const mixed = mixSequenceMusic(voiceFloat, musicFloat, media.sampleRate);
            for (let index = 0; index < media.samples.length; index += 1) {
              media.samples[index] = Math.round(Math.max(-1, Math.min(1, mixed[index])) * 32767);
            }
          } else {
            setSequenceVideoStatus("No se pudo cargar la música. Se exporta sin ella.", true);
          }
        }
```

> Esto cubre WebCodecs Y Recorder (ambos usan `media.samples`). Sin estado `musicId` o con error → flujo actual intacto.

---

## Task 5: Test verde, snapshot y cierre

- [ ] **Step 1: Test**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
```

Expected: `TODO OK (0 fallos)`, exit 0 (~113 checks: 104 + ~9 nuevos).

- [ ] **Step 2: Sintaxis del script inline** (extraer y `node --check` como en T6 de Fase 3).

- [ ] **Step 3: Snapshot + README**

```powershell
Copy-Item "$root\index.html" "$root\index.post-fase4.html"
```

Añadir a `README.txt` una sección "Música de fondo (Fase 4)": selector, `assets/music/index.json`, cama con ducking, estéreo en MP3, fallback sin bloqueo. Respaldos Fase 4.

---

## Self-review (ejecutado al escribir el plan)

- **Spec §4.6**: selector en toolbar → T2; `assets/music/index.json` [{id,title,file}] → T2; voz Float32Array primero → T3; música decodificada bucleada + fade-in 1s + fade-out 2s → helpers; mezcla 0.30 con ducking ≈0.16/umbral/ataque 80ms/liberación 250ms → T3; estéreo con música (mono sin ella) → T3; fuente bucleada+ganancia para MP4 → T4 (vía samples, documentado); fallback sin bloqueo → T3+T4.
- **Placeholders**: ninguno.
- **Consistencia**: `musicId/musicTracks`, `decodeMusicTrack/mixSequenceMusic`, `sequenceMusicSelect/renderSequenceMusicOptions` se usan igual en UI, carga, test y exportaciones.
