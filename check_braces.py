with open('render_remaining.js', 'r', encoding='utf-8') as f:
    content = f.read()
open_braces = content.count('{')
close_braces = content.count('}')
print(f'Open braces: {open_braces}')
print(f'Close braces: {close_braces}')
print(f'Balance: {open_braces - close_braces}')