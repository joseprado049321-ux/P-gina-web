import sys

# Read backup
backup_path = r'c:\Users\jose0\Documents\NextTech\Pagina_Web\P-gina-web-1\backup.html'
with open(backup_path, 'r', encoding='utf-16') as f:
    lines_backup = f.readlines()

# Extract CategoriaCustom from backup lines 5190-5325
original_cat_lines = lines_backup[5189:5325]
original_cat = "".join(original_cat_lines)

# Now modify original_cat to use Estado and Firebase
new_cat = original_cat.replace(
    "try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; }",
    "return Estado.categoriasCustom || [];"
)
new_cat = new_cat.replace(
    "function saveCustom(arr) {\nlocalStorage.setItem(STORAGE_KEY, JSON.stringify(arr));\n}",
    "async function saveCustom(arr) {\nEstado.categoriasCustom = arr;\nif (window.firebaseOK && !Auth.modoInvitado) await Firebase.guardar('categoriasCustom', arr);\n}"
)
new_cat = new_cat.replace("function saveCustom(arr) {", "async function saveCustom(arr) {")
new_cat = new_cat.replace("localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));", "Estado.categoriasCustom = arr;\nif (window.firebaseOK && !Auth.modoInvitado) await Firebase.guardar('categoriasCustom', arr);")

new_cat = new_cat.replace("saveCustom(custom);", "await saveCustom(custom);")

# Update index.html
path = r'c:\Users\jose0\Documents\NextTech\Pagina_Web\P-gina-web-1\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
# Remove my broken CategoriasCustom if it exists
content = re.sub(r'const CategoriasCustom = \{.*?\n\s+eliminar\(nombre\) \{.*?\n\s+\}\n\s+\};', '', content, flags=re.DOTALL)
# Find the broken CategoriaCustom in index.html and replace it
content = re.sub(r'const CategoriaCustom = \(\(\) => \{.*?\n\s+\};\n\s+\}\)\(\);', new_cat, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done restoring")
