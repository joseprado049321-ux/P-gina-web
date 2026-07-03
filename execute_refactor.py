import re
import os

def find_brace_end(lines, start_idx):
    # finds the matching closing brace for a block starting at start_idx
    brace_count = 0
    for i in range(start_idx, len(lines)):
        brace_count += lines[i].count('{')
        brace_count -= lines[i].count('}')
        if brace_count == 0:
            return i
    return -1

def main():
    with open('index.html', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    # 1. REFACTOR AUTH
    # Remove ADMIN_EMAIL constant
    for i, line in enumerate(lines):
        if 'ADMIN_EMAIL: "joseprado049321@gmail.com",' in line:
            lines[i] = ""
            break

    # Re-write Auth.init
    # We find init() {
    start_init = -1
    for i, line in enumerate(lines):
        if 'init() {' in line and 'if (window.firebaseOK) {' in lines[i+1]:
            start_init = i
            break
            
    if start_init != -1:
        end_init = find_brace_end(lines, start_init)
        new_init = """            init() {
                if (window.firebaseOK) {
                    firebase.auth().onAuthStateChanged(async (user) => {
                        if (user) {
                            await this.manejarAccesoSeguro(user);
                        } else {
                            this.usuarioActual = null;
                            this.esAdmin = false;
                        }
                    });
                }
                const form = document.getElementById('loginForm');
                if (form) form.addEventListener('submit', (e) => this.loginTradicional(e));
            },
"""
        for i in range(start_init, end_init + 1):
            lines[i] = ""
        lines[start_init] = new_init

    # Re-write Auth.loginTradicional
    start_login = -1
    for i, line in enumerate(lines):
        if 'async loginTradicional(e) {' in line:
            start_login = i
            break
            
    if start_login != -1:
        end_login = find_brace_end(lines, start_login)
        new_login = """            async loginTradicional(e) {
                e.preventDefault();
                const user = document.getElementById('username').value.trim();
                const pass = document.getElementById('password').value.trim();
                
                const btnSubmit = document.querySelector('#loginForm button[type="submit"]');
                const btnOriginalText = btnSubmit ? btnSubmit.innerHTML : '🚀 Ingresar';
                if (btnSubmit) { btnSubmit.innerHTML = '⏳ Verificando...'; btnSubmit.disabled = true; }

                try {
                    await firebase.auth().signInWithEmailAndPassword(user, pass);
                } catch (error) {
                    console.error(error);
                    this._notificar("❌ Usuario o clave incorrectos", "#ff5f6d");
                }
                
                if (btnSubmit) { btnSubmit.innerHTML = btnOriginalText; btnSubmit.disabled = false; }
            },
"""
        for i in range(start_login, end_login + 1):
            lines[i] = ""
        lines[start_login] = new_login

    # Add manejarAccesoSeguro where manejarAcceso was
    start_manejar = -1
    for i, line in enumerate(lines):
        if 'async manejarAcceso(user) {' in line:
            start_manejar = i
            break
            
    if start_manejar != -1:
        end_manejar = find_brace_end(lines, start_manejar)
        new_manejar = """            async manejarAccesoSeguro(user) {
                try {
                    const doc = await db.collection('usuarios_acceso').doc(user.uid).get();
                    if (doc.exists) {
                        const userData = doc.data();
                        this.esAdmin = (userData.rol === 'admin');
                        this.usuarioActual = userData;
                        if (userData.tenantId) localStorage.setItem('tenantId', userData.tenantId);
                        this.mostrarPantallaPrincipal();
                        this._notificar(`✅ Bienvenido, ${userData.nombre || user.email}`, "linear-gradient(to right,#00b09b,#96c93d)");
                    } else {
                        this.esAdmin = false;
                        this.usuarioActual = { email: user.email, uid: user.uid };
                        this.mostrarPantallaPrincipal();
                    }
                } catch(e) {
                    console.error("Error leyendo acceso:", e);
                }
            },
"""
        for i in range(start_manejar, end_manejar + 1):
            lines[i] = ""
        lines[start_manejar] = new_manejar
        
    # Remove entrarComoInvitado
    start_inv = -1
    for i, line in enumerate(lines):
        if 'entrarComoInvitado(auto = false) {' in line:
            start_inv = i
            break
    if start_inv != -1:
        end_inv = find_brace_end(lines, start_inv)
        for i in range(start_inv, end_inv + 1):
            lines[i] = ""

    # DNI API REPLACE
    # We find the fetch for DNI
    start_fetch = -1
    for i, line in enumerate(lines):
        if "fetch('https://miapi.cloud/v1/dni/' + dni" in line:
            start_fetch = i
            break
            
    if start_fetch != -1:
        # find .finally block
        end_fetch = -1
        for i in range(start_fetch, len(lines)):
            if ".finally(function () {" in lines[i]:
                # find the closing bracket of finally
                end_fetch = find_brace_end(lines, i) + 1
                # the next line should be }); 
                if lines[end_fetch].strip() == "});":
                    end_fetch = end_fetch
                break
                
        if end_fetch != -1:
            new_fetch = """            fetch('https://us-central1-' + (firebase.app().options.projectId || 'tu-proyecto') + '.cloudfunctions.net/consultarDNI', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: dni })
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                var d = data.datos || data.data || data;
                var nombres = d.nombres || '';
                var apPaterno = d.ape_paterno || d.apellidoPaterno || '';
                var apMaterno = d.ape_materno || d.apellidoMaterno || '';
                var nombreCompleto = (nombres + ' ' + apPaterno + ' ' + apMaterno).trim();
                
                if (nombreCompleto.length > 2) {
                    $('#cliente').val(nombreCompleto);
                    $('#campos-manuales-dni').slideUp(200);
                    Swal.fire({icon: 'success', title: '✅ Cliente encontrado', text: nombreCompleto, timer: 2500, showConfirmButton: false});
                } else {
                    Swal.fire({icon: 'warning', title: 'No encontrado', text: 'El DNI no devolvió resultados válidos.'});
                }
            })
            .catch(function(error) {
                console.error(error);
                Swal.fire({icon: 'error', title: 'Error', text: 'Error consultando al servidor seguro.'});
            })
            .finally(function () {
"""
            # Wait, the old finally block had content, I should keep its content. 
            # Actually, I am replacing up to the start of finally() {
            pass

    # Better logic for DNI: we replace the whole block from fetch to .finally
    # I'll just do a simpler search and replace for the DNI part
    content = "".join(lines)
    
    # DNI fetch replacement
    old_fetch_dni = r"fetch\('https://miapi\.cloud/v1/dni/' \+ dni, \{\s*headers: \{\s*'Authorization': 'Bearer ' \+ token\s*\}\s*\}\)\s*\.then\(function \(response\) \{\s*return response\.json\(\);\s*\}\)\s*\.then\(function \(data\) \{.*?\.\.\s*\}[\s\S]*?\}\)\s*\.catch\(function \(error\) \{[\s\S]*?\}\)\s*\.finally\(function \(\) \{"
    new_fetch_dni = r"""fetch('https://us-central1-' + (firebase.app().options.projectId || 'tu-proyecto') + '.cloudfunctions.net/consultarDNI', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: dni })
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                var d = data.datos || data.data || data;
                var nombres = d.nombres || '';
                var apPaterno = d.ape_paterno || d.apellidoPaterno || '';
                var apMaterno = d.ape_materno || d.apellidoMaterno || '';
                var nombreCompleto = (nombres + ' ' + apPaterno + ' ' + apMaterno).trim();
                
                if (nombreCompleto.length > 2) {
                    $('#cliente').val(nombreCompleto);
                    $('#campos-manuales-dni').slideUp(200);
                    Swal.fire({icon: 'success', title: '✅ Cliente encontrado', text: nombreCompleto, timer: 2500, showConfirmButton: false});
                } else {
                    Swal.fire({icon: 'warning', title: 'No encontrado', text: 'El DNI no devolvió resultados válidos.'});
                }
            })
            .catch(function(error) {
                console.error(error);
                Swal.fire({icon: 'error', title: 'Error', text: 'Error consultando al servidor seguro.'});
            })
            .finally(function () {"""
    
    content = re.sub(r"fetch\('https://miapi\.cloud/v1/dni/' \+ dni.*?\.finally\(function \(\) \{", new_fetch_dni, content, flags=re.DOTALL)
    
    # Remove token
    content = re.sub(r"var token = 'f4616d3f-dd18-4e08-89dc-ebc2fad3c9ba';", "", content)
    
    # REGISTRAR VENTA logic replace
    # We will split on `async registrarVenta(e) {` and then find the closing bracket
    idx = content.find("async registrarVenta(e) {")
    if idx != -1:
        # Find matching brace
        brace_count = 0
        end_idx = -1
        started = False
        for i in range(idx, len(content)):
            if content[i] == '{':
                brace_count += 1
                started = True
            elif content[i] == '}':
                brace_count -= 1
            
            if started and brace_count == 0:
                end_idx = i
                break
                
        if end_idx != -1:
            new_registrar_venta = """async registrarVenta(e) {
                e.preventDefault();
                const btnSubmit = document.querySelector('#ventaForm button[type="submit"]');
                if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = '⏳ Procesando...'; }
                
                try {
                    const sku = document.getElementById('sku').value.trim();
                    const cantidad = parseInt(document.getElementById('cantidad').value) || 1;
                    const cliente = document.getElementById('cliente').value.trim() || 'Público General';
                    const metodoPago = document.getElementById('metodo_pago') ? document.getElementById('metodo_pago').value : 'Efectivo';
                    const tenantId = localStorage.getItem('tenantId');
                    
                    const response = await fetch('https://us-central1-' + (firebase.app().options.projectId || 'tu-proyecto') + '.cloudfunctions.net/procesarVenta', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sku, cantidad, cliente, metodoPago, tenantId })
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok && result.success) {
                        Toastify({text: "✅ Venta registrada en servidor", backgroundColor: "#28a745"}).showToast();
                        document.getElementById('ventaForm').reset();
                        document.getElementById('total-display').value = 'S/0.00';
                    } else {
                        Toastify({text: "❌ Error: " + (result.error || 'Desconocido'), backgroundColor: "#dc3545"}).showToast();
                    }
                } catch (error) {
                    console.error("Error al registrar venta:", error);
                    Toastify({text: "❌ Error de conexión con el backend", backgroundColor: "#dc3545"}).showToast();
                }
                
                if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = '💰 Registrar Venta'; }
            }"""
            
            content = content[:idx] + new_registrar_venta + content[end_idx+1:]
            
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Refactor successfully done!")

if __name__ == "__main__":
    main()
