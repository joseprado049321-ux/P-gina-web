import re
with open('c:\\Users\\jose0\\Documents\\NextTech\\Pagina_Web\\P-gina-web-1\\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's extract lines that define CSS for .card or .summary-cards
css_matches = re.findall(r'\.card\s*{[^}]+}', content)
css_matches2 = re.findall(r'\.summary-cards\s*{[^}]+}', content)

print("Card CSS:")
for m in css_matches: print(m[:100] + "...")
print("Summary Cards CSS:")
for m in css_matches2: print(m[:100] + "...")

# Find usages of .card
usages = re.findall(r'class="[^"]*card[^"]*"', content)
print(f"Total card usages: {len(usages)}")

# Also search for table rows?
table_usages = re.findall(r'<table[^>]*>', content)
print(f"Tables: {len(table_usages)}")

