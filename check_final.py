with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Search for the problematic pattern
pos = content.find('data-video-theme="')
while pos >= 0:
    end = content.find('"', pos + 16)
    if end >= 0:
        match = content[pos:end+1]
        if 'sequenceState' in match:
            print(f'Found at {content[:pos].count(chr(10))+1}: {match}')
    pos = content.find('data-video-theme="', pos + 1)