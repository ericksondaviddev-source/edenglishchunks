with open('tools/check-ui.mjs', 'r', encoding='utf-8') as f:
    content = f.read()

old_check = '''  ok("motor: 7 temas de video definidos",
    Object.keys(SEQUENCE_VIDEO_THEMES).length === 7,
    "temas: " + Object.keys(SEQUENCE_VIDEO_THEMES).join(","));
  ok("swatches: 7 diseños con data-video-theme",
    (html.match(/data-video-theme=/g) || []).length === 7,
    "diseños: " + (html.match(/data-video-theme=/g) || []).join(","));
  ok("tema especial escenario + swatch",
    html.includes('data-video-theme="escenario"') &&
    ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario", "escenario"].every(t => html.includes('data-video-theme="' + t + '"')));'''

new_check = '''  ok("motor: 4 temas de video definidos",
    Object.keys(SEQUENCE_VIDEO_THEMES).length === 4,
    "temas: " + Object.keys(SEQUENCE_VIDEO_THEMES).join(","));
  ok("swatches: 4 diseños con data-video-theme",
    (html.match(/data-video-theme=/g) || []).length === 4,
    "diseños: " + (html.match(/data-video-theme=/g) || []).join(","));
  ok("tema especial escenario + swatch",
    html.includes('data-video-theme="escenario"') &&
    ["keynote", "netflix", "diccionario", "escenario"].every(t => html.includes('data-video-theme="' + t + '"')));'''

new_content = content.replace(old_check, new_check)

with open('tools/check-ui.mjs', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Check updated successfully')