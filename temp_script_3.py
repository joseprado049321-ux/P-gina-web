import re
with open('c:\\Users\\jose0\\Documents\\NextTech\\Pagina_Web\\P-gina-web-1\\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

classes = set(re.findall(r'class="([^"]+)"', content))
interesting_keywords = ['modal', 'dropdown', 'popup', 'toast', 'alert', 'sidebar', 'menu', 'card', 'dialog', 'overlay']

found = set()
for cls_string in classes:
    for cls in cls_string.split():
        for keyword in interesting_keywords:
            if keyword in cls:
                found.add(cls)

print('Interesting classes found:')
for c in sorted(found):
    print(c)
