with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the problematic line
pos = content.find('data-video-theme="\' + sequenceState.videoTheme')
if pos >= 0:
    print('Found at position:', pos)
    start = max(0, pos - 50)
    end = min(len(content), pos + 80)
    print('Context:', repr(content[pos-50:pos+80]))
    
    # Replace single quotes with double quotes for the outer string
    # The problematic code: '[data-video-theme="\' + sequenceState.videoTheme + \'"] strong'
    # Should become: '[data-video-theme="' + sequenceState.videoTheme + '"]'
    old = 'data-video-theme="\' + sequenceState.videoTheme + \'"]'
    new = 'data-video-theme="' + sequenceState.videoTheme + '"]'
    content = content.replace(old, new)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed successfully')
else:
    print('Pattern not found')