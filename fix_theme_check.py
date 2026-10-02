with open('tools/check-ui.mjs', 'r', encoding='utf-8') as f:
    content = f.read()

# Update themeKeys to match new 4 themes
old = '''  const themeKeys = ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario"];'''
new = '''  const themeKeys = ["keynote", "netflix", "diccionario", "escenario"];'''

content = content.replace(old, new)

with open('tools/check-ui.mjs', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated')