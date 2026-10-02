import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()
matches = re.findall(r'data-video-theme="[^"]+"', content)
print('Found themes:', matches)