with open('tools/check-ui.mjs', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the 7 themes check with 4 themes
old1 = 'ok("motor: 7 temas de video definidos", themesBlock !== "" && missingThemes.length === 0,'
new1 = 'ok("motor: 4 temas de video definidos", themesBlock !== "" && missingThemes.length === 0,'
content = content.replace('ok("motor: 7 temas de video definidos", themesBlock !== "" && missingThemes.length === 0,', 'ok("motor: 4 temas de video definidos", themesBlock !== "" && missingThemes.length === 0,')

# Replace swatches check
old_swatches = 'const swatches = (html.match(/data-video-theme="[^"]+"/g) || []).map((m) => m.slice(18, -1));\n  ok("swatches: 7 diseños con data-video-theme", swatches.length >= 7 &&\n    ["keynote", "netflix", "diccionario"].every((k) => swatches.includes(k)),\n    "diseños: " + swatches.join(","));'
new_swatches = 'const swatches = (html.match(/data-video-theme="[^"]+"/g) || []).map((m) => m.slice(18, -1));\n  ok("swatches: 4 diseños con data-video-theme", swatches.length === 4 &&\n    ["keynote", "netflix", "diccionario", "escenario"].every((k) => swatches.includes(k)),\n    "diseños: " + swatches.join(","));'

content = content.replace(
    'const swatches = (html.match(/data-video-theme="[^"]+"/g) || []).map((m) => m.slice(18, -1));\n  ok("swatches: 7 diseños con data-video-theme", swatches.length >= 7 &&\n    ["keynote", "netflix", "diccionario"].every((k) => swatches.includes(k)),\n    "diseños: " + swatches.join(","));',
    'const swatches = (html.match(/data-video-theme="[^"]+"/g) || []).map((m) => m.slice(18, -1));\n  ok("swatches: 4 diseños con data-video-theme", swatches.length === 4 &&\n    ["keynote", "netflix", "diccionario", "escenario"].every((k) => swatches.includes(k)),\n    "diseños: " + swatches.join(","));'
)

# Replace the tema especial check
old_tema = 'ok("tema especial escenario + swatch",\n    html.includes(\'data-video-theme="escenario"\') &&\n    ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario", "escenario"].every((t) => html.includes(\'data-video-theme="' + t + '"\')),\n    "faltan: " + ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario", "escenario"].filter((t) => !html.includes(\'data-video-theme="' + t + '"\')).join(", "));'
new_tema = '''  ok("tema especial escenario + swatch",
    html.includes('data-video-theme="escenario"') &&
    ["keynote", "netflix", "diccionario", "escenario"].every((t) => html.includes('data-video-theme="' + t + '"')),
    "faltan: " + ["keynote", "netflix", "diccionario", "escenario"].filter((t) => !html.includes('data-video-theme="' + t + '"')).join(", "));'''

content = content.replace(old_check1, new_check1)
content = content.replace(old_swatches, new_swatches)
content = content.replace(old_tema, new_tema)

with open('tools/check-ui.mjs', 'w', encoding='utf-8') as f:
    f.write(content)

print('Check updated successfully')