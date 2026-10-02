with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the problematic line
pos = content.find('data-video-theme="\' + sequenceState.videoTheme')
if pos >= 0:
    print('Found at position:', pos)
    # Replace single quotes with double quotes for the outer string
    old = '[data-video-theme="\' + sequenceState.videoTheme'
    new = '[data-video-theme="\' + sequenceState.videoTheme'
    # Actually, we need to change the outer quotes from single to double
    # The current code: '[data-video-theme="' + sequenceState.videoTheme + '"]'
    # Should become: '[data-video-theme="\' + sequenceState.videoTheme + \'"]'
    # No wait, that's the same. The issue is the outer quotes are single quotes.
    # Let's change the outer quotes to double quotes.
    
    # Find the exact pattern
    import re
    pattern = r"document\.queryselector\('[data-video-theme=\"' \+ sequenceState\.videoTheme \+ '\"] strong'\)"
    match = re.search(r"document\.querySelector\('[data-video-theme=\"' \+ sequenceState\.videoTheme \+ '\"\] strong'\)", content)
    if match:
        print('Found at:', match.start())
        print(repr(content[match.start():match.end()]))
    else:
        print('Pattern not found')
        # Try alternative pattern
        for m in re.finditer(r'document\.querySelector\([^)]+\)', content):
            if 'data-video-theme' in m.group():
                print(f'Found at {m.start()}: {repr(m.group())}')