with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix current.title -> creativeState.current.title
content = content.replace('current.title', 'creativeState.current.title')

# Fix current.summary
content = content.replace('current.summary', 'creativeState.current.summary')

# Fix current.audio
content = content.replace('current.audio', 'creativeState.current.audio')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')