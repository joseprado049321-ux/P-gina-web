import re

with open('c:\\Users\\jose0\\Documents\\NextTech\\Pagina_Web\\P-gina-web-1\\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print("--- Analysis Results ---")

console_logs = re.findall(r'console\.log\(', content)
print(f"1. console.log calls: {len(console_logs)}")

deprecated_tags = re.findall(r'<(center|font|strike|b|i)>', content)
print(f"2. Deprecated/Presentational Tags: {len(deprecated_tags)}")

todo_comments = re.findall(r'(?i)<!--.*?TODO.*?-->|//.*?TODO', content)
print(f"3. TODO Comments: {len(todo_comments)}")

inline_onclick = re.findall(r'onclick=', content)
print(f"4. Inline onclick attributes: {len(inline_onclick)}")

try_catches = re.findall(r'catch\s*\(', content)
awaits = re.findall(r'await\s', content)
print(f"5. Awaits: {len(awaits)}, Catches: {len(try_catches)}")

# Find excessively long functions
functions = re.finditer(r'function\s+([a-zA-Z0-9_]+)\s*\(|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>', content)
function_starts = [f.start() for f in functions]
# Not perfect but gives an idea

