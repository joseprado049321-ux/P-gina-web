import sys, re

# Read backup
backup_path = r'c:\Users\jose0\Documents\NextTech\Pagina_Web\P-gina-web-1\backup.html'
with open(backup_path, 'r', encoding='utf-8') as f:
    backup_content = f.read()

# Extract CategoriaCustom from backup
match = re.search(r'(const CategoriaCustom = \(\(\) => \{.*?\n\s+\};\n\s+\}\)\(\);)', backup_content, flags=re.DOTALL)
if not match:
    print("Not found in backup")
    sys.exit(1)

original_cat = match.group(1)

# Now modify original_cat to use Estado and Firebase
new_cat = original_cat.replace(
    "try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; }",
    "return Estado.categoriasCustom || [];"
)
new_cat = new_cat.replace(
    "function saveCustom(arr) {\n                localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));\n            }",
    "async function saveCustom(arr) {\n                Estado.categoriasCustom = arr;\n                await Firebase.guardar('categoriasCustom', arr);\n            }"
)
new_cat = new_cat.replace("async function agregar() {", "async function agregar() {") # already async
new_cat = new_cat.replace("saveCustom(allCustom);", "await saveCustom(allCustom);")
new_cat = new_cat.replace("async function eliminar(nombre) {", "async function eliminar(nombre) {") # wait, wasn't it async?

# Let's verify if original had async
if "async function eliminar" not in new_cat:
    new_cat = new_cat.replace("function eliminar(nombre) {", "async function eliminar(nombre) {")
if "async function agregar" not in new_cat:
    new_cat = new_cat.replace("function agregar() {", "async function agregar() {")

new_cat = new_cat.replace("saveCustom(newCustom);", "await saveCustom(newCustom);")

# Update index.html
path = r'c:\Users\jose0\Documents\NextTech\Pagina_Web\P-gina-web-1\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace my broken CategoriaCustom with the fixed one
content = re.sub(r'const CategoriaCustom = \(\(\) => \{.*?\n\s+\};\n\s+\}\)\(\);', new_cat, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done restoring")
