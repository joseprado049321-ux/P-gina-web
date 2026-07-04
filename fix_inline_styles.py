import re

file_path = 'index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded backgrounds
content = re.sub(r'background:\s*#f8f9fa;?', 'background:var(--bg-surface-hover);', content)
content = re.sub(r'background:\s*#ffffff;?', 'background:var(--bg-surface);', content)
content = re.sub(r'background:\s*white;?', 'background:var(--bg-surface);', content)
content = re.sub(r'background:\s*#f0f0f0;?', 'background:var(--bg-surface-hover);', content)

# Replace specific hardcoded colors
content = re.sub(r'color:\s*#333333;?', 'color:var(--text-primary);', content)
content = re.sub(r'color:\s*#333;?', 'color:var(--text-primary);', content)
content = re.sub(r'color:\s*#4472C4;?', 'color:var(--primary);', content)
content = re.sub(r'border:\s*2px solid #4472C4;?', 'border:2px solid var(--primary);', content)
content = re.sub(r'border:\s*2px dashed #4472C4;?', 'border:2px dashed var(--primary);', content)
content = re.sub(r'border:\s*2px solid #dc3545;?', 'border:2px solid var(--danger);', content)
content = re.sub(r'border:\s*2px solid #28a745;?', 'border:2px solid var(--success);', content)
content = re.sub(r'border:\s*1px solid #d5dce9;?', 'border:1px solid var(--border);', content)
content = re.sub(r'border:\s*2px solid #e9ecef;?', 'border:2px solid var(--border);', content)

# Warning backgrounds
content = re.sub(r'background:\s*#fff3cd;?', 'background:rgba(255,193,7,0.15);', content)
content = re.sub(r'border:\s*1px solid #ffc107;?', 'border:1px solid var(--warning);', content)
content = re.sub(r'border:\s*2px solid #ffc107;?', 'border:2px solid var(--warning);', content)
content = re.sub(r'border-left:\s*4px solid #ffc107;?', 'border-left:4px solid var(--warning);', content)

# Danger backgrounds
content = re.sub(r'background:\s*#f8d7da;?', 'background:rgba(239,68,68,0.15);', content)
content = re.sub(r'border:\s*1px solid #f5c2c7;?', 'border:1px solid var(--danger);', content)

# Warning background list item
content = re.sub(r'background:\s*#fffde7;?', 'background:rgba(255,193,7,0.15);', content)
# Danger background list item
content = re.sub(r'background:\s*#ffebee;?', 'background:rgba(239,68,68,0.15);', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Replaced inline styles')
