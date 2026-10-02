with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the problematic line
import re
for m in re.finditer(r'document\.querySelector\([^)]+\)', content):
    if 'data-video-theme' in m.group():
        print(f'Found at {m.start()}: {repr(m.group())}')