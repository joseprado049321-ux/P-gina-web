import sys

try:
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacement 1: cargarEmpresas
    old_empresas = '''                select.innerHTML = '<option value="super_admin">Mi Espacio Principal</option>' + 
                    snap.docs.filter(d => d.data().estado === 'aprobado')
                    .map(d => `<option value="${d.data().uid}">${d.data().email} (${d.data().nombre || 'Sin nombre'})</option>`).join('');'''
    
    new_empresas = '''                select.innerHTML = '<option value="super_admin">Mi Espacio Principal</option>' + 
                    snap.docs.filter(d => d.data().estado === 'aprobado' && d.data().rol === 'admin')
                    .map(d => `<option value="${d.id}">${d.data().email} (${d.data().nombre || 'Sin nombre'})</option>`).join('');'''

    if old_empresas in content:
        content = content.replace(old_empresas, new_empresas)
        print("Success: Replacement 1 done.")
    else:
        print("Error: String 1 not found")

    # Replacement 2: ConfiguracionNegocio.cargar
    old_storeid = '''                const activeTenant = localStorage.getItem('superAdminTenant') || localStorage.getItem('tenantId');
                if (activeTenant && window.firebaseOK) {
                    db.collection('empresas').doc(activeTenant).get().then(docSnap => {
                        if (docSnap.exists && docSnap.data().storeId) {
                            f('conf-store-id', docSnap.data().storeId);
                        }
                    }).catch(e => console.error("Error obteniendo storeId:", e));
                }'''
                
    new_storeid = '''                const activeTenant = localStorage.getItem('superAdminTenant') || localStorage.getItem('tenantId');
                if (activeTenant && window.firebaseOK) {
                    db.collection('empresas').doc(activeTenant).get().then(docSnap => {
                        if (docSnap.exists && docSnap.data().storeId) {
                            f('conf-store-id', docSnap.data().storeId);
                        } else {
                            f('conf-store-id', 'No requiere ID (Súper Admin / Tienda sin configurar)');
                        }
                    }).catch(e => {
                        console.error("Error obteniendo storeId:", e);
                        f('conf-store-id', 'Error de conexión');
                    });
                }'''

    if old_storeid in content:
        content = content.replace(old_storeid, new_storeid)
        print("Success: Replacement 2 done.")
    else:
        print("Error: String 2 not found")

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

except Exception as e:
    print(f"Error: {e}")
