with open('tools/check-ui.mjs', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const themeKeys8 = ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario", "escenario"];',
    'const themeKeys8 = ["keynote", "netflix", "diccionario", "escenario"];'
)

with open('tools/check-ui.mjs', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated')