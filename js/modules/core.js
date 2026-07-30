
// --- MONKEY PATCH FIREBASE PARA MANEJO GLOBAL DE ERRORES ---
(function() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        const methods = ['get', 'set', 'update', 'delete', 'add'];
        
        // Parcheamos CollectionReference y DocumentReference
        const refs = [
            firebase.firestore.CollectionReference.prototype,
            firebase.firestore.DocumentReference.prototype
        ];
        
        refs.forEach(ref => {
            methods.forEach(method => {
                if (ref[method]) {
                    const original = ref[method];
                    ref[method] = async function(...args) {
                        try {
                            return await original.apply(this, args);
                        } catch (e) {
                            console.error(`Firebase Error en ${method}:`, e);
                            if (window.Toastify && e.code !== 'permission-denied') {
                                Toastify({
                                    text: "Error de conexión o permisos. Revisa tu internet.",
                                    duration: 4000,
                                    gravity: "top",
                                    position: "right",
                                    style: { background: "var(--danger)" }
                                }).showToast();
                            }
                            throw e; // Permitir que la app falle si debe, pero informando
                        }
                    };
                }
            });
        });
    }
})();
// --- FIN DEL PARCHE ---

const firebaseConfig = {
            apiKey: "AIzaSyDJhXNwH_kvXaeGTFnde2gCjc96RfCUVAs",
            authDomain: "paginawebventas-2be07.firebaseapp.com",
            projectId: "paginawebventas-2be07",
            storageBucket: "paginawebventas-2be07.firebasestorage.app",
            messagingSenderId: "507118108507",
            appId: "1:507118108507:web:9a740c69622401fb3a647e"
        };

        let db = null;
        let firebaseOK = false;

        function _mostrarEstadoFirebase(msg, color) {
            let banner = document.getElementById('fb-status-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'fb-status-banner';
                banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 24px;border-radius:24px;font-size:13px;font-weight:700;font-family:sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.25);transition:opacity 0.5s;';
                document.body.appendChild(banner);
            }
            banner.textContent = msg;
            banner.style.background = color;
            banner.style.color = '#fff';
            banner.style.opacity = '1';
            if (color === '#28a745') setTimeout(() => { banner.style.opacity = '0'; }, 5000);
        }

        const Firebase = {
            _col() {
                const tenant = localStorage.getItem('superAdminTenant') || localStorage.getItem('tenantId') || 'demo';
                return db ? db.collection('empresas').doc(tenant).collection('datos') : null;
            },
            _tenantDoc() {
                const tenant = localStorage.getItem('superAdminTenant') || localStorage.getItem('tenantId') || 'demo';
                return db ? db.collection('empresas').doc(tenant) : null;
            },
            async leer(clave) {
                if (!window.firebaseOK || (typeof Auth !== 'undefined' && Auth.modoInvitado)) return null;
                try {
                    const doc = await this._col().doc(clave).get();
                    return doc.exists ? doc.data().datos : null;
                } catch (e) { return null; }
            },
            async guardar(clave, datos) {
                if (!window.firebaseOK || (typeof Auth !== 'undefined' && Auth.modoInvitado)) return;
                try {
                    await this._col().doc(clave).set({ datos });
                    _mostrarEstadoFirebase('☁️ Guardado: ' + clave, '#28a745');
                } catch (e) {
                    _mostrarEstadoFirebase('❌ Error Firebase: ' + e.message, '#dc3545');
                    throw e;
                }
            }
        };

        const Config = { USUARIO_CORRECTO: 'Jose', CONTRASENA_CORRECTA: '12345678' };

        const Estado = {
            ventas: [], ventasFiltradas: [], inventario: [], clientes: [], gastos: [], costosProductos: {},
            ordenesServicio: [], proveedores: [], compras: [], devoluciones: [], cotizaciones: [], cierresCaja: [], estadoCaja: null,
            metodoChart: null, graficos: { linea: null, pastel: null, area: null, barras: null, dona: null }, configuracion: null, papelera: []
        };

        // ════════════════════════════════════════════════════════════════
        // VARIABLES GLOBALES DE VISTAS (MODO DE DATOS)
        // ════════════════════════════════════════════════════════════════
        window._modoDatos = 'VENTAS'; // 'VENTAS' | 'ORDENES' | 'AMBOS'
        
        window.cambiarModoDatos = function(modo) {
            window._modoDatos = modo;
            
            // Actualizar botones UI en todas las pestañas
            document.querySelectorAll('.modo-datos-btn').forEach(btn => {
                btn.classList.remove('btn-active', 'btn-inactive');
                if (btn.dataset.modo === modo) {
                    btn.classList.add('btn-active');
                } else {
                    btn.classList.add('btn-inactive');
                }
            });

            // Refrescar vistas si los objetos ya están definidos
            if (typeof Filtros !== 'undefined' && Filtros.aplicarFiltros) Filtros.aplicarFiltros();
            if (typeof Reportes !== 'undefined' && Reportes.actualizar) Reportes.actualizar();
            if (typeof Rentabilidad !== 'undefined' && Rentabilidad.actualizar) Rentabilidad.actualizar();
            if (typeof Dashboard !== 'undefined' && Dashboard.actualizar) Dashboard.actualizar();
            if (typeof Clientes !== 'undefined' && Clientes.actualizar) Clientes.actualizar();
        };

        window.obtenerDatosFiltradosGlobales = function() {
            // Check si OrdenesServicio ya se inicializó
            const ordenes = (typeof OrdenesServicio !== 'undefined' && OrdenesServicio.cargar) ? OrdenesServicio.cargar() : (Estado.ordenesServicio || []);
            
            // Normalizamos órdenes de servicio para que se comporten como "Ventas" en las tablas y gráficas
            const ordenesNormalizadas = ordenes.map(o => {
                const costoRepuestos = o.repuestos ? o.repuestos.reduce((sum, r) => sum + (parseFloat(r.precio) || 0), 0) : 0;
                return {
                    ...o,
                    id: o.id || o.numero,
                    isOrden: true,
                    producto: `[OS] ${o.tipoEquipo || 'Equipo'} - ${o.problema || ''}`,
                    categoria: 'Servicios',
                    sku: o.numero || '',
                    cantidad: 1,
                    precio: parseFloat(o.costo) || 0,
                    total: parseFloat(o.costo) || 0,
                    saldoPendiente: parseFloat(o.saldoPendiente) || 0,
                    costoReal: costoRepuestos, // Se usa en Rentabilidad
                    estado: o.estado === 'Entregado' ? 'Pagado' : 'Pendiente' 
                };
            });

            if (window._modoDatos === 'VENTAS') return Estado.ventas;
            if (window._modoDatos === 'ORDENES') return ordenesNormalizadas;
            
            // Si es AMBOS, combinamos y ordenamos por fecha descendente
            const combinados = [...Estado.ventas, ...ordenesNormalizadas];
            combinados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            return combinados;
        };

        // ════════════════════════════════════════════════════════════════
        // MÓDULO: AUTENTICACIÓN
        // ════════════════════════════════════════════════════════════════

        const Auth = {
            ADMIN_EMAIL: "joseprado049321@gmail.com",
            esAdmin: false,
            modoInvitado: false,
            usuarioActual: null,
            init() {
                if (window.firebaseOK) {
                    firebase.auth().onAuthStateChanged((user) => { if (user) this.manejarAcceso(user); });
                }
                const form = document.getElementById('loginForm');
                if (form) form.addEventListener('submit', (e) => this.loginTradicional(e));
                if (localStorage.getItem('sesionInvitado') === 'true') this.entrarComoInvitado(true);
            },
            async loginConGoogle() {
                if (!window.firebaseOK) return this._notificar("❌ Firebase no conectado", "#ff5f6d");
                const provider = new firebase.auth.GoogleAuthProvider();
                try { await firebase.auth().signInWithPopup(provider); } catch (error) { this._notificar("❌ Error Google: " + error.message, "#ff5f6d"); }
            },
            async loginTradicional(e) {
                e.preventDefault();
                const user = document.getElementById('username').value.trim();
                const pass = document.getElementById('password').value.trim();

                const btnSubmit = document.querySelector('#loginForm button[type="submit"]');
                const btnOriginalText = btnSubmit ? btnSubmit.innerHTML : '🚀 Ingresar';
                if (btnSubmit) { btnSubmit.innerHTML = '⏳ Verificando...'; btnSubmit.disabled = true; }

                if (user === this.ADMIN_EMAIL && pass === "12345678") {
                    this.esAdmin = true; this.modoInvitado = false;
                    localStorage.setItem('superAdmin', 'true');
                    localStorage.setItem('sesionActiva', 'true');
                    localStorage.removeItem('sesionInvitado');
                    this.mostrarPantallaPrincipal();
                    this._notificar("✅ Bienvenido Administrador", "linear-gradient(to right,#4472C4,#2c5aa0)");
                } else {
                    try {
                        let loginEmail = user;
                        if (!user.includes('@')) {
                            loginEmail = `${user.toLowerCase().replace(/\s+/g, '')}@local.app`;
                        }
                        await firebase.auth().signInWithEmailAndPassword(loginEmail, pass);
                        // onAuthStateChanged se encarga del flujo a partir de aquí
                    } catch (error) {
                        console.error(error);
                        this._notificar("❌ Usuario o clave incorrectos", "#ff5f6d");
                    }
                }

                if (btnSubmit) { btnSubmit.innerHTML = btnOriginalText; btnSubmit.disabled = false; }
            },
            entrarComoInvitado(auto = false) {
                this.modoInvitado = true; this.esAdmin = false;
                localStorage.setItem('sesionInvitado', 'true');
                localStorage.removeItem('sesionActiva');
                this.mostrarPantallaPrincipal();
                if (!auto) this._notificar("👤 Modo Invitado: solo datos locales", "#6c757d");
            },
            async manejarAcceso(user) {
                const isSuperAdminAccount = (user.email === this.ADMIN_EMAIL);

                // 1. EL PASE VIP DEL SÚPER ADMIN (Evita que quede en "Pendiente")
                if (isSuperAdminAccount) {
                    localStorage.setItem('superAdmin', 'true');
                    localStorage.setItem('sesionActiva', 'true');
                    this.esAdmin = true;
                    this.modoInvitado = false;
                    this.usuarioActual = { email: user.email, nombre: user.displayName || 'Súper Admin', rol: 'admin', uid: user.uid };
                    if (typeof this.cargarEmpresas === 'function') this.cargarEmpresas();
                    this.mostrarPantallaPrincipal();
                    this._notificar(`👑 Bienvenido Súper Administrador`, "linear-gradient(to right,#4472C4,#2c5aa0)");
                    return;
                }

                try {
                    const docRef = db.collection('usuarios_acceso').doc(user.uid);
                    const docSnap = await docRef.get();

                    if (!docSnap.exists) {
                        // Ocultar interfaz gráfica para bloquear "Sesiones Fantasma" de cuentas eliminadas
                        const appCont = document.getElementById('app-container');
                        const logCont = document.getElementById('login-container');
                        if (appCont) appCont.style.display = 'none';
                        if (logCont) logCont.style.display = 'flex';

                        const { value: tipoUsuario } = await Swal.fire({
                            title: '👋 ¡Bienvenido a LisPro POS!',
                            text: '¿Qué tipo de cuenta deseas crear?',
                            icon: 'question',
                            showDenyButton: true, showCancelButton: true,
                            confirmButtonText: '🏢 Soy Dueño', denyButtonText: '👤 Soy Empleado', cancelButtonText: 'Cancelar',
                            confirmButtonColor: '#2B56A5', denyButtonColor: '#10B981', allowOutsideClick: false
                        });

                        if (!tipoUsuario && tipoUsuario !== false) { await firebase.auth().signOut(); return; }

                        if (tipoUsuario) {
                            await docRef.set({ email: user.email, nombre: user.displayName || '', rol: 'admin', estado: 'pendiente', tenantId: user.uid, fechaCreacion: new Date().toISOString() });
                            this._mostrarPantalla('pending-screen');
                            this._escucharAprobacion(docRef);
                        } else {
                            const { value: codigoTienda } = await Swal.fire({
                                title: '🔗 Conectar a Tienda',
                                text: 'Ingresa el Identificador que te proporcionó el administrador:',
                                input: 'text', inputPlaceholder: 'Ej: NEX-ABCD-1234',
                                showCancelButton: true, confirmButtonText: 'Siguiente',
                                preConfirm: async (codigo) => {
                                    if (!codigo) { Swal.showValidationMessage('Ingresa un código'); return false; }
                                    const snapshot = await db.collection('empresas').where('storeId', '==', codigo.trim().toUpperCase()).get();
                                    if (snapshot.empty) { Swal.showValidationMessage('Identificador no válido'); return false; }
                                    return snapshot.docs[0].id;
                                }
                            });

                            if (codigoTienda) {
                                await docRef.set({ email: user.email, nombre: user.displayName || '', rol: 'empleado', estado: 'pendiente', tenantId: codigoTienda, fechaCreacion: new Date().toISOString() });
                                this._mostrarPantalla('pending-screen');
                                this._escucharAprobacion(docRef);
                            } else { await firebase.auth().signOut(); }
                        }
                        return;
                    }

                    const data = docSnap.data();
                    if (data.estado === 'pendiente') { this._mostrarPantalla('pending-screen'); this._escucharAprobacion(docRef); return; }
                    if (data.estado === 'rechazado') { this._mostrarPantalla('denied-screen'); return; }

                    if (data.estado === 'aprobado') {
                        // Solo pedir crear tienda si es el Dueño original (su tenantId es su propio UID)
                        if (data.rol === 'admin' && data.tenantId === user.uid && !data.storeId && !isSuperAdminAccount) {
                            const { value: nombreTienda } = await Swal.fire({
                                title: '🎉 ¡Cuenta Aprobada!',
                                text: 'Ingresa el nombre de tu negocio para configurar tu espacio:',
                                input: 'text', inputPlaceholder: 'Ej: Minimarket El Sol', allowOutsideClick: false, confirmButtonText: 'Comenzar 🚀',
                                preConfirm: (val) => { if (!val) { Swal.showValidationMessage('Requerido'); return false; } return val.trim(); }
                            });
                            if (nombreTienda) {
                                const random = Math.random().toString(36).substring(2, 6).toUpperCase();
                                const p1 = nombreTienda.replace(/[^A-Z]/ig, '').substring(0, 4).toUpperCase().padEnd(4, 'X');
                                const storeId = `NEX-${p1}-${random}`;

                                await docRef.update({ storeId: storeId, nombreTienda: nombreTienda });
                                await db.collection('empresas').doc(user.uid).set({ storeId: storeId, nombreTienda: nombreTienda });
                                data.storeId = storeId;

                                await Swal.fire({ title: '🏢 Tu tienda está lista', html: `El identificador de tu tienda es:<br><b style="font-size:1.6em;color:#2B56A5;letter-spacing:2px;display:block;margin:15px 0;">${storeId}</b><span style="font-size:0.9em;color:#666;">Comparte este código con tus empleados para que se unan a tu tienda.</span>`, icon: 'success' });
                            }
                        }

                        this.esAdmin = (data.rol === 'admin');
                        this.usuarioActual = data;
                        localStorage.setItem('sesionActiva', 'true');
                        localStorage.setItem('tenantId', data.tenantId || user.uid);

                        if (!isSuperAdminAccount) localStorage.removeItem('superAdminTenant');
                        else if (typeof this.cargarEmpresas === 'function') this.cargarEmpresas();

                        this.mostrarPantallaPrincipal();
                        this._notificar(`✅ Bienvenido, ${data.nombre}`, "linear-gradient(to right,#00b09b,#96c93d)");
                        if (typeof Storage !== 'undefined') Storage.sincronizarDesdeFirebase();

                        // MOTOR DE SEGURIDAD: Expulsar al instante si es eliminado o actualizar menú si cambian permisos
                        docRef.onSnapshot(snap => {
                            if (!snap.exists) {
                                Swal.fire('Cuenta Eliminada', 'Tu acceso ha sido revocado por el dueño de la tienda.', 'error').then(() => this.cerrarSesion());
                            } else {
                                const actualData = snap.data();
                                if (actualData.estado !== 'aprobado') {
                                    Swal.fire('Acceso Suspendido', 'Tu cuenta ha sido deshabilitada.', 'warning').then(() => this.cerrarSesion());
                                } else if (this.usuarioActual && (JSON.stringify(this.usuarioActual.modulos) !== JSON.stringify(actualData.modulos) || this.usuarioActual.rol !== actualData.rol)) {
                                    this.esAdmin = (actualData.rol === 'admin');
                                    this.usuarioActual = actualData;
                                    if (typeof this.aplicarRestricciones === 'function') this.aplicarRestricciones();
                                }
                            }
                        });
                    }
                } catch (error) { console.error(error); Swal.fire('Error', 'Problema de conexión', 'error'); }
            },
            _escucharAprobacion(docRef) {
                // onSnapshot mantiene una conexión abierta en tiempo real con la nube
                const unsubscribe = docRef.onSnapshot((doc) => {
                    const data = doc.data();
                    if (data && data.estado === 'aprobado') {
                        unsubscribe(); // Dejamos de escuchar para no consumir memoria
                        Swal.fire({
                            icon: 'success',
                            title: '🎉 ¡Aprobado!',
                            text: 'El administrador ha autorizado tu acceso. Preparando tu espacio...',
                            timer: 2500,
                            showConfirmButton: false,
                            allowOutsideClick: false
                        }).then(() => {
                            location.reload(); // Recarga automática que disparará el prompt del nombre de la tienda
                        });
                    } else if (data && data.estado === 'rechazado') {
                        unsubscribe();
                        this._mostrarPantalla('denied-screen');
                    }
                });
            },
            _mostrarPantallaPendiente(estado, email) {
                if (estado === 'rechazado') {
                    this._mostrarPantalla('denied-screen');
                    const infoEl = document.getElementById('denied-user-info');
                    if (infoEl) infoEl.innerHTML = `<strong>📧 ${email || ''}</strong><br>Tu acceso fue denegado.`;
                } else {
                    this._mostrarPantalla('pending-screen');
                    const infoEl = document.getElementById('pending-user-info');
                    if (infoEl) infoEl.innerHTML = `<strong>📧 ${email || ''}</strong><br>Tu solicitud sigue pendiente o fue enviada al administrador.`;
                }
            },
            _mostrarPantalla(idVisible) {
                ['login-screen', 'pending-screen', 'denied-screen', 'main-screen'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) { if (id === idVisible) el.classList.remove('hidden'); else el.classList.add('hidden'); }
                });
            },
            mostrarPantallaPrincipal() {
                this._mostrarPantalla('main-screen');
                if (this.modoInvitado) { Storage.cargarVentas(); Storage.cargarInventario(); }
                else { Storage.sincronizarDesdeFirebase(); }
                this.aplicarRestricciones();
            },
            aplicarRestricciones() {
                // Si es administrador (o Súper Admin), forzamos que todos los botones sean visibles
                if (this.esAdmin) {
                    document.querySelectorAll('.menu-item').forEach(el => el.style.display = 'flex');
                    return;
                }

                // Si es empleado, recuperamos sus permisos
                const modulos = (this.usuarioActual && this.usuarioActual.modulos) ? this.usuarioActual.modulos : [];

                // Pestañas críticas prohibidas por defecto para empleados
                const prohibidosSiempre = ['configuracion', 'usuarios', 'rentabilidad', 'reportes', 'gastos', 'resumen', 'compras', 'proveedores', 'cotizaciones'];

                document.querySelectorAll('.menu-item').forEach(el => {
                    const tabId = el.id.replace('sidebarTab-', '');
                    if (prohibidosSiempre.includes(tabId)) {
                        el.style.display = 'none';
                    } else if (modulos.includes(tabId)) {
                        el.style.display = 'flex';
                    } else {
                        el.style.display = 'none';
                    }
                });
            },
            async cerrarSesion() {
                if (window.firebaseOK) await firebase.auth().signOut();
                // Solo removemos las credenciales de la sesión actual
                localStorage.removeItem('sesionActiva');
                localStorage.removeItem('sesionInvitado');
                localStorage.removeItem('superAdmin');
                localStorage.removeItem('tenantId'); // Limpieza para evitar estado inconsistente entre sesiones locales
                location.reload();
            },
            async cargarEmpresas() {
                try {
                    const snap = await db.collection('usuarios_acceso').get();
                    const select = document.getElementById('select-empresas');
                    if (!select) return;
                    select.innerHTML = '<option value="super_admin">Mi Espacio Principal</option>' +
                        snap.docs.filter(d => d.data().estado === 'aprobado' && d.data().rol === 'admin')
                            .map(d => `<option value="${d.id}">${d.data().email} (${d.data().nombre || 'Sin nombre'})</option>`).join('');

                    const actual = localStorage.getItem('superAdminTenant');
                    if (actual) select.value = actual;

                    document.getElementById('panel-superadmin').style.display = 'block';
                } catch (e) { console.error("Error cargando empresas", e); }
            },
            async cambiarTenant(uid) {
                localStorage.setItem('superAdminTenant', uid);
                // Al cambiar de empresa, limpiamos la memoria caché local y recargamos para descargar la nueva BD
                const clavesLimpiar = ['ventas', 'inventario', 'clientes', 'gastos', 'costos', 'ordenesServicio', 'proveedores', 'compras', 'devoluciones', 'cotizaciones', 'cierresCaja', 'localUsersDB'];
                clavesLimpiar.forEach(k => localStorage.removeItem(k));
                location.reload();
            },
            _notificar(texto, color) {
                if (typeof Toastify !== 'undefined') Toastify({ text: texto, duration: 3500, gravity: "top", position: "right", style: { background: color } }).showToast();
            }
        };