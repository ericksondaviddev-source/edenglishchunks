with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Search for the problematic theme
idx = content.find('data-video-theme')
while True:
    idx = content.find('data-video-theme', idx)
    if idx == -1:
        break
    end = content.find('"', idx + 16)
    if idx >= 0:
        print(f'Pos {idx}: {content[idx:idx+50]}')
    idx += 1