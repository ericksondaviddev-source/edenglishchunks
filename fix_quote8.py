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
    old = 'data-video-theme="\' + sequenceState.videoTheme'
    new = 'data-video-theme="' + sequenceState.videoTheme
    content = content.replace(old, new)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed successfully')
else:
    print('Pattern not found with single quote')
    
    # Try with double quote
    pos = content.find('data-video-theme="\' + sequenceState.videoTheme')
    if pos >= 0:
        print('Found with double quote at:', pos)
        start = max(0, pos - 50)
        end = min(len(content), pos + 80)
        print('Context:', repr(content[pos-50:pos+80]))
    else:
        print('Not found with double quote either')
        
        # Try to find any data-video-theme with sequenceState
        import re
        for m in re.finditer(r'data-video-theme=[^ >]+', content):
            if 'sequenceState' in m.group():
                print(f'Found: {m.group()} at {m.start()}')