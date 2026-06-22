import sys, re

path = r'c:\Users\jose0\Documents\NextTech\Pagina_Web\P-gina-web-1\index.html'
with open(path, 'r', encoding='utf-8') as f: content = f.read()

# Add Auth.modoInvitado check to Firebase
content = content.replace(
    'if (!window.firebaseOK) return null;',
    "if (!window.firebaseOK || (typeof Auth !== 'undefined' && Auth.modoInvitado)) return null;"
)
content = content.replace(
    'if (!window.firebaseOK) return;',
    "if (!window.firebaseOK || (typeof Auth !== 'undefined' && Auth.modoInvitado)) return;"
)
content = content.replace(
    'if (!firebaseOK) return null;',
    "if (!window.firebaseOK || (typeof Auth !== 'undefined' && Auth.modoInvitado)) return null;"
)
content = content.replace(
    'if (!firebaseOK) return;',
    "if (!window.firebaseOK || (typeof Auth !== 'undefined' && Auth.modoInvitado)) return;"
)

# Add dummy methods to Storage
storage_dummies = '''        const Storage = {
            cargarVentas() {},
            cargarInventario() {},
            cargarClientes() {},
            cargarGastos() {},
            cargarCostos() {},\n'''
content = content.replace('const Storage = {', storage_dummies)

# And remove those DOMContentLoaded Storage calls since they are handled by sincronizarDesdeFirebase anyway
content = re.sub(r'Storage\.cargar(Clientes|Gastos|Costos)\(\);', '', content)

with open(path, 'w', encoding='utf-8') as f: f.write(content)
print("Done fixing storage")
