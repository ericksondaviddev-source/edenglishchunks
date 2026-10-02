with open('tools/check-ui.mjs', 'r', encoding='utf-8') as f:
    content = f.read()

old_check = '''  ok("listeners de Biblioteca intactos",
    html.includes('id="creativeListenBtn"') && html.includes('id="creativeSequenceBtn"') &&
    html.includes("addCreativeChunksToSequence"));'''

new_check = '''  ok("listeners de Biblioteca intactos (sin Practicar chunks)",
    html.includes('id="creativeListenBtn"') &&
    html.includes('id="creativeMp3Link"') &&
    html.includes('id="creativeMp4Btn"') &&
    !html.includes('id="creativeSequenceBtn"') &&
    !html.includes('id="creativeSequenceBtn"') &&
    !html.includes('addCreativeChunksToSequence'));'''

new_content = content.replace(old_check, new_check)

with open('tools/check-ui.mjs', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Check updated successfully')