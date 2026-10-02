with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pos = content.find('data-video-theme=\'')
if pos >= 0:
    print(repr(content[pos-50:pos+50]))