

        const GestionUsuarios = {
            async cargarTodos() {
                if (!Auth.esAdmin) return;

                if (!window.firebaseOK || (typeof Auth !== 'undefined' && Auth.modoInvitado)) return;
                try {
                    const isSuperAdmin = localStorage.getItem('superAdmin') === 'true';
                    const curTenant = localStorage.getItem('superAdminTenant') || localStorage.getItem('tenantId');
                    let query;

                    if (isSuperAdmin && (!curTenant || curTenant === 'super_admin')) {
                        // Súper Admin ve a los Dueños para aprobarlos
                        query = db.collection('usuarios_acceso').where('rol', '==', 'admin');
                    } else {
                        // Dueño normal ve a sus empleados
                        query = db.collection('usuarios_acceso').where('tenantId', '==', curTenant);
                    }
                    const snap = await query.get();

                    const todos = [];
                    snap.docs.forEach(doc => {
                        if (doc.id === curTenant || doc.id === Auth.usuarioActual?.uid) return;
                        todos.push({ id: doc.id, ...doc.data() });
                    });
                    const pendientes = todos.filter(u => u.estado === 'pendiente');
                    const aprobados = todos.filter(u => u.estado === 'aprobado');
                    const rechazados = todos.filter(u => u.estado === 'rechazado');
                    document.getElementById('usuarios-cards').innerHTML = `
                        <div class="card" style="border-left:4px solid #fd7e14;"><h3>⏳ Pendientes</h3><div class="value" style="color:#fd7e14;">${pendientes.length}</div></div>
                        <div class="card" style="border-left:4px solid #28a745;"><h3>✅ Aprobados</h3><div class="value" style="color:#28a745;">${aprobados.length}</div></div>
                        <div class="card" style="border-left:4px solid #dc3545;"><h3>🚫 Rechazados</h3><div class="value" style="color:#dc3545;">${rechazados.length}</div></div>`;
                    this._renderLista('usuarios-pendientes-lista', pendientes, 'pendiente');
                    this._renderLista('usuarios-aprobados-lista', aprobados, 'aprobado');
                    this._renderLista('usuarios-rechazados-lista', rechazados, 'rechazado');
                } catch (e) { console.error("Error cargando usuarios:", e); }
            },

            _renderLista(containerId, usuarios, tipo) {
                const esSuperAdmin = localStorage.getItem('superAdmin') === 'true';
                const c = document.getElementById(containerId);
                if (!c) return;
                if (!usuarios.length) { c.innerHTML = '<p style="text-align:center;color:#aaa;padding:15px;">Sin usuarios</p>'; return; }
                c.innerHTML = usuarios.map(u => {
                    const fecha = u.fechaSolicitud ? new Date(u.fechaSolicitud).toLocaleDateString('es-PE') : '-';
                    let botonesHtml = '';
                    if (esSuperAdmin) {
                        if (tipo === 'pendiente') botonesHtml = `<button class="btn" style="background:var(--success);padding:6px 12px;font-size:13px;" onclick="GestionUsuarios.cambiarEstado('${u.id}','aprobado')">✅ Aprobar</button><button class="btn btn-danger" style="padding:6px 12px;font-size:13px;margin-left:8px;" onclick="GestionUsuarios.cambiarEstado('${u.id}','rechazado')">🚫 Rechazar</button>`;
                        else if (tipo === 'aprobado') botonesHtml = `<button class="btn btn-danger" style="padding:6px 12px;font-size:13px;" onclick="GestionUsuarios.cambiarEstado('${u.id}','rechazado')">🚫 Revocar</button>`;
                        else botonesHtml = `<button class="btn" style="background:var(--success);padding:6px 12px;font-size:13px;" onclick="GestionUsuarios.cambiarEstado('${u.id}','aprobado')">✅ Aprobar</button>`;
                    }
                    const botonesAdmin = esSuperAdmin ? `
                        <button class="btn" style="background:var(--warning); color:#000; padding:6px 12px; font-size:13px;" onclick="GestionUsuarios.editarRol('${u.id}')">✏️ Editar</button>
                        <button class="btn btn-danger" style="padding:6px 12px; font-size:13px;" onclick="GestionUsuarios.eliminarFirebase('${u.id}', '${u.nombre || u.email || u.username}')">🗑️ Eliminar</button>
                    ` : '';
                    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;flex-wrap:wrap;gap:10px;color:var(--text-primary);">
                        <div><div style="font-weight:700;color:var(--text-primary);">${u.nombre || 'Sin nombre'}</div><div style="font-size:0.85em;color:var(--text-secondary);">📧 ${u.email || u.username || 'Sin email'}</div><div style="font-size:0.8em;color:var(--text-secondary);">📅 ${fecha}</div></div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">${botonesHtml}${botonesAdmin}</div></div>`;
                }).join('');
            },
            async cambiarEstado(uid, nuevoEstado) {
                if (localStorage.getItem('superAdmin') !== 'true') { Swal.fire('⛔ Acceso Denegado', 'Solo el administrador principal (joseprado049321@gmail.com) tiene permiso para eliminar usuarios o modificar accesos.', 'error'); return; }
                const result = await Swal.fire({ title: nuevoEstado === 'aprobado' ? '✅ ¿Aprobar acceso?' : '🚫 ¿Rechazar acceso?', icon: 'question', showCancelButton: true, confirmButtonColor: nuevoEstado === 'aprobado' ? '#28a745' : '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, confirmar', cancelButtonText: 'Cancelar' });
                if (!result.isConfirmed) return;
                try {
                    await db.collection('usuarios_acceso').doc(uid).update({ estado: nuevoEstado, fechaRespuesta: new Date().toISOString() });
                    Toastify({ text: nuevoEstado === 'aprobado' ? '✅ Usuario aprobado' : '🚫 Usuario rechazado', duration: 3000, gravity: 'top', position: 'right', backgroundColor: nuevoEstado === 'aprobado' ? 'linear-gradient(to right,#28a745,#20c997)' : 'linear-gradient(to right,#dc3545,#c82333)' }).showToast();
                    this.cargarTodos();
                } catch (e) { Swal.fire('Error', e.message, 'error'); }
            },
            async eliminarFirebase(uid, nombreMostrar) {
                if (localStorage.getItem('superAdmin') !== 'true') { Swal.fire('⛔ Acceso Denegado', 'Solo el administrador principal (joseprado049321@gmail.com) tiene permiso para eliminar usuarios o modificar accesos.', 'error'); return; }
                const result = await Swal.fire({ title: `🗑️ ¿Eliminar a ${nombreMostrar}?`, text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
                if (!result.isConfirmed) return;
                try {
                    await db.collection('usuarios_acceso').doc(uid).delete();
                    Toastify({ text: `🗑️ Usuario eliminado`, duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#dc3545,#c82333)' }).showToast();
                    this.cargarTodos();
                } catch (e) { Swal.fire('Error', e.message, 'error'); }
            },
            async editarRol(id) {
                if (localStorage.getItem('superAdmin') !== 'true') { Swal.fire('⛔ Denegado', 'Solo Súper Admin', 'error'); return; }
                try {
                    const docRef = db.collection('usuarios_acceso').doc(id);
                    const docSnap = await docRef.get();
                    if (!docSnap.exists) return;
                    const data = docSnap.data();
                    const rolActual = data.rol || 'empleado';
                    const modulosGuardados = data.modulos || [];
                    const isChecked = (mod) => modulosGuardados.includes(mod) ? 'checked' : '';

                    const { value: formValues } = await Swal.fire({
                        title: '✏️ Editar Acceso',
                        html: `
                            <select id="swal-edit-rol" class="swal2-input" style="width:100%; margin-bottom:15px;" onchange="document.getElementById('edit-modulos-container').style.display = this.value === 'empleado' ? 'block' : 'none';">
                                <option value="empleado" ${rolActual === 'empleado' ? 'selected' : ''}>Empleado / Vendedor</option>
                                <option value="admin" ${rolActual === 'admin' ? 'selected' : ''}>Administrador</option>
                            </select>
                            <div id="edit-modulos-container" style="display:${rolActual === 'empleado' ? 'block' : 'none'}; border:1px solid var(--border); border-radius:8px; padding:12px; background:var(--bg-surface-hover); text-align:left;">
                                <label style="font-weight:600;display:block;margin-bottom:8px;font-size:13px;color:#2B56A5;">✅ Módulos permitidos:</label>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:13px;">
                                    <label><input type="checkbox" value="registro" class="swal-edit-modulos" ${isChecked('registro')}> 📝 Registro</label>
                                    <label><input type="checkbox" value="historial" class="swal-edit-modulos" ${isChecked('historial')}> 📋 Historial</label>
                                    <label><input type="checkbox" value="inventario" class="swal-edit-modulos" ${isChecked('inventario')}> 📦 Inventario</label>
                                    <label><input type="checkbox" value="ordenes-servicio" class="swal-edit-modulos" ${isChecked('ordenes-servicio')}> 🔧 Órdenes Serv.</label>
                                    <label><input type="checkbox" value="cuentas-cobrar" class="swal-edit-modulos" ${isChecked('cuentas-cobrar')}> 💰 Ctas. Cobrar</label>
                                    <label><input type="checkbox" value="clientes" class="swal-edit-modulos" ${isChecked('clientes')}> 👥 Clientes</label>
                                    <label><input type="checkbox" value="cierre-caja" class="swal-edit-modulos" ${isChecked('cierre-caja')}> 🏧 Cierre Caja</label>
                                </div>
                            </div>`,
                        showCancelButton: true, confirmButtonText: '💾 Guardar Cambios',
                        preConfirm: () => {
                            const rol = document.getElementById('swal-edit-rol').value;
                            const modulos = Array.from(document.querySelectorAll('.swal-edit-modulos:checked')).map(cb => cb.value);
                            return { rol, modulos };
                        }
                    });

                    if (!formValues) return;
                    await docRef.update({ rol: formValues.rol, modulos: formValues.rol === 'empleado' ? formValues.modulos : [] });
                    Toastify({ text: '✅ Accesos actualizados', duration: 3000, backgroundColor: '#28a745' }).showToast();
                    this.cargarTodos();
                } catch (e) { Swal.fire('❌ Error', 'Hubo un error de conexión.', 'error'); }
            },
            mostrarModalAgregarLocal() {
                const esSuperAdmin = localStorage.getItem('superAdmin') === 'true';
                Swal.fire({
                    title: '➕ Nuevo Usuario Local',
                    html: `
                        <div style="text-align:left;margin-bottom:10px;">
                            <label style="font-weight:600;display:block;margin-bottom:4px;">👤 Nombre de usuario</label>
                            <input id="swal-new-username" class="swal2-input" placeholder="Ej: Juan" style="margin:0 0 12px 0;width:100%;">
                            <label style="font-weight:600;display:block;margin-bottom:4px;">🔒 Contraseña</label>
                            <input id="swal-new-password" type="password" class="swal2-input" placeholder="Contraseña segura" style="margin:0 0 12px 0;width:100%;">
                            <label style="font-weight:600;display:block;margin-bottom:4px;">🎭 Rol del Usuario</label>
                            <select id="swal-new-rol" class="swal2-input" style="margin:0 0 12px 0;width:100%;" onchange="document.getElementById('modulos-container').style.display = this.value === 'empleado' ? 'block' : 'none';">
                                <option value="empleado">Empleado / Vendedor</option>
                                ${esSuperAdmin ? '<option value="admin">Administrador</option>' : ''}
                            </select>
                            <div id="modulos-container" style="border:1px solid var(--border); border-radius:8px; padding:12px; background:var(--bg-surface-hover);">
                                <label style="font-weight:600;display:block;margin-bottom:8px;font-size:13px;color:#2B56A5;">✅ Módulos permitidos (Solo Empleado):</label>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:13px;">
                                    <label><input type="checkbox" value="registro" class="swal-modulos" checked> 📝 Registro</label>
                                    <label><input type="checkbox" value="historial" class="swal-modulos" checked> 📋 Historial</label>
                                    <label><input type="checkbox" value="inventario" class="swal-modulos" checked> 📦 Inventario</label>
                                    <label style="${localStorage.getItem('giroNegocio') === 'general' ? 'display:none;' : ''}"><input type="checkbox" value="ordenes-servicio" class="swal-modulos"> 🔧 Órdenes Serv.</label>
                                    <label><input type="checkbox" value="cuentas-cobrar" class="swal-modulos"> 💰 Ctas. Cobrar</label>
                                    <label><input type="checkbox" value="clientes" class="swal-modulos"> 👥 Clientes</label>
                                    <label><input type="checkbox" value="cierre-caja" class="swal-modulos"> 🏧 Cierre Caja</label>
                                    <label><input type="checkbox" value="cotizaciones" class="swal-modulos"> 📄 Cotizaciones</label>
                                    <label><input type="checkbox" value="devoluciones" class="swal-modulos"> ↩️ Devoluciones</label>
                                </div>
                            </div>
                        </div>`,
                    showCancelButton: true,
                    confirmButtonColor: '#2B56A5',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: '✅ Crear usuario',
                    cancelButtonText: 'Cancelar',
                    focusConfirm: false,
                    preConfirm: () => {
                        const username = document.getElementById('swal-new-username').value.trim();
                        const password = document.getElementById('swal-new-password').value.trim();
                        const rol = document.getElementById('swal-new-rol').value;
                        const modulos = Array.from(document.querySelectorAll('.swal-modulos:checked')).map(cb => cb.value);

                        if (!username || !password) { Swal.showValidationMessage('⚠️ Completa ambos campos'); return false; }
                        if (password.length < 6) { Swal.showValidationMessage('⚠️ La contraseña debe tener al menos 6 caracteres'); return false; }
                        if (rol === 'empleado' && modulos.length === 0) { Swal.showValidationMessage('⚠️ Selecciona al menos un módulo de acceso'); return false; }

                        return { username, password, rol, modulos };
                    }
                }).then(async result => {
                    if (!result.isConfirmed) return;
                    const { username, password, rol, modulos } = result.value;
                    try {
                        // Verificar si ya existe en Firebase
                        const existe = await db.collection('usuarios_acceso').where('username', '==', username).get();
                        if (!existe.empty) { Swal.fire('❌ Error', 'El usuario ya existe.', 'error'); return; }

                        const fakeEmail = `${username.toLowerCase().replace(/\s+/g, '')}@local.app`;

                        // Utilizar una instancia secundaria para crear el usuario sin desloguear al Admin
                        let secondaryApp = firebase.apps.find(app => app.name === 'SecondaryApp');
                        if (!secondaryApp) {
                            secondaryApp = firebase.initializeApp(firebase.app().options, 'SecondaryApp');
                        }
                        
                        const userCred = await secondaryApp.auth().createUserWithEmailAndPassword(fakeEmail, password);
                        await secondaryApp.auth().signOut();
                        await secondaryApp.delete(); // IMPORTANTE: Limpiar la instancia para evitar conflictos de sesiones ocultas

                        const tenantId = localStorage.getItem('superAdminTenant') || localStorage.getItem('tenantId') || 'demo';
                        let storeId = null;
                        if (Auth.usuarioActual && Auth.usuarioActual.storeId) {
                            storeId = Auth.usuarioActual.storeId;
                        }

                        await db.collection('usuarios_acceso').doc(userCred.user.uid).set({
                            tipo: 'local',
                            nombre: username,
                            username: username,
                            rol: rol,
                            modulos: rol === 'empleado' ? modulos : [],
                            estado: 'aprobado', // Los creados por el admin nacen aprobados
                            tenantId: tenantId,
                            storeId: storeId, // Agregado para robustez
                            fechaSolicitud: new Date().toISOString()
                        });
                        Toastify({ text: `✅ Usuario "${username}" guardado en la nube de forma segura`, duration: 3000, backgroundColor: '#28a745' }).showToast();
                        this.cargarTodos();
                    } catch (error) {
                        console.error(error);
                        const secApp = firebase.apps.find(app => app.name === 'SecondaryApp');
                        if (secApp) await secApp.delete();
                        
                        if (error.code === 'auth/email-already-in-use') {
                            Swal.fire('❌ Nombre Ocupado', 'Este nombre de usuario ya está registrado en la plataforma por otra tienda. Por favor elige uno más específico (Ej: "juan_mitienda").', 'error');
                        } else {
                            Swal.fire('❌ Error', 'No se pudo guardar en la nube: ' + error.message, 'error');
                        }
                    }
                });

            }
        };
        // ========================================
        // MÓDULO: CONFIGURACIÓN
        // ========================================
        const SuperAdmin = {
            async borrarParcial() {
                const conf = await Swal.fire({ title: '¿Estás seguro?', text: 'Se borrarán ventas, inventario, clientes, etc. PERO se mantendrá Configuración y Usuarios. (Aplica en Local y Nube)', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, borrar parcial', confirmButtonColor: '#ffc107', cancelButtonText: 'Cancelar' });
                if (!conf.isConfirmed) return;
                
                Estado.ventas = []; Estado.inventario = []; Estado.clientes = []; Estado.gastos = [];
                Estado.costosProductos = []; Estado.ordenesServicio = []; Estado.proveedores = [];
                Estado.compras = []; Estado.devoluciones = []; Estado.cotizaciones = []; Estado.cierreCaja = [];
                
                const subcolecciones = ['ventas', 'inventario', 'clientes', 'gastos'];
                const docsGlobales = ['costosProductos', 'ordenesServicio', 'proveedores', 'compras', 'devoluciones', 'cotizaciones', 'cierreCaja'];
                const tenantId = localStorage.getItem('superAdminTenant') || localStorage.getItem('tenantId') || 'demo';
                const tenantRef = db.collection('empresas').doc(tenantId);
                
                if (window.firebaseOK) {
                    // 1. Borrar subcolecciones (inventario, ventas, etc.)
                    for (const c of subcolecciones) {
                        try {
                            const snap = await tenantRef.collection(c).get();
                            let chunks = [];
                            for (let i = 0; i < snap.docs.length; i += 450) chunks.push(snap.docs.slice(i, i + 450));
                            for (const chunk of chunks) {
                                const batch = db.batch();
                                chunk.forEach(doc => batch.delete(doc.ref));
                                await batch.commit();
                            }
                        } catch (e) { console.error(`Error borrando subcolección ${c}`, e); }
                    }
                    
                    // 2. Borrar documentos globales del tenant (campos de la base de datos masivos viejos)
                    try {
                        const batch = db.batch();
                        docsGlobales.forEach(docName => batch.delete(tenantRef.collection('global').doc(docName))); // Placeholder en caso de que existan global docs
                    } catch (e) { }
                }
                UI.actualizarVistas();
                Swal.fire('✅ Éxito', 'Se limpiaron los datos. Configuración y usuarios permanecen intactos.', 'success');
            },
            async borrarTotal() {
                const conf = await Swal.fire({ title: '⚠️ BORRADO TOTAL', text: 'Se borrará ABSOLUTAMENTE TODO incluyendo Usuarios y Configuración.', icon: 'error', showCancelButton: true, confirmButtonText: 'Sí, DESTRUIR TODO', confirmButtonColor: '#dc3545', cancelButtonText: 'Cancelar' });
                if (!conf.isConfirmed) return;
                
                const subcolecciones = ['ventas', 'inventario', 'clientes', 'gastos'];
                const tenantId = localStorage.getItem('superAdminTenant') || localStorage.getItem('tenantId') || 'demo';
                const tenantRef = db.collection('empresas').doc(tenantId);
                
                if (window.firebaseOK) {
                    for (const c of subcolecciones) {
                        try {
                            const snap = await tenantRef.collection(c).get();
                            let chunks = [];
                            for (let i = 0; i < snap.docs.length; i += 450) chunks.push(snap.docs.slice(i, i + 450));
                            for (const chunk of chunks) {
                                const batch = db.batch();
                                chunk.forEach(doc => batch.delete(doc.ref));
                                await batch.commit();
                            }
                        } catch (e) { console.error(`Error borrando subcolección ${c}`, e); }
                    }
                    try { await tenantRef.delete(); } catch(e) {}
                }
                localStorage.clear();
                window.location.reload();
            }
        };

        const ConfiguracionNegocio = {
            cambiarEscala(escala) {
                // Restaurar estilos en caso de que se haya usado transform previamente
                document.body.style.transform = '';
                document.body.style.transformOrigin = '';
                document.body.style.width = '';
                document.body.style.height = '';
                
                // Aplicar el zoom nativo
                document.body.style.zoom = escala;
                localStorage.setItem('lispro_escala', escala);
                Toastify({ text: `🔍 Escala cambiada a ${escala}`, duration: 2000, style: { background: 'linear-gradient(135deg,#3B82F6,#2563EB)' } }).showToast();
            },
            aplicarColor(hex) {
                let styleEl = document.getElementById('custom-theme-style');
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = 'custom-theme-style';
                    document.head.appendChild(styleEl);
                }
                if (!hex || hex.toUpperCase() === '#2B56A5') {
                    styleEl.innerHTML = '';
                    return;
                }
                // Calcular una variante más oscura para los degradados
                let c = hex.substring(1);
                let r = Math.max(0, parseInt(c.substring(0, 2), 16) - 35).toString(16).padStart(2, '0');
                let g = Math.max(0, parseInt(c.substring(2, 4), 16) - 35).toString(16).padStart(2, '0');
                let b = Math.max(0, parseInt(c.substring(4, 6), 16) - 35).toString(16).padStart(2, '0');
                let dark = '#' + r + g + b;

                styleEl.innerHTML = `
                    :root {
                        --primary: ${hex} !important;
                        --primary-dark: ${dark} !important;
                        --bg-header: linear-gradient(135deg, ${dark} 0%, ${hex} 100%) !important;
                        --bg-sidebar-hd: linear-gradient(135deg, ${dark} 0%, ${hex} 100%) !important;
                        --bg-thead: linear-gradient(135deg, ${dark} 0%, ${hex} 100%) !important;
                    }
                    [data-theme="dark"] {
                        --primary: ${hex} !important;
                        --primary-dark: ${dark} !important;
                    }
                `;
            },
            adaptarRubro(rubro) {

                // ========================================
                // Lógica del Modo Híbrido (Cobro Rápido)
                // ========================================
                const btnSubmitText = document.getElementById('btn-submit-text');
                const btnToggleAdv = document.getElementById('btn-toggle-avanzado');
                const camposAdv = document.getElementById('pos-campos-avanzados');
                const panelSkuBotones = document.querySelector('#sku') ? document.querySelector('#sku').nextElementSibling : null;

                if (btnSubmitText && btnToggleAdv && camposAdv) {
                    const modosRapidos = ['general', 'minimarket', 'restaurante', 'farmacia', 'ferreteria', 'abarrotes'];
                    if (modosRapidos.includes(rubro)) {
                        btnToggleAdv.style.display = 'block';
                        camposAdv.style.display = 'none';
                        btnSubmitText.textContent = '💵 COBRAR (Enter)';
                        btnSubmitText.parentElement.style.background = 'linear-gradient(135deg, #28a745, #15803D)';
                        if (panelSkuBotones) panelSkuBotones.style.display = 'none';
                    } else {
                        btnToggleAdv.style.display = 'none';
                        camposAdv.style.display = 'block';
                        btnSubmitText.textContent = '💾 Guardar Venta';
                        btnSubmitText.parentElement.style.background = '';
                        if (panelSkuBotones) panelSkuBotones.style.display = 'flex';
                    }
                }

                // Buscar el botón o pestaña de Ordenes de Servicio en la barra lateral
                const tabSoporte = document.getElementById('sidebarTab-ordenes-servicio');

                if (tabSoporte) {
                    if (rubro === 'general') {
                        tabSoporte.style.setProperty('display', 'none', 'important');
                        // Si la pestaña actual es Órdenes de Servicio, cambiar a otra
                        if (typeof SidebarMenu !== 'undefined' && SidebarMenu.currentTab === 'ordenes-servicio') {
                            SidebarMenu.selectTab('registro');
                        }
                    } else {
                        // Si el usuario actual tiene permisos, se vuelve a mostrar
                        if (typeof Auth !== 'undefined' && (Auth.esAdmin || Auth.usuarioActual?.permisos?.['ordenes-servicio'])) {
                            tabSoporte.style.display = 'flex';
                        }
                    }
                }

                // Actualizar sugerencias del SkuGen al instante
                if (typeof SkuGen !== 'undefined') {
                    SkuGen.actualizarSugerencias();
                }

                // Recargar las categorías dinámicamente cada vez que se cambia de rubro
                if (typeof CategoriaCustom !== 'undefined' && typeof CategoriaCustom.cargarEnSelect === 'function') {
                    CategoriaCustom.cargarEnSelect();
                }
                if (typeof MarcasCustom !== 'undefined' && typeof MarcasCustom.cargarEnSelect === 'function') {
                    MarcasCustom.cargarEnSelect();
                }
                if (typeof MetodoPagoCustom !== 'undefined' && typeof MetodoPagoCustom.cargarEnSelect === 'function') {
                    MetodoPagoCustom.cargarEnSelect();
                }
            },
            cargar() {
                const data = (typeof Estado !== 'undefined' && Estado.configuracion) ? Estado.configuracion : {
                    giro: 'tecnico', colorPrincipal: '#2B56A5', nombre: 'Mi Negocio', propietario: '', direccion: '', documento: '', telefono: '', mensaje: '¡Gracias por su preferencia!'
                };
                const f = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
                f('config-giro-negocio', data.giro); f('conf-nombre', data.nombre); f('conf-propietario', data.propietario);
                f('conf-direccion', data.direccion); f('conf-documento', data.documento); f('conf-telefono', data.telefono);
                f('conf-mensaje', data.mensaje); f('conf-color', data.colorPrincipal);
                f('conf-backup-freq', data.respaldoFrecuencia || '1');

                const activeTenant = localStorage.getItem('superAdminTenant') || localStorage.getItem('tenantId');
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
                }
                
                const pAdmin = document.getElementById('panel-superadmin');
                if (pAdmin) {
                    pAdmin.style.display = localStorage.getItem('superAdmin') === 'true' ? 'block' : 'none';
                }


                this.adaptarRubro(data.giro);
                if (this.aplicarColor) this.aplicarColor(data.colorPrincipal);
                return data;
            },
            async guardar() {
                const nombre = document.getElementById('conf-nombre').value.trim();
                if (!nombre) { Swal.fire('Error', 'El nombre del negocio es obligatorio', 'error'); return; }
                Estado.configuracion = {
                    giro: document.getElementById('config-giro-negocio').value,
                    colorPrincipal: document.getElementById('conf-color') ? document.getElementById('conf-color').value : '#2B56A5',
                    nombre: nombre,
                    propietario: document.getElementById('conf-propietario').value.trim(),
                    direccion: document.getElementById('conf-direccion').value.trim(),
                    documento: document.getElementById('conf-documento').value.trim(),
                    telefono: document.getElementById('conf-telefono').value.trim(),
                    mensaje: document.getElementById('conf-mensaje').value.trim(),
                    respaldoFrecuencia: document.getElementById('conf-backup-freq').value
                };
                await Firebase.guardar('configuracion', Estado.configuracion);
                Toastify({ text: '✅ Configuración guardada en la nube', duration: 3000, backgroundColor: '#28a745' }).showToast();
            }
        };



        const Papelera = {
            cargar() { return Estado.papelera || []; },
            async guardar(data) { Estado.papelera = data; await Firebase.guardar('papelera', data); },
            async moverA(modulo, item, descripcion) {
                const p = this.cargar();
                p.unshift({ idPapelera: Date.now().toString(), modulo, descripcion, fechaBorrado: new Date().toISOString(), itemData: item });
                await this.guardar(p);
            },
            async recuperar(idPapelera) {
                const p = this.cargar();
                const idx = p.findIndex(x => x.idPapelera === idPapelera);
                if (idx === -1) return;
                const registro = p[idx];
                if (Array.isArray(Estado[registro.modulo])) {
                    Estado[registro.modulo].unshift(registro.itemData);
                    
                    // Si el módulo soporta guardado atómico (subcolecciones)
                    let agregado = false;
                    if (registro.modulo === 'ventas' && typeof Storage.agregarVenta === 'function') { await Storage.agregarVenta(registro.itemData); agregado = true; }
                    else if (registro.modulo === 'inventario' && typeof Storage.agregarProducto === 'function') { await Storage.agregarProducto(registro.itemData); agregado = true; }
                    else if (registro.modulo === 'clientes' && typeof Storage.agregarCliente === 'function') { await Storage.agregarCliente(registro.itemData); agregado = true; }
                    else if (registro.modulo === 'gastos' && typeof Storage.agregarGasto === 'function') { await Storage.agregarGasto(registro.itemData); agregado = true; }
                    
                    if (!agregado) {
                        const capitalizado = registro.modulo.charAt(0).toUpperCase() + registro.modulo.slice(1);
                        if (typeof Storage[`guardar${capitalizado}`] === 'function') await Storage[`guardar${capitalizado}`]();
                        else await Firebase.guardar(registro.modulo, Estado[registro.modulo]);
                    }
                }
                p.splice(idx, 1); await this.guardar(p);
                this.actualizarVista();
                Toastify({ text: '✅ Elemento recuperado', duration: 3000, backgroundColor: '#28a745' }).showToast();
                UI.actualizarVistas();
            },
            async borrarDefinitivo(idPapelera) {
                const result = await Swal.fire({ title: '¿Borrar para siempre?', text: 'Esta acción no tiene reversa.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545' });
                if (!result.isConfirmed) return;
                const p = this.cargar().filter(x => x.idPapelera !== idPapelera);
                await this.guardar(p); this.actualizarVista();
            },
            async vaciarTodo() {
                const result = await Swal.fire({ title: '¿Vaciar papelera?', text: 'Se perderán todos los elementos.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545' });
                if (!result.isConfirmed) return;
                await this.guardar([]); this.actualizarVista();
            },
            actualizarVista() {
                const c = document.getElementById('tabla-papelera'); if (!c) return;
                const p = this.cargar();
                if (!p.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">La papelera está vacía.</p>'; return; }
                c.innerHTML = `<table><thead><tr><th>Fecha Borrado</th><th>Módulo</th><th>Descripción del Elemento</th><th>Acciones</th></tr></thead><tbody>` +
                    p.map(x => {
                        const [y, m, d] = x.fechaBorrado.slice(0, 10).split('-');
                        return `<tr><td>${d}/${m}/${y}</td><td><span class="badge badge-info">${x.modulo.toUpperCase()}</span></td>
                            <td style="font-weight:600;">${x.descripcion}</td>
                            <td><button class="small-btn" onclick="Papelera.recuperar('${x.idPapelera}')" style="background:var(--success);">♻️ Recuperar</button>
                            <button class="delete-btn" onclick="Papelera.borrarDefinitivo('${x.idPapelera}')">🗑️</button></td></tr>`;
                    }).join('') + `</tbody></table>`;
            }
        };

        const BackupManager = {
            verificarRespaldoDiario() {
                if (Auth.esAdmin && localStorage.getItem('superAdmin') !== 'true') {
                    const frec = parseInt((Estado.configuracion || {}).respaldoFrecuencia) || 1;
                    if (frec === 0) return;
                    const hoy = new Date().toISOString().slice(0, 10);
                    const ultimo = localStorage.getItem('ultimoRespaldoDiario');
                    if (!ultimo || Math.floor((new Date(hoy) - new Date(ultimo)) / (1000 * 60 * 60 * 24)) >= frec) {
                        setTimeout(() => {
                            Swal.fire({ title: '🛡️ Copia de Seguridad', text: 'Es momento de hacer un respaldo de seguridad de tu tienda.', icon: 'info', showCancelButton: true, confirmButtonText: '💾 Descargar', cancelButtonText: 'Saltar', confirmButtonColor: '#2B56A5' })
                                .then(r => { localStorage.setItem('ultimoRespaldoDiario', hoy); if (r.isConfirmed) this.descargarRespaldoLocal(); });
                        }, 3500);
                    }
                }
            },
            descargarRespaldoLocal() {
                const nombre = (Estado.configuracion?.nombre || 'Tienda').replace(/[^a-z0-9]/gi, '_');
                const datos = { metadata: { fecha: new Date().toISOString(), tipo: 'Local_Tenant' }, ventas: Estado.ventas, inventario: Estado.inventario, clientes: Estado.clientes, gastos: Estado.gastos, costos: Estado.costosProductos, ordenes: Estado.ordenesServicio, compras: Estado.compras, proveedores: Estado.proveedores, cotizaciones: Estado.cotizaciones, cierres: Estado.cierresCaja, devoluciones: Estado.devoluciones, configuracion: Estado.configuracion, papelera: Estado.papelera };
                const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Respaldo_${nombre}_${new Date().toISOString().slice(0, 10)}.json`; a.click();
            },
            async descargarRespaldoGlobal() {
                if (localStorage.getItem('superAdmin') !== 'true') return;
                const btn = document.getElementById('btn-respaldo-global');
                const ot = btn.innerHTML; btn.innerHTML = '⏳ Extrayendo...'; btn.disabled = true;
                try {
                    const bk = { metadata: { fecha: new Date().toISOString(), version: "1.0", sistema: "LisPro POS" }, usuarios: [], empresas: {} };
                    const users = await db.collection('usuarios_acceso').get();
                    users.forEach(doc => bk.usuarios.push({ id: doc.id, ...doc.data() }));
                    const empresas = await db.collection('empresas').get();
                    for (const doc of empresas.docs) {
                        const tId = doc.id; bk.empresas[tId] = { info: doc.data(), colecciones: {} };
                        for (const col of ['ventas', 'inventario', 'clientes', 'gastos', 'costos', 'ordenesServicio', 'proveedores', 'compras', 'devoluciones', 'cotizaciones', 'cierresCaja', 'configuracion', 'papelera']) {
                            const cSnap = await db.collection('empresas').doc(tId).collection('datos').doc(col).get();
                            if (cSnap.exists) bk.empresas[tId].colecciones[col] = cSnap.data().datos || cSnap.data().data;
                        }
                    }
                    const blob = new Blob([JSON.stringify(bk, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `LisProPOS_MasterBackup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
                    Swal.fire('✅ Respaldo Maestro Exitoso', 'Se extrajo la copia de todas las tiendas.', 'success');
                } catch (e) { Swal.fire('Error', e.message, 'error'); } finally { btn.innerHTML = ot; btn.disabled = false; }
            },
            restaurarTenant(event) {
                const file = event.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const datos = JSON.parse(e.target.result);
                        if (datos.metadata?.tipo !== 'Local_Tenant') throw new Error('Archivo de respaldo inválido.');
                        const r = await Swal.fire({ title: '⚠️ REEMPLAZAR DATOS', text: 'Se sobrescribirá TODA la base de la tienda actual. ¿Seguro?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545' });
                        if (!r.isConfirmed) return;
                        Swal.fire({ title: 'Restaurando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
                        for (const col of ['ventas', 'inventario', 'clientes', 'gastos', 'costos', 'ordenes', 'proveedores', 'compras', 'devoluciones', 'cotizaciones', 'cierres', 'configuracion', 'papelera']) {
                            if (datos[col]) await Firebase.guardar(col === 'ordenes' ? 'ordenesServicio' : col === 'costos' ? 'costos' : col === 'cierres' ? 'cierresCaja' : col, datos[col]);
                        }
                        await Swal.fire('✅ Éxito', 'Tienda restaurada por completo.', 'success'); location.reload();
                    } catch (err) { Swal.fire('Error', err.message, 'error'); }
                }; reader.readAsText(file); event.target.value = '';
            }
        };

        const Gastos = {
            mostrarFormNuevoGasto() { document.getElementById('form-nuevo-gasto').classList.remove('hidden'); document.getElementById('nuevo-gasto-fecha').valueAsDate = new Date(); },
            cancelarNuevoGasto() { document.getElementById('form-nuevo-gasto').classList.add('hidden'); },
            async guardarNuevoGasto() {
                const fecha = document.getElementById('nuevo-gasto-fecha').value;
                const categoria = document.getElementById('nuevo-gasto-categoria').value;
                const descripcion = document.getElementById('nuevo-gasto-descripcion').value.trim();
                const monto = parseFloat(document.getElementById('nuevo-gasto-monto').value) || 0;
                if (!fecha || !categoria || !descripcion || monto <= 0) { Swal.fire('Error', 'Completa todos los campos obligatorios', 'error'); return; }
                const nuevoGasto = { id: Date.now().toString(), fecha, categoria, descripcion, monto, proveedor: document.getElementById('nuevo-gasto-proveedor').value.trim(), comprobante: document.getElementById('nuevo-gasto-comprobante').value.trim(), recurrente: document.getElementById('nuevo-gasto-recurrente').checked, notas: document.getElementById('nuevo-gasto-notas').value.trim(), createdAt: new Date().toISOString() };
                Estado.gastos.push(nuevoGasto);
                await Storage.agregarGasto(nuevoGasto);
                this.cancelarNuevoGasto();
                this.renderizarLista();
                Toastify({ text: '✅ Gasto registrado', duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#dc3545,#c82333)' }).showToast();
            },
            renderizarLista() {
                const resumen = document.getElementById('resumen-gastos');
                const lista = document.getElementById('lista-gastos');
                if (!lista) return;
                const gastos = Estado.gastos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
                const mesActual = new Date().getMonth();
                const gastosMes = gastos.filter(g => new Date(g.fecha).getMonth() === mesActual);
                const totalMes = gastosMes.reduce((s, g) => s + g.monto, 0);
                const totalVentas = Estado.ventas.reduce((s, v) => s + v.total, 0);
                if (resumen) resumen.innerHTML = `
                    <div class="card" style="border-left:4px solid #dc3545;"><h3>💸 Total Gastos</h3><div class="value" style="color:#dc3545;">S/${totalGastos.toFixed(2)}</div></div>
                    <div class="card" style="border-left:4px solid #fd7e14;"><h3>📅 Gastos del Mes</h3><div class="value" style="color:#fd7e14;">S/${totalMes.toFixed(2)}</div></div>
                    <div class="card" style="border-left:4px solid #28a745;"><h3>📊 Utilidad Neta</h3><div class="value" style="color:${totalVentas - totalGastos >= 0 ? '#28a745' : '#dc3545'};">S/${(totalVentas - totalGastos).toFixed(2)}</div></div>`;
                if (!gastos.length) { lista.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">No hay gastos registrados.</p>'; return; }
                lista.innerHTML = gastos.map(g => {
                    const [y, m, d] = g.fecha.split('-');
                    const catClass = g.categoria.toLowerCase().replace(/\s+/g, '-');
                    return `<div class="gasto-item">
                        <div>
                            <span class="gasto-categoria ${catClass}">${g.categoria}</span>
                            <div style="font-weight:600;margin-top:6px;">${g.descripcion}</div>
                            <div style="font-size:0.85em;color:#666;margin-top:3px;">📅 ${d}/${m}/${y}${g.proveedor ? ` · ${g.proveedor}` : ''}${g.comprobante ? ` · ${g.comprobante}` : ''}${g.recurrente ? ' 🔁' : ''}</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:1.3em;font-weight:700;color:#dc3545;">S/${g.monto.toFixed(2)}</span>
                            <button class="delete-btn" onclick="Gastos.eliminar(${g.id})">🗑️</button>
                        </div>
                    </div>`;
                }).join('');
            },
            async eliminar(id) {
                const r = await Swal.fire({ title: '¿Eliminar gasto?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
                if (!r.isConfirmed) return;
                const itemABorrar = Estado.gastos.find(g => g.id === id);
                if (itemABorrar) await Papelera.moverA('gastos', itemABorrar, `Gasto: ${itemABorrar.descripcion} (S/ ${itemABorrar.monto})`);
                Estado.gastos = Estado.gastos.filter(g => g.id !== id);
                await Storage.eliminarGasto(id);
                this.renderizarLista();
            },
            exportarGastos() {
                if (!Estado.gastos.length) return Swal.fire('Sin datos', 'No hay gastos', 'info');
                const ws = XLSX.utils.json_to_sheet(Estado.gastos.map(g => ({ Fecha: g.fecha, Categoría: g.categoria, Descripción: g.descripcion, Monto: g.monto, Proveedor: g.proveedor || '-', Comprobante: g.comprobante || '-', Recurrente: g.recurrente ? 'Sí' : 'No' })));
                const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
                XLSX.writeFile(wb, `Gastos_${new Date().toISOString().slice(0, 10)}.xlsx`);
            }
        };

        const Rentabilidad = {
            actualizar() {
                const transacciones = window.obtenerDatosFiltradosGlobales();
                const gastos = Estado.gastos;
                const costos = Estado.costosProductos;
                const ingresos = transacciones.reduce((s, v) => s + v.total, 0);
                const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
                const compras = Estado.compras || [];
                const totalCompras = compras.reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
                const costoVentas = transacciones.reduce((s, v) => { 
                    if (v.isOrden) return s + (v.costoReal || 0);
                    if (v.costoReal !== undefined) return s + v.costoReal;
                    const invItem = Estado.inventario.find(i => i.sku === v.sku || i.nombre === v.producto);
                    if (invItem && invItem.costo) return s + (invItem.costo * (v.cantidad || 1));
                    const c = costos[v.sku || v.producto]; 
                    return s + (c ? c.costo * v.cantidad : 0); 
                }, 0);
                const totalEgresosReales = totalGastos + costoVentas + totalCompras;
                const utilidadBruta = ingresos - costoVentas;
                const utilidadNeta = ingresos - totalGastos - costoVentas;
                const margenBruto = ingresos > 0 ? (utilidadBruta / ingresos * 100) : 0;
                const margenNeto = ingresos > 0 ? (utilidadNeta / ingresos * 100) : 0;
                const metricas = document.getElementById('metricas-rentabilidad');
                if (metricas) metricas.innerHTML = `
                    <div class="rentabilidad-card"><div class="rentabilidad-label">💰 Ingresos Totales</div><div class="rentabilidad-valor">S/${ingresos.toFixed(2)}</div></div>
                    <div class="rentabilidad-card" style="border-left-color:#dc3545;"><div class="rentabilidad-label">💸 Costo de Ventas</div><div class="rentabilidad-valor negativo">S/${costoVentas.toFixed(2)}</div></div>
                    <div class="rentabilidad-card" style="border-left-color:#28a745;"><div class="rentabilidad-label">📊 Utilidad Bruta</div><div class="rentabilidad-valor ${utilidadBruta >= 0 ? 'positivo' : 'negativo'}">S/${utilidadBruta.toFixed(2)}</div></div>
                    <div class="rentabilidad-card" style="border-left-color:#fd7e14;"><div class="rentabilidad-label">💸 Total Gastos</div><div class="rentabilidad-valor negativo">S/${totalGastos.toFixed(2)}</div></div>
                    <div class="rentabilidad-card" style="border-left-color:#17a2b8;"><div class="rentabilidad-label">🎯 Utilidad Neta</div><div class="rentabilidad-valor ${utilidadNeta >= 0 ? 'positivo' : 'negativo'}">S/${utilidadNeta.toFixed(2)}</div></div>
                    <div class="rentabilidad-card" style="border-left-color:#6f42c1;"><div class="rentabilidad-label">📈 Margen Neto</div><div class="rentabilidad-valor ${margenNeto >= 0 ? 'positivo' : 'negativo'}">${margenNeto.toFixed(1)}%</div></div>`;
                
                const flujo = document.getElementById('flujo-salidas');
                if (flujo) {
                    flujo.innerHTML = `
                        <div class="card" style="border-left:4px solid #17a2b8; flex:1; min-width:200px; padding:15px; border-radius:10px; background:var(--bg-surface);">
                            <h3 style="font-size:14px; margin-bottom:10px; color:#17a2b8;">📦 Compras de Inventario</h3>
                            <div style="font-size:1.5em; font-weight:800; color:var(--text-primary);">S/${totalCompras.toFixed(2)}</div>
                        </div>
                        <div class="card" style="border-left:4px solid #dc3545; flex:1; min-width:200px; padding:15px; border-radius:10px; background:var(--bg-surface);">
                            <h3 style="font-size:14px; margin-bottom:10px; color:#dc3545;">💸 Costo de Ventas/Servicios</h3>
                            <div style="font-size:1.5em; font-weight:800; color:var(--text-primary);">S/${costoVentas.toFixed(2)}</div>
                        </div>
                        <div class="card" style="border-left:4px solid #fd7e14; flex:1; min-width:200px; padding:15px; border-radius:10px; background:var(--bg-surface);">
                            <h3 style="font-size:14px; margin-bottom:10px; color:#fd7e14;">📉 Gastos Operativos</h3>
                            <div style="font-size:1.5em; font-weight:800; color:var(--text-primary);">S/${totalGastos.toFixed(2)}</div>
                        </div>
                        <div class="card" style="border-left:4px solid #6f42c1; flex:1; min-width:200px; padding:15px; border-radius:10px; background:rgba(111, 66, 193, 0.05);">
                            <h3 style="font-size:14px; margin-bottom:10px; color:#6f42c1;">💰 TOTAL EGRESOS (SALIDAS)</h3>
                            <div style="font-size:1.5em; font-weight:800; color:#6f42c1;">S/${totalEgresosReales.toFixed(2)}</div>
                        </div>
                    `;
                }


                this.renderizarProductosRentables();
                this.calcularPuntoEquilibrio(totalGastos, margenBruto);
            },

            renderizarProductosRentables() {
                const c = document.getElementById('productos-rentables'); if (!c) return;
                const productos = {};
                const transacciones = window.obtenerDatosFiltradosGlobales();
                transacciones.forEach(v => { 
                    const key = v.sku || v.producto; 
                    if (!productos[key]) productos[key] = { nombre: v.producto, totalVentas: 0, cantidad: 0, costo: 0 }; 
                    productos[key].totalVentas += v.total; 
                    productos[key].cantidad += v.cantidad; 
                    if (v.isOrden) {
                        productos[key].costo += (v.costoReal || 0);
                    } else {
                        const cost = Estado.costosProductos[key]; 
                        if (cost) productos[key].costo += cost.costo * v.cantidad; 
                    }
                });
                const sorted = Object.values(productos).map(p => ({ ...p, ganancia: p.totalVentas - p.costo })).sort((a, b) => b.ganancia - a.ganancia).slice(0, 10);
                if (!sorted.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Registra ventas para ver los productos más rentables.</p>'; return; }
                c.innerHTML = sorted.map((p, i) => `<div class="producto-rentable"><div><div style="font-weight:700;">${i + 1}. ${p.nombre}</div><div style="font-size:0.85em;color:#666;">Cant: ${p.cantidad} · Ventas: S/${p.totalVentas.toFixed(2)}</div></div><div class="ganancia">S/${p.ganancia.toFixed(2)}</div></div>`).join('');
            },
            calcularPuntoEquilibrio(totalGastos, margenBrutoPct) {
                const c = document.getElementById('punto-equilibrio'); if (!c) return;
                if (margenBrutoPct <= 0 || totalGastos <= 0) { c.innerHTML = '<p style="color:#666;padding:20px;">Configura costos y registra gastos para calcular el punto de equilibrio.</p>'; return; }
                const puntoEq = totalGastos / (margenBrutoPct / 100);
                const totalVentas = Estado.ventas.reduce((s, v) => s + v.total, 0);
                const pct = Math.min(totalVentas / puntoEq * 100, 100);
                c.innerHTML = `<div class="grafico-container"><div style="margin-bottom:20px;"><strong>Punto de Equilibrio:</strong> S/${puntoEq.toFixed(2)}</div>
                    <div style="font-size:0.9em;color:#666;margin-bottom:15px;">Ventas actuales: S/${totalVentas.toFixed(2)} de S/${puntoEq.toFixed(2)} necesarios</div>
                    <div class="progress-bar-container"><div class="progress-bar-fill ${pct >= 100 ? '' : 'warning'}" style="width:${pct}%;">${pct.toFixed(1)}%</div></div>
                    ${totalVentas >= puntoEq ? '<p style="color:#28a745;margin-top:12px;font-weight:700;">✅ ¡Has superado el punto de equilibrio!</p>' : `<p style="color:#dc3545;margin-top:12px;">Faltan S/${(puntoEq - totalVentas).toFixed(2)} para superar el punto de equilibrio.</p>`}
                </div>`;
            }
        };

        const Reportes = {
            actualizar() { this.generarReporte(); },
            periodoActual: 'hoy',
            seleccionarPreset(preset, e) {
                this.periodoActual = preset;
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                if (e) e.target.classList.add('active');
                document.getElementById('fechas-personalizadas').classList.toggle('hidden', preset !== 'personalizado');
                if (preset !== 'personalizado') this.generarReporte();
            },
            getFechas() {
                const hoy = new Date().toISOString().slice(0, 10);
                if (this.periodoActual === 'hoy') return { desde: hoy, hasta: hoy };
                if (this.periodoActual === 'semana') { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return { desde: d.toISOString().slice(0, 10), hasta: hoy }; }
                if (this.periodoActual === 'mes') { const d = new Date(); return { desde: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, hasta: hoy }; }
                if (this.periodoActual === 'ultimo-mes') { const d = new Date(); d.setMonth(d.getMonth() - 1); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dias = new Date(y, d.getMonth() + 1, 0).getDate(); return { desde: `${y}-${m}-01`, hasta: `${y}-${m}-${String(dias).padStart(2, '0')}` }; }
                return { desde: (document.getElementById('reporte-fecha-desde') || {}).value || '2020-01-01', hasta: (document.getElementById('reporte-fecha-hasta') || {}).value || hoy };
            },
            generarReporte() {
                const { desde, hasta } = this.getFechas();
                const transacciones = window.obtenerDatosFiltradosGlobales();
                const ventasPeriodo = transacciones.filter(v => v.fecha >= desde && v.fecha <= hasta);
                const totalPeriodo = ventasPeriodo.reduce((s, v) => s + v.total, 0);
                const cobradoPeriodo = ventasPeriodo.reduce((s, v) => s + v.adelanto, 0);
                const ticketProm = ventasPeriodo.length ? totalPeriodo / ventasPeriodo.length : 0;
                const metricas = document.getElementById('metricas-reporte');
                if (metricas) metricas.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;margin-top:20px;">
                    <div class="card"><h3>💰 Total</h3><div class="value">S/${totalPeriodo.toFixed(2)}</div></div>
                    <div class="card"><h3>✅ Cobrado</h3><div class="value" style="color:#28a745;">S/${cobradoPeriodo.toFixed(2)}</div></div>
                    <div class="card"><h3>🛒 Transacciones</h3><div class="value">${ventasPeriodo.length}</div></div>
                    <div class="card"><h3>📊 Ticket Promedio</h3><div class="value" style="font-size:1.5em;">S/${ticketProm.toFixed(2)}</div></div>
                </div>`;
                this.actualizarGraficos(ventasPeriodo, desde, hasta);
            },
            actualizarGraficos(ventas, desde, hasta) {
                const COLORS = ['#4472C4', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#adb5bd'];
                const destroyAndCreate = (id, type, data, opts) => { const canvas = document.getElementById(id); if (!canvas) return; const chart = Chart.getChart(canvas); if (chart) chart.destroy(); Chart.defaults.color = document.body.classList.contains('light-mode') ? '#111827' : '#FFFFFF'; new Chart(canvas, { type, data, options: { responsive: true, maintainAspectRatio: false, ...opts } }); };
                // Gráfico de línea: ventas por fecha
                const ventasPorFecha = {}; ventas.forEach(v => { ventasPorFecha[v.fecha] = (ventasPorFecha[v.fecha] || 0) + v.total; });
                const fechas = Object.keys(ventasPorFecha).sort();
                destroyAndCreate('grafico-linea', 'line', { labels: fechas.map(f => { const [y, m, d] = f.split('-'); return `${d}/${m}`; }), datasets: [{ label: 'Ventas (S/)', data: fechas.map(f => ventasPorFecha[f]), borderColor: '#4472C4', backgroundColor: 'rgba(68,114,196,0.1)', fill: true, tension: 0.3 }] }, { plugins: { legend: { display: false } } });
                // Pastel: categorías
                const cats = {}; ventas.forEach(v => { cats[v.categoria || 'Otros'] = (cats[v.categoria || 'Otros'] || 0) + v.total; });
                destroyAndCreate('grafico-pastel', 'pie', { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: COLORS }] }, {});
                // Barras: top productos
                const prods = {}; ventas.forEach(v => { prods[v.producto] = (prods[v.producto] || 0) + v.total; });
                const sortedProds = Object.entries(prods).sort((a, b) => b[1] - a[1]).slice(0, 10);
                destroyAndCreate('grafico-barras', 'bar', { labels: sortedProds.map(([n]) => n.slice(0, 20)), datasets: [{ label: 'Total (S/)', data: sortedProds.map(([, v]) => v), backgroundColor: COLORS }] }, { indexAxis: 'y', plugins: { legend: { display: false } } });
                // Dona: métodos de pago
                const mets = {}; ventas.forEach(v => { mets[v.metodo || 'Sin método'] = (mets[v.metodo || 'Sin método'] || 0) + v.total; });
                destroyAndCreate('grafico-dona', 'doughnut', { labels: Object.keys(mets), datasets: [{ data: Object.values(mets), backgroundColor: COLORS }] }, {});
                // Área: acumulado
                let acum = 0; const acumData = fechas.map(f => { acum += ventasPorFecha[f]; return acum; });
                destroyAndCreate('grafico-area', 'line', { labels: fechas.map(f => { const [y, m, d] = f.split('-'); return `${d}/${m}`; }), datasets: [{ label: 'Acumulado (S/)', data: acumData, borderColor: '#28a745', backgroundColor: 'rgba(40,167,69,0.15)', fill: true, tension: 0.3 }] }, { plugins: { legend: { display: false } } });
            },
            exportarPDF() {
                const { desde, hasta } = this.getFechas(); const transacciones = window.obtenerDatosFiltradosGlobales(); const ventas = transacciones.filter(v => v.fecha >= desde && v.fecha <= hasta);
                const { jsPDF } = window.jspdf; const doc = new jsPDF();
                doc.setFillColor(68, 114, 196); doc.rect(0, 0, 210, 35, 'F');
                doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
                doc.text('REPORTE DE VENTAS', 105, 20, { align: 'center' });
                doc.setFontSize(10); doc.text(`Período: ${desde.split('-').reverse().join('/')} al ${hasta.split('-').reverse().join('/')}`, 105, 29, { align: 'center' });
                doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
                const total = ventas.reduce((s, v) => s + v.total, 0);
                let y = 50;[['Total Ventas', `S/${total.toFixed(2)}`], ['N° Transacciones', ventas.length], ['Ticket Promedio', `S/${ventas.length ? total / ventas.length : 0}.toFixed(2)}`]].forEach(([l, v]) => { doc.text(`${l}: ${v}`, 14, y); y += 8; });
                doc.save(`Reporte_${desde}_${hasta}.pdf`);
            },
            exportarExcel() {
                const { desde, hasta } = this.getFechas(); const ventas = Estado.ventas.filter(v => v.fecha >= desde && v.fecha <= hasta);
                const ws = XLSX.utils.json_to_sheet(ventas.map(v => ({ Fecha: v.fecha, Producto: v.producto, Cantidad: v.cantidad, Precio: v.precio, Total: v.total, Cliente: v.cliente || '-', Método: v.metodo || '-', Estado: v.estadoPago })));
                const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
                XLSX.writeFile(wb, `Reporte_${desde}_${hasta}.xlsx`);
            }
        };