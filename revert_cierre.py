import sys, re
path = r'c:\Users\jose0\Documents\NextTech\Pagina_Web\P-gina-web-1\index.html'
with open(path, 'r', encoding='utf-8') as f: content = f.read()

# Replace CierreCaja
content = re.sub(
    r'async cargar\(\) \{.*?if \(\!window\.firebaseOK\).*?return data \|\| \[\]; \n\s+\},',
    'cargar() { return Estado.cierresCaja || []; },', content, flags=re.DOTALL
)
content = content.replace("async guardar(data) { await Firebase.guardar('cierresCaja', data); }", "async guardar(data) { Estado.cierresCaja = data; await Firebase.guardar('cierresCaja', data); }")

content = re.sub(
    r'async cargarEstado\(\) \{.*?if \(\!window\.firebaseOK\).*?return data \|\| \{ abierta: false, montoInicial: 0, fecha: null \}; \n\s+\},',
    'cargarEstado() { return Estado.estadoCaja || { abierta: false, montoInicial: 0, fecha: null }; },', content, flags=re.DOTALL
)
content = content.replace("async guardarEstado(estado) { await Firebase.guardar('estadoCaja', estado); }", "async guardarEstado(estado) { Estado.estadoCaja = estado; await Firebase.guardar('estadoCaja', estado); }")

# Replace OrdenesServicio
content = re.sub(
    r'cargar\(\) \{ try \{ return JSON\.parse\(localStorage\.getItem\(\'ordenesServicio\'\)\|\|\'\[\]\'\); \} catch\(e\)\{ return \[\]; \} \},',
    'cargar() { return Estado.ordenesServicio || []; },', content
)
content = re.sub(
    r'guardar\(data\) \{ localStorage\.setItem\(\'ordenesServicio\',JSON\.stringify\(data\)\); await Firebase\.guardar\(\'ordenesServicio\',data\); \},',
    "async guardar(data) { Estado.ordenesServicio = data; await Firebase.guardar('ordenesServicio', data); },", content
)

# Replace Proveedores
content = re.sub(
    r'try \{ return JSON\.parse\(localStorage\.getItem\(\'proveedores\'\) \|\| \'\[\]\'\); \} catch\(e\) \{ return \[\]; \}',
    'return Estado.proveedores || [];', content
)
content = re.sub(
    r'localStorage\.setItem\(\'proveedores\', JSON\.stringify\(data\)\);\s+await Firebase\.guardar\(\'proveedores\', data\);',
    "Estado.proveedores = data; await Firebase.guardar('proveedores', data);", content
)
content = content.replace('guardar(data) {', 'async guardar(data) {') # We will check manually if any sync ones are left

# Replace Compras
content = re.sub(
    r'try \{ return JSON\.parse\(localStorage\.getItem\(\'compras\'\) \|\| \'\[\]\'\); \} catch\(e\) \{ return \[\]; \}',
    'return Estado.compras || [];', content
)
content = re.sub(
    r'localStorage\.setItem\(\'compras\', JSON\.stringify\(data\)\);\s+await Firebase\.guardar\(\'compras\', data\);',
    "Estado.compras = data; await Firebase.guardar('compras', data);", content
)

# Replace Devoluciones
content = re.sub(
    r'try \{ return JSON\.parse\(localStorage\.getItem\(\'devoluciones\'\) \|\| \'\[\]\'\); \} catch\(e\) \{ return \[\]; \}',
    'return Estado.devoluciones || [];', content
)
content = re.sub(
    r'localStorage\.setItem\(\'devoluciones\', JSON\.stringify\(data\)\);\s+await Firebase\.guardar\(\'devoluciones\', data\);',
    "Estado.devoluciones = data; await Firebase.guardar('devoluciones', data);", content
)

# Replace Cotizaciones
content = re.sub(
    r'try \{ return JSON\.parse\(localStorage\.getItem\(\'cotizaciones\'\) \|\| \'\[\]\'\); \} catch\(e\) \{ return \[\]; \}',
    'return Estado.cotizaciones || [];', content
)
content = re.sub(
    r'localStorage\.setItem\(\'cotizaciones\', JSON\.stringify\(data\)\);\s+await Firebase\.guardar\(\'cotizaciones\', data\);',
    "Estado.cotizaciones = data; await Firebase.guardar('cotizaciones', data);", content
)


with open(path, 'w', encoding='utf-8') as f: f.write(content)
