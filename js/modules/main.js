

        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            firebaseOK = true;
            window.firebaseOK = true;
        } catch (e) {
            console.error("Error Firebase:", e);
            window.firebaseOK = false;
        }

        const Storage = {
            cargarVentas() { },
            cargarInventario() { },
            cargarClientes() { },
            cargarGastos() { },
            cargarCostos() { },

            _normalizarVentas(lista) {
                if (!lista) return [];
                return lista.map(v => {
                    const adelanto = v.adelanto !== undefined ? v.adelanto : v.total;
                    const saldoPendiente = v.saldoPendiente !== undefined ? v.saldoPendiente : 0;
                    const estadoPago = v.estadoPago || 'Pagado';
                    let historialPagos = v.historialPagos || [];
                    if (!historialPagos.length && adelanto > 0) historialPagos = [{ monto: adelanto, metodo: v.metodo || 'Sin método', fecha: v.createdAt || v.fecha || new Date().toISOString() }];
                    return { ...v, adelanto, saldoPendiente, estadoPago, historialPagos };
                }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            },
            async agregarVenta(venta) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('ventas').doc(venta.id).set(venta);
            },
            async actualizarVenta(venta) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('ventas').doc(venta.id).update(venta);
            },
            async eliminarVenta(id) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('ventas').doc(id).delete();
            },
            async guardarVentas() {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                let chunks = [];
                for (let i = 0; i < Estado.ventas.length; i += 450) chunks.push(Estado.ventas.slice(i, i + 450));
                for (const chunk of chunks) {
                    const batch = db.batch();
                    chunk.forEach(venta => batch.set(tenantRef.collection('ventas').doc(venta.id), venta));
                    await batch.commit();
                }
            },
            async agregarProducto(item) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('inventario').doc(item.sku).set(item);
            },
            async actualizarProducto(item) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('inventario').doc(item.sku).update(item);
            },
            async eliminarProducto(sku) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('inventario').doc(sku).delete();
            },
            async incrementarStock(sku, cantidad) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('inventario').doc(sku).update({
                    stock: firebase.firestore.FieldValue.increment(cantidad)
                });
            },
            async guardarInventario() {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                let chunks = [];
                for (let i = 0; i < Estado.inventario.length; i += 450) chunks.push(Estado.inventario.slice(i, i + 450));
                for (const chunk of chunks) {
                    const batch = db.batch();
                    chunk.forEach(item => batch.set(tenantRef.collection('inventario').doc(item.sku), item));
                    await batch.commit();
                }
                if (typeof Inventario !== 'undefined') Inventario.actualizarTabla(); 
            },
            async agregarCliente(cliente) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('clientes').doc(cliente.id).set(cliente);
            },
            async actualizarCliente(cliente) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('clientes').doc(cliente.id).update(cliente);
            },
            async eliminarCliente(id) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('clientes').doc(id).delete();
            },
            async guardarClientes() {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                let chunks = [];
                for (let i = 0; i < Estado.clientes.length; i += 450) chunks.push(Estado.clientes.slice(i, i + 450));
                for (const chunk of chunks) {
                    const batch = db.batch();
                    chunk.forEach(cliente => batch.set(tenantRef.collection('clientes').doc(cliente.id.toString()), cliente));
                    await batch.commit();
                }
            },

            async agregarGasto(gasto) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('gastos').doc(gasto.id).set(gasto);
            },
            async actualizarGasto(gasto) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('gastos').doc(gasto.id).update(gasto);
            },
            async eliminarGasto(id) {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                await tenantRef.collection('gastos').doc(id).delete();
            },
            async guardarGastos() {
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;
                let chunks = [];
                for (let i = 0; i < Estado.gastos.length; i += 450) chunks.push(Estado.gastos.slice(i, i + 450));
                for (const chunk of chunks) {
                    const batch = db.batch();
                    chunk.forEach(gasto => batch.set(tenantRef.collection('gastos').doc(gasto.id.toString()), gasto));
                    await batch.commit();
                }
            },
            async guardarCostos() { await Firebase.guardar('costos', Estado.costosProductos); },
            async sincronizarDesdeFirebase() {
                if (!window.firebaseOK) return;
                const tenantRef = Firebase._tenantDoc();
                if (!tenantRef) return;

                if (this._unsubscribes) {
                    this._unsubscribes.forEach(unsub => unsub());
                }
                this._unsubscribes = [];

                const claves = ['costos', 'ordenesServicio', 'proveedores', 'compras', 'devoluciones', 'cotizaciones', 'cierresCaja', 'estadoCaja', 'categoriasCustom', 'configuracion', 'papelera', 'marcasCustom', 'metodosPagoCustom'];

                // Snapshot para la nueva subcolección de inventario
                this._unsubscribes.push(tenantRef.collection('inventario').onSnapshot(snap => {
                    Estado.inventario = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    clearTimeout(this._uiUpdateTimer);
                    this._uiUpdateTimer = setTimeout(() => {
                        if (typeof UI !== 'undefined' && UI.actualizarVistas) UI.actualizarVistas();
                    }, 150);
                }, error => {
                    console.error(`Error escuchando en tiempo real inventario:`, error);
                }));

                // Snapshot para la nueva subcolección de ventas
                this._unsubscribes.push(tenantRef.collection('ventas').onSnapshot(snap => {
                    Estado.ventas = Storage._normalizarVentas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    
                    clearTimeout(this._uiUpdateTimer);
                    this._uiUpdateTimer = setTimeout(() => {
                        if (typeof UI !== 'undefined' && UI.actualizarVistas) UI.actualizarVistas();
                    }, 150);
                }, error => {
                    console.error(`Error escuchando en tiempo real ventas:`, error);
                }));

                // Snapshot para la nueva subcolección de clientes
                this._unsubscribes.push(tenantRef.collection('clientes').onSnapshot(snap => {
                    Estado.clientes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    clearTimeout(this._uiUpdateTimer);
                    this._uiUpdateTimer = setTimeout(() => {
                        if (typeof UI !== 'undefined' && UI.actualizarVistas) UI.actualizarVistas();
                    }, 150);
                }, error => {
                    console.error(`Error escuchando en tiempo real clientes:`, error);
                }));

                // Snapshot para la nueva subcolección de gastos
                this._unsubscribes.push(tenantRef.collection('gastos').onSnapshot(snap => {
                    Estado.gastos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    clearTimeout(this._uiUpdateTimer);
                    this._uiUpdateTimer = setTimeout(() => {
                        if (typeof UI !== 'undefined' && UI.actualizarVistas) UI.actualizarVistas();
                    }, 150);
                }, error => {
                    console.error(`Error escuchando en tiempo real gastos:`, error);
                }));

                const tenantCol = Firebase._col();
                claves.forEach(clave => {
                    this._unsubscribes.push(tenantCol.doc(clave).onSnapshot(docSnap => {
                        const data = docSnap.exists ? docSnap.data().datos : null;

                        // (Dentro del onSnapshot, antes de la actualización reactiva)
                        if (typeof CategoriaCustom !== 'undefined') CategoriaCustom.cargarEnSelect();
                        if (typeof MarcasCustom !== 'undefined') MarcasCustom.cargarEnSelect();
                        if (typeof MetodoPagoCustom !== 'undefined') MetodoPagoCustom.cargarEnSelect();

                        // Mapeo dinámico al objeto Estado
                        if (clave === 'categoriasCustom') {
                            Estado.categoriasCustom = data || [];
                        } else if (clave === 'configuracion') {
                            Estado.configuracion = data || null;
                            if (typeof ConfiguracionNegocio !== 'undefined') ConfiguracionNegocio.cargar();
                        } else if (clave === 'costos') {
                            Estado.costosProductos = data || {};
                        } else if (clave === 'estadoCaja') {
                            if (data) {
                                Estado.cajaAbierta = data.abierta;
                                Estado.datosCaja = data.datos;
                            } else {
                                Estado.cajaAbierta = false;
                                Estado.datosCaja = null;
                            }
                        } else {
                            Estado[clave] = data || [];
                        }

                        // Actualización reactiva de la interfaz (Debounce de 150ms para evitar parpadeos)
                        clearTimeout(this._uiUpdateTimer);
                        this._uiUpdateTimer = setTimeout(() => {
                            if (typeof UI !== 'undefined' && UI.actualizarVistas) UI.actualizarVistas();
                        }, 150);

                    }, error => {
                        console.error(`Error escuchando en tiempo real ${clave}:`, error);
                    }));
                });

                // Ocultar cualquier pantalla de carga que tengas activa tras 1 segundo
                setTimeout(() => {
                    const loader = document.getElementById('loading-overlay'); // Ajusta el ID si usas otro
                    if (loader) loader.style.display = 'none';
                    if (typeof BackupManager !== 'undefined') BackupManager.verificarRespaldoDiario();
                }, 1000);
            }
        };
        function calcularSKUDinamico() {
            const catInput = document.getElementById('swal-prod-categoria');
            const marInput = document.getElementById('swal-prod-marca');
            const skuInput = document.getElementById('swal-prod-sku');

            if (!catInput || !marInput || !skuInput) return;

            // Tomar las 3 primeras letras o rellenar con 'X' si está vacío
            const cat = catInput.value.trim().substring(0, 3).toUpperCase().padEnd(3, 'X');
            const mar = marInput.value.trim().substring(0, 3).toUpperCase().padEnd(3, 'X');

            // Generar un número correlativo basado en los productos que ya existen
            const listaProductos = (typeof Estado !== 'undefined' && Estado.inventario) ? Estado.inventario : [];
            const correlativo = String(listaProductos.length + 1).padStart(4, '0');

            // Ejemplo de resultado: ROP-ZAR-0024 (Ropa - Zara - Producto 24)
            skuInput.value = `${cat}-${mar}-${correlativo}`;
        }

        // ════════════════════════════════════════════════════════════════
        // INICIALIZACIÓN
        // ════════════════════════════════════════════════════════════════
        document.addEventListener('DOMContentLoaded', () => {
            ThemeManager.init();
            Auth.init();

            document.getElementById('fecha').valueAsDate = new Date();

            Ventas.init();
            Autocomplete.init();
            Autocomplete.initClientes();
            SkuGen.init();

            Reportes.seleccionarPreset('hoy', null);
        });

        // Init theme on page load (before DOMContentLoaded to avoid flash)
        (function () {
            const saved = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', saved);
        })();

        // ThemeManager initialization moved to global DOMContentLoaded listener
