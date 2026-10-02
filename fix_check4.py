with open('tools/check-ui.mjs', 'r', encoding='utf-8') as f:
    content = f.read()

old_check1 = '''  ok("motor: 7 temas de video definidos", themesBlock !== "" && missingThemes.length === 0,
    themesBlock === "" ? "SEQUENCE_VIDEO_THEMES no encontrado" : "faltan: " + missingThemes.join(", "));'''

new_check1 = '''  ok("motor: 4 temas de video definidos", themesBlock !== "" && missingThemes.length === 0,
    themesBlock === "" ? "SEQUENCE_VIDEO_THEMES no encontrado" : "faltan: " + missingThemes.join(", "));'''

old_check2 = '''  const swatches = (html.match(/data-video-theme="[^"]+"/g) || []).map((m) => m.slice(18, -1));
  ok("swatches: 7 diseños con data-video-theme", swatches.length >= 7 &&
    ["keynote", "netflix", "diccionario"].every((k) => swatches.includes(k)),
    "diseños: " + swatches.join(","));'''

new_check2 = '''  const swatches = (html.match(/data-video-theme="[^"]+"/g) || []).map((m) => m.slice(18, -1));
  ok("swatches: 4 diseños con data-video-theme", swatches.length === 4 &&
    ["keynote", "netflix", "diccionario", "escenario"].every((k) => swatches.includes(k)),
    "diseños: " + swatches.join(","));'''

old_check3 = '''  ok("tema especial escenario + swatch",
    html.includes('data-video-theme="escenario"') &&
    ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario", "escenario"].every((t) => html.includes('data-video-theme="' + t + '"')),
    "faltan: " + ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario", "escenario"].filter((t) => !html.includes('data-video-theme="' + t + '"')).join(", "));'''

new_check3 = '''  ok("tema especial escenario + swatch",
    html.includes('data-video-theme="escenario"') &&
    ["keynote", "netflix", "diccionario", "escenario"].every((t) => html.includes('data-video-theme="' + t + '"')),
    "faltan: " + ["keynote", "netflix", "diccionario", "escenario"].filter((t) => !html.includes('data-video-theme="' + t + '"')).join(", "));'''

with open('tools/check-ui.mjs', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'ok("motor: 7 temas de video definidos", themesBlock !== "" && missingThemes.length === 0,\n    themesBlock === "" ? "SEQUENCE_VIDEO_THEMES no encontrado" : "faltan: " + missingThemes.join(", "));',
    'ok("motor: 4 temas de video definidos", themesBlock !== "" && missingThemes.length === 0,\n    themesBlock === "" ? "SEQUENCE_VIDEO_THEMES no encontrado" : "faltan: " + missingThemes.join(", "));'
)

content = content.replace(
    'const swatches = (html.match(/data-video-theme="[^"]+"/g) || []).map((m) => m.slice(18, -1));\n  ok("swatches: 7 diseños con data-video-theme", swatches.length >= 7 &&\n    ["keynote", "netflix", "diccionario"].every((k) => swatches.includes(k)),\n    "diseños: " + swatches.join(","));',
    'const swatches = (html.match(/data-video-theme="[^"]+"/g) || []).map((m) => m.slice(18, -1));\n  ok("swatches: 4 diseños con data-video-theme", swatches.length === 4 &&\n    ["keynote", "netflix", "diccionario", "escenario"].every((k) => swatches.includes(k)),\n    "diseños: " + swatches.join(","));'
)

content = content.replace(
    'ok("tema especial escenario + swatch",\n    html.includes(\'data-video-theme="escenario"\') &&\n    ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario", "escenario"].every((t) => html.includes(\'data-video-theme="' + t + '"\')),\n    "faltan: " + ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario", "escenario"].filter((t) => !html.includes(\'data-video-theme="' + t + '"\')).join(", "));',
    'ok("tema especial escenario + swatch",\n    html.includes(\'data-video-theme="escenario"\') &&\n    ["keynote", "netflix", "diccionario", "escenario"].every((t) => html.includes(\'data-video-theme="' + t + '"\')),\n    "faltan: " + ["keynote", "netflix", "diccionario", "escenario"].filter((t) => !html.includes(\'data-video-theme="' + t + '"\')).join(", "));'
)

with open('tools/check-ui.mjs', 'w', encoding='utf-8') as f:
    f.write(content)

print('Check updated successfully')"