with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pos = 0
while True:
    pos = content.find('data-video-theme=', pos)
    if pos < 0:
        break
    end = content.find(' ', pos)
    if end < 0:
        end = content.find('\n', pos)
    if end < 0:
        end = pos + 100
    match = content[pos:pos+100]
    if 'sequenceState' in match or 'pulso' in match or 'solar' in match or 'noche' in match or 'editorial' in match or 'pulso' in match:
        print(f'Found at {pos}: {repr(match[:80])}')
    pos += 1