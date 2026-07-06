import re
import collections

with open('c:\\Users\\jose0\\Documents\\NextTech\\Pagina_Web\\P-gina-web-1\\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. CSS Analysis
# Find all defined classes in CSS
defined_classes = set(re.findall(r'\.([a-zA-Z0-9_-]+)\s*[{,:]', content))
# Find all used classes in HTML (ignoring classes in <script> mostly, but rough regex)
html_tags = re.findall(r'<[^>]+>', content)
used_classes = set()
for tag in html_tags:
    class_attr = re.search(r'class=["\']([^"\']+)["\']', tag)
    if class_attr:
        for c in class_attr.group(1).split():
            used_classes.add(c)

unused_css = defined_classes - used_classes
# Some defined classes might be dynamically added via JS. Let's check JS string literals.
js_strings = set(re.findall(r'["\']([a-zA-Z0-9_-]+)["\']', content))
actually_unused_css = unused_css - js_strings

# 2. JS Functions Analysis
# Find defined functions
defined_functions = set(re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', content))
# Also arrow functions: const myFunc = (
defined_arrows = set(re.findall(r'(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>', content))
all_functions = defined_functions.union(defined_arrows)

# Find usages (just the function name followed by '(' or passed as callback)
# We will just count occurrences of the word.
word_counts = collections.Counter(re.findall(r'\b([a-zA-Z0-9_]+)\b', content))

unused_functions = [f for f in all_functions if word_counts[f] <= 1] # 1 means only definition

# 3. Bad Practices / Anti-patterns
anti_patterns = []
# Duplicate IDs
ids = re.findall(r'id=["\']([^"\']+)["\']', content)
duplicate_ids = [item for item, count in collections.Counter(ids).items() if count > 1]
if duplicate_ids:
    anti_patterns.append(f"Duplicate IDs found: {duplicate_ids}")

# Inline styles
inline_styles = re.findall(r'style=["\']([^"\']+)["\']', content)
if len(inline_styles) > 20:
    anti_patterns.append(f"High number of inline styles: {len(inline_styles)}")

# Synchronous Firebase calls? (e.g. not using await on get(), add(), set(), update())
# This is tricky with simple regex, but we can try
missing_awaits = re.findall(r'(?<!await\s)\b(?:get|add|set|update|delete)\(\)', content)

print("=== UNUSED CSS CLASSES ===")
print(list(actually_unused_css)[:20], f"... (Total: {len(actually_unused_css)})")

print("\n=== UNUSED JS FUNCTIONS ===")
print(unused_functions)

print("\n=== ANTI PATTERNS ===")
for p in anti_patterns:
    print(p)
