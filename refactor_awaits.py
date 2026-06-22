import sys, re

path = r'c:\Users\jose0\Documents\NextTech\Pagina_Web\P-gina-web-1\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make Ventas methods async
content = content.replace('registrarVenta(e) {', 'async registrarVenta(e) {')
content = content.replace('eliminarVenta(id) {', 'async eliminarVenta(id) {')
content = content.replace('registrarAbono(idVenta, montoPago, metodoPago) {', 'async registrarAbono(idVenta, montoPago, metodoPago) {')
content = content.replace('manejarAbono(idVenta) {', 'async manejarAbono(idVenta) {')

# Make Inventario methods async
content = content.replace('guardarNuevoItem(e) {', 'async guardarNuevoItem(e) {')
content = content.replace('eliminarItem(sku) {', 'async eliminarItem(sku) {')
content = content.replace('guardarAjuste(e) {', 'async guardarAjuste(e) {')

# Clientes
content = content.replace('guardarNuevoCliente(e) {', 'async guardarNuevoCliente(e) {')
content = content.replace('eliminarCliente(id) {', 'async eliminarCliente(id) {')

# Gastos
content = content.replace('guardarNuevoGasto(e) {', 'async guardarNuevoGasto(e) {')
content = content.replace('eliminarGasto(id) {', 'async eliminarGasto(id) {')

# Rentabilidad
content = content.replace('guardarCosto() {', 'async guardarCosto() {')

# And simple await replacements everywhere
content = content.replace('Storage.guardarInventario();', 'await Storage.guardarInventario();')
content = content.replace('Storage.guardarVentas();', 'await Storage.guardarVentas();')
content = content.replace('Storage.guardarClientes();', 'await Storage.guardarClientes();')
content = content.replace('Storage.guardarGastos();', 'await Storage.guardarGastos();')
content = content.replace('Storage.guardarCostos();', 'await Storage.guardarCostos();')
content = content.replace('Firebase.guardar(', 'await Firebase.guardar(')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done refs")
