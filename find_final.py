with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the problematic line
pos = content.find('data-video-theme="\' + sequenceState')
if pos >= 0:
    print('Found at position:', pos)
    print(repr(content[pos-50:pos+80]))
else:
    print('Pattern not found with single quote')
    
    pos = content.find('data-video-theme="\' + sequenceState')
    if pos >= 0:
        print('Found with double quote at:', pos)
        print(repr(content[pos-50:pos+80]))
    else:
        print('Not found')
        
        # Search for any data-video-theme with sequenceState
        import re
        for m in re.finditer(r'data-video-theme=[^ >]+', content):
            if 'sequenceState' in m.group():
                print(f'Found: {m.group()} at {m.start()}')