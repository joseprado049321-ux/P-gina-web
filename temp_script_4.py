import re
with open('c:\\Users\\jose0\\Documents\\NextTech\\Pagina_Web\\P-gina-web-1\\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

classes = set(re.findall(r'class=\"([^\"]+)\"', content))
found = set()
for cls_string in classes:
    for cls in cls_string.split():
        found.add(cls)

interesting_keywords = ['modal', 'dialog', 'popup', 'dropdown', 'notification', 'alert', 'toast', 'sidebar', 'menu', 'card', 'tooltip', 'panel', 'drawer']
interesting = set()
for cls in found:
    for kw in interesting_keywords:
        if kw in cls:
            interesting.add(cls)

print('Interesting classes:')
for c in sorted(interesting):
    print(c)
