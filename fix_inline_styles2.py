import re

file_path = 'index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded light section backgrounds with variables
content = re.sub(r'background:\s*#e9ecef;?', 'background:var(--bg-surface-hover);', content)
content = re.sub(r'background:\s*#e8eefa;?', 'background:rgba(59,130,246,0.1);', content)
content = re.sub(r'background:\s*#e8f5e9;?', 'background:rgba(16,185,129,0.1);', content)
content = re.sub(r'background:\s*#dc3545;?', 'background:var(--danger);', content)
content = re.sub(r'background:\s*#28a745;?', 'background:var(--success);', content)
content = re.sub(r'background:\s*#4472C4;?', 'background:var(--primary);', content)
content = re.sub(r'background:\s*#F59E0B;?', 'background:var(--warning);', content)
content = re.sub(r'background-color:\s*#e9ecef;?', 'background-color:var(--bg-surface-hover);', content)
content = re.sub(r'background:\s*#d5dce9;?', 'background:var(--bg-surface-hover);', content)

# Check for #fff3cd and similar with space
content = re.sub(r'background(-color)?:\s*#fff3cd;?', r'background-color:rgba(255,193,7,0.15);', content)
content = re.sub(r'background(-color)?:\s*#f8d7da;?', r'background-color:rgba(239,68,68,0.15);', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Replaced remaining inline styles')
