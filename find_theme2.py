with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pos = content.find('data-video-theme')
while pos >= 0:
    print(f'Pos {pos}: {repr(content[pos:pos+50])}')
    pos = content.find('data-video-theme', pos + 1)