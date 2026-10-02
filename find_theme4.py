with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pos = content.find('data-video-theme="\' + sequenceState.videoTheme')
if pos >= 0:
    line_num = content[:pos].count('\n') + 1
    print('Line:', line_num)
    start = max(0, pos - 100)
    end = min(len(content), pos + 100)
    print(repr(content[start:pos+50]))
else:
    print('Not found')

# Also find the exact line numbers for all data-video-theme
import re
for m in re.finditer(r'data-video-theme=[^ >]+', content):
    line_num = content[:m.start()].count('\n') + 1
    print(f'Line {m.start()}: {m.group()}')