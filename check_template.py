with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re
for m in re.finditer(r'`[^`]*data-video-theme[^`]*`', content):
    start = max(0, m.start() - 50)
    end = min(len(content), m.end() + 50)
    print(f'Found at {m.start()}: {repr(content[m.start():m.end()])}')