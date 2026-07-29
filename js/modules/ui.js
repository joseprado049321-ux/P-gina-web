

        const Exportar = {
            exportarExcel() {
                const ventas = Estado.ventasFiltradas.length ? Estado.ventasFiltradas : Estado.ventas;
                if (!ventas.length) return Swal.fire('Sin datos', 'No hay ventas para exportar', 'info');
                const filas = ventas.map(v => ({ Fecha: v.fecha, SKU: v.sku || '-', Producto: v.producto, Categoría: v.categoria, Cantidad: v.cantidad, 'Precio Unit.': v.precio, Total: v.total, 'Monto Recibido': v.montoRecibido !== undefined ? v.montoRecibido : v.adelanto, Vuelto: v.vuelto || 0, 'Saldo': v.saldoPendiente, 'Estado Pago': v.estadoPago, Cliente: v.cliente || '-', Método: v.metodo || '-', Vendedor: v.vendedor || '-', Notas: v.notas || '-' }));
                const ws = XLSX.utils.json_to_sheet(filas);
                const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
                XLSX.writeFile(wb, `Ventas_${new Date().toISOString().slice(0, 10)}.xlsx`);
            },
            guardarJSON() {
                const datos = { ventas: Estado.ventas, inventario: Estado.inventario, clientes: Estado.clientes, gastos: Estado.gastos, costosProductos: Estado.costosProductos, exportadoEn: new Date().toISOString() };
                const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
            },
            cargarJSON(event) {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const datos = JSON.parse(e.target.result);
                        const result = await Swal.fire({ title: 'Cargar datos', text: '¿Cómo cargar los datos?', icon: 'question', showDenyButton: true, showCancelButton: true, confirmButtonText: 'Combinar', denyButtonText: 'Reemplazar todo', cancelButtonText: 'Cancelar', confirmButtonColor: '#4472C4', denyButtonColor: '#fd7e14' });
                        if (result.isConfirmed) {
                            if (datos.ventas) Estado.ventas = [...Estado.ventas, ...datos.ventas];
                            if (datos.inventario) datos.inventario.forEach(n => { const e = Estado.inventario.find(x => x.sku === n.sku); if (e) e.stock += n.stock; else Estado.inventario.push(n); });
                            if (datos.gastos) Estado.gastos = [...Estado.gastos, ...datos.gastos];
                        } else if (result.isDenied) {
                            if (datos.ventas) Estado.ventas = datos.ventas;
                            if (datos.inventario) Estado.inventario = datos.inventario;
                            if (datos.clientes) Estado.clientes = datos.clientes;
                            if (datos.gastos) Estado.gastos = datos.gastos;
                            if (datos.costosProductos) Estado.costosProductos = datos.costosProductos;
                        } else return;
                        await Storage.guardarVentas(); await Storage.guardarInventario(); await Storage.guardarClientes(); await Storage.guardarGastos(); await Storage.guardarCostos();
                        UI.actualizarVistas();
                        Swal.fire('✅ Datos cargados', 'Los datos fueron importados correctamente.', 'success');
                    } catch (err) { Swal.fire('Error', 'Archivo inválido: ' + err.message, 'error'); }
                };
                reader.readAsText(file);
                event.target.value = '';
            }
        };

        const SidebarMenu = {
            currentTab: 'registro',
            tabNames: { registro: 'Registro', historial: 'Historial', reportes: 'Reportes', resumen: 'Resumen', inventario: 'Inventario', clientes: 'Clientes', 'cuentas-cobrar': 'Cuentas por Cobrar', gastos: 'Gastos', rentabilidad: 'Rentabilidad', 'ordenes-servicio': 'Órdenes de Servicio', proveedores: 'Proveedores', compras: 'Compras', devoluciones: 'Devoluciones', cotizaciones: 'Cotizaciones', 'cierre-caja': 'Cierre de Caja', usuarios: 'Gestión de Usuarios', configuracion: 'Configuración', papelera: 'Papelera de Reciclaje' },
            open() { document.getElementById('sidebar').classList.add('open'); const o = document.getElementById('menuOverlay'); if (o) o.classList.add('open'); document.body.style.overflow = 'hidden'; },
            close() { document.getElementById('sidebar').classList.remove('open'); const o = document.getElementById('menuOverlay'); if (o) o.classList.remove('open'); document.body.style.overflow = ''; },
            toggle() { if (document.getElementById('sidebar').classList.contains('open')) this.close(); else this.open(); },
            selectTab(tabId) {
                this.close();
                UI.switchTab(tabId);
            }
        };

        const UI = {
            actualizarAlertasCuentasCobrar() {
                const existing = document.getElementById('alertas-globales-cuentas');
                
                if (sessionStorage.getItem('ignorarCuentasCobrar') === 'true') {
                    if (existing) existing.remove();
                    return;
                }
                
                // Ocultar si estamos en la pestaña de cuentas por cobrar
                if (typeof SidebarMenu !== 'undefined' && SidebarMenu.currentTab === 'cuentas-cobrar') {
                    if (existing) existing.style.display = 'none';
                    return;
                } else if (existing) {
                    existing.style.display = 'flex';
                }
                
                let container = existing;
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'alertas-globales-cuentas';
                    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
                    document.body.appendChild(container);
                }
                
                const pendientes = (typeof Estado !== 'undefined' && Estado.ventas) ? Estado.ventas.filter(v => v.estadoPago === 'Pendiente' && v.saldoPendiente > 0) : [];
                
                if (!pendientes.length) {
                    container.innerHTML = '';
                    return;
                }
                
                const totalPendiente = pendientes.reduce((s, v) => s + v.saldoPendiente, 0);

                container.innerHTML = `
                    <div style="background:var(--danger);border-left:8px solid #a30e1f;padding:16px 20px;border-radius:10px;box-shadow:0 8px 25px rgba(220,53,69,0.5);font-size:14px;color:#fff;display:flex;align-items:center;gap:15px;pointer-events:auto;animation:bounceIn 0.5s ease; max-width: 420px; position:relative;">
                        <div style="font-size:2.2em;animation:shake 1.5s infinite;">🚨</div>
                        <div style="flex:1;">
                            <strong style="display:block;margin-bottom:6px;font-size:1.2em;letter-spacing:0.5px;">¡ATENCIÓN: Cuentas Pendientes!</strong>
                            Tienes <b style="font-size:1.1em;">${pendientes.length}</b> cuenta(s) por cobrar (Total: <b style="font-size:1.1em;">S/ ${totalPendiente.toFixed(2)}</b>)
                        </div>
                        <div style="display:flex;flex-direction:column;gap:5px;">
                            <button onclick="SidebarMenu.selectTab('cuentas-cobrar')" style="background:#fff;color:var(--danger);border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:900;font-size:12px;box-shadow:0 2px 5px rgba(0,0,0,0.2);text-transform:uppercase;">Ver ahora</button>
                            <button onclick="sessionStorage.setItem('ignorarCuentasCobrar', 'true'); UI.actualizarAlertasCuentasCobrar();" style="background:transparent;color:#ffb3b3;border:none;text-decoration:underline;padding:4px;cursor:pointer;font-size:11px;" title="Ignorar esta sesión">Ocultar</button>
                        </div>
                    </div>
                `;
            },
            actualizarAlertasInventario() {
                let container = document.getElementById('alertas-globales-inventario');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'alertas-globales-inventario';
                    container.style.cssText = 'position:fixed;top:90px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
                    document.body.appendChild(container);
                }
                const pendientes = (typeof Estado !== 'undefined' && Estado.inventario) ? Estado.inventario.filter(i => i.faltaInventario) : [];
                if (!pendientes.length) {
                    container.innerHTML = '';
                    return;
                }
                container.innerHTML = pendientes.map(p => `
                    <div style="background:rgba(255,193,7,0.15);border-left:4px solid var(--warning);padding:12px 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:13px;color:#856404;display:flex;align-items:center;gap:12px;pointer-events:auto;animation:fadeIn 0.3s ease;">
                        <div style="font-size:1.5em;">⚠️</div>
                        <div>
                            <strong style="display:block;margin-bottom:2px;">Falta Inventario</strong>
                            ${p.nombre} (${p.sku})
                        </div>
                        <button onclick="UI.resolverFaltaInventario('${p.sku}')" style="background:#ffc107;color:#000;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;margin-left:auto;">Ingresar</button>
                        <button onclick="UI.descartarFaltaInventario('${p.sku}')" style="background:transparent;color:#dc3545;border:1px solid #dc3545;padding:6px 12px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;margin-left:5px;" title="Descartar Producto">🗑️</button>
                    </div>
                `).join('');
            },
            async resolverFaltaInventario(sku) {
                const item = Estado.inventario.find(i => i.sku === sku);
                if (!item) return;
                const { value: stock } = await Swal.fire({
                    title: 'Ingresar Inventario',
                    text: `¿Cuánto inventario físico queda de ${item.nombre}?`,
                    input: 'number',
                    inputAttributes: { min: 0, step: 1 },
                    showCancelButton: true,
                    confirmButtonText: '✅ Guardar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#28a745',
                    preConfirm: (val) => {
                        if (val === '' || val === null) { Swal.showValidationMessage('Ingresa una cantidad'); return false; }
                        return parseInt(val);
                    }
                });
                if (stock !== undefined) {
                    item.stock = stock;
                    item.faltaInventario = false;
                    await Storage.actualizarProducto(item);
                    this.actualizarAlertasInventario();
                    Toastify({ text: '✅ Inventario guardado', duration: 3000, backgroundColor: 'linear-gradient(135deg,#28a745,#20c997)' }).showToast();
                    if (SidebarMenu.currentTab === 'inventario' && typeof Inventario !== 'undefined') Inventario.actualizarTabla();
                }
            },
            async descartarFaltaInventario(sku) {
                const item = Estado.inventario.find(i => i.sku === sku);
                if (!item) return;
                const confirm = await Swal.fire({
                    title: '¿Descartar Producto?',
                    text: `El producto ${item.nombre} se eliminará del inventario porque no confirmaste su stock.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sí, descartar',
                    cancelButtonText: 'Cancelar'
                });
                if (confirm.isConfirmed) {
                    Estado.inventario = Estado.inventario.filter(i => i.sku !== sku);
                    await Storage.eliminarProducto(sku);
                    this.actualizarAlertasInventario();
                    if (SidebarMenu.currentTab === 'inventario' && typeof Inventario !== 'undefined') Inventario.actualizarTabla();
                    Toastify({ text: '🗑️ Producto descartado', duration: 3000, style: { background: '#dc3545' } }).showToast();
                }
            },
            switchTab(tabId) {
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
                const tab = document.getElementById(tabId);
                if (tab) tab.classList.add('active');
                const btn = document.getElementById('sidebarTab-' + tabId);
                if (btn) btn.classList.add('active');
                const nameEl = document.getElementById('currentTabName');
                if (nameEl) nameEl.textContent = SidebarMenu.tabNames[tabId] || tabId;
                SidebarMenu.currentTab = tabId;
                if (tabId === 'historial') Filtros.aplicarFiltros();
                if (tabId === 'resumen') Dashboard.actualizar();
                if (tabId === 'reportes') Reportes.generarReporte();
                if (tabId === 'clientes') Clientes.renderizarLista();
                if (tabId === 'cuentas-cobrar') CuentasCobrar.actualizar();
                if (tabId === 'gastos') Gastos.renderizarLista();
                if (tabId === 'rentabilidad') Rentabilidad.actualizar();
                if (tabId === 'inventario') Inventario.actualizarTabla();
                if (tabId === 'ordenes-servicio') OrdenesServicio.cargarYRenderizar();
                if (tabId === 'usuarios') GestionUsuarios.cargarTodos();
                if (tabId === 'proveedores') { Proveedores.actualizarLista(); }
                if (tabId === 'compras') { Compras.actualizarVista(); }
                if (tabId === 'devoluciones') { Devoluciones.actualizarVista(); }
                if (tabId === 'cotizaciones') { Cotizaciones.actualizarVista(); }
                if (tabId === 'cierre-caja') { CierreCaja.actualizarVista(); }
                if (tabId === 'configuracion') ConfiguracionNegocio.cargar();
                if (tabId === 'papelera' && typeof Papelera !== 'undefined') Papelera.actualizarVista();
            },
            actualizarVistas() {
                // Guardar scroll position del view-container
                const viewContainer = document.querySelector('.view-container');
                const scrollPos = viewContainer ? viewContainer.scrollTop : 0;

                const inputVendedor = document.getElementById('vendedor');
                if (inputVendedor && typeof Auth !== 'undefined') {
                    if (Auth.usuarioActual) {
                        inputVendedor.value = Auth.usuarioActual.nombre || Auth.usuarioActual.email || 'Desconocido';
                    } else if (Auth.esAdmin) {
                        inputVendedor.value = 'Administrador';
                    } else if (Auth.modoInvitado) {
                        inputVendedor.value = 'Invitado';
                    } else {
                        inputVendedor.value = 'Sistema';
                    }
                }

                if (this.actualizarAlertasInventario) this.actualizarAlertasInventario();
                if (this.actualizarAlertasCuentasCobrar) this.actualizarAlertasCuentasCobrar();
                Dashboard.actualizar();
                Filtros.aplicarFiltros();
                CuentasCobrar.actualizar();
                Clientes.renderizarLista();
                Gastos.renderizarLista();
                Rentabilidad.actualizar();
                Reportes.generarReporte();
                Inventario.actualizarTabla();
                OrdenesServicio.cargarYRenderizar();
                Devoluciones.actualizarVista();
                Cotizaciones.actualizarVista();
                CierreCaja.actualizarVista();
                Compras.actualizarVista();
                Proveedores.actualizarLista();

                // Restaurar scroll position después del renderizado asíncrono
                if (viewContainer) {
                    setTimeout(() => {
                        viewContainer.scrollTop = scrollPos;
                    }, 100);
                }
            }
        };

        const Dashboard = {
            actualizar() {
                const transacciones = window.obtenerDatosFiltradosGlobales();
                const totalVentas = transacciones.reduce((s, v) => s + v.total, 0);
                const totalCobrado = transacciones.reduce((s, v) => s + (v.montoRecibido !== undefined ? v.montoRecibido : v.adelanto), 0);
                const pendiente = transacciones.reduce((s, v) => s + (v.saldoPendiente || 0), 0);
                const hoy = new Date().toISOString().slice(0, 10);
                const ventasHoy = transacciones.filter(v => v.fecha === hoy).reduce((s, v) => s + v.total, 0);
                const cards = document.getElementById('summary-cards');
                if (cards) cards.innerHTML = `
                    <div class="card"><h3>💰 Total Ventas</h3><div class="value">S/${totalVentas.toFixed(2)}</div></div>
                    <div class="card"><h3>✅ Total Cobrado</h3><div class="value" style="color:#28a745;">S/${totalCobrado.toFixed(2)}</div></div>
                    <div class="card"><h3>⏳ Por Cobrar</h3><div class="value" style="color:#dc3545;">S/${pendiente.toFixed(2)}</div></div>
                    <div class="card"><h3>📅 Ventas Hoy</h3><div class="value" style="color:var(--primary);">S/${ventasHoy.toFixed(2)}</div></div>`;
                this.actualizarGraficoMetodo();
                this.stockAlerts();
                this.ventasPorCategoria();
            },
            actualizarGraficoMetodo() {
                const canvas = document.getElementById('metodoChart');
                if (!canvas) return;
                const metodos = {};
                window.obtenerDatosFiltradosGlobales().forEach(v => { const m = v.metodo || 'Sin método'; metodos[m] = (metodos[m] || 0) + v.total; });
                if (Estado.metodoChart) Estado.metodoChart.destroy();
                Estado.metodoChart = new Chart(canvas, {
                    type: 'bar',
                    data: { labels: Object.keys(metodos), datasets: [{ label: 'Total (S/)', data: Object.values(metodos), backgroundColor: ['#4472C4', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14'] }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                });
            },
            stockAlerts() {
                const c = document.getElementById('stock-alerts');
                if (!c) return;
                const bajo = Estado.inventario.filter(i => i.stock <= i.reorderThreshold);
                if (!bajo.length) { c.innerHTML = ''; return; }
                c.innerHTML = `<div style="background:rgba(255,193,7,0.15);border:2px solid var(--warning);border-radius:10px;padding:20px;margin-bottom:20px;">
                    <h3 style="color:#856404;margin-bottom:12px;">⚠️ Stock Bajo (${bajo.length} productos)</h3>
                    ${bajo.map(i => `<div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #ffc10755;">
                        <span>${i.nombre} <small style="color:#999;">(${i.sku})</small></span>
                        <span style="color:${i.stock === 0 ? '#dc3545' : '#fd7e14'};font-weight:700;">${i.stock === 0 ? 'SIN STOCK' : i.stock + ' unid.'}</span>
                    </div>`).join('')}
                </div>`;
            },
            ventasPorCategoria() {
                const c = document.getElementById('ventas-por-categoria');
                if (!c) return;
                const cats = {};
                window.obtenerDatosFiltradosGlobales().forEach(v => { const ct = v.categoria || 'Sin cat.'; cats[ct] = (cats[ct] || 0) + v.total; });
                const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
                const total = sorted.reduce((s, [, v]) => s + v, 0);
                c.innerHTML = `<div style="background:var(--bg-surface);border-radius:10px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <h3 style="margin-bottom:15px;color:var(--text-primary);">📊 Ventas por Categoría</h3>
                    ${sorted.map(([cat, val]) => {
                    const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
                    return `<div style="margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${cat}</span><span style="font-weight:600;">S/${val.toFixed(2)} (${pct}%)</span></div>
                            <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${pct}%;">${pct}%</div></div>
                        </div>`;
                }).join('')}
                </div>`;
            }
        };

        const Filtros = {
            aplicarFiltros() {
                let ventas = window.obtenerDatosFiltradosGlobales();
                const busq = (document.getElementById('busqueda') || {}).value?.toLowerCase() || '';
                const desde = (document.getElementById('filtro-fecha-desde') || {}).value || '';
                const hasta = (document.getElementById('filtro-fecha-hasta') || {}).value || '';
                const cat = (document.getElementById('filtro-categoria') || {}).value || '';
                const metodo = (document.getElementById('filtro-metodo') || {}).value || '';
                const estado = (document.getElementById('filtro-estado') || {}).value || '';
                if (busq) ventas = ventas.filter(v => (v.producto || '').toLowerCase().includes(busq) || (v.cliente || '').toLowerCase().includes(busq) || (v.sku || '').toLowerCase().includes(busq));
                if (desde) ventas = ventas.filter(v => v.fecha >= desde);
                if (hasta) ventas = ventas.filter(v => v.fecha <= hasta);
                if (cat) ventas = ventas.filter(v => v.categoria === cat);
                if (metodo) ventas = ventas.filter(v => (v.metodo || '').includes(metodo));
                if (estado) ventas = ventas.filter(v => v.estadoPago === estado);
                Estado.ventasFiltradas = ventas;
                const contador = document.getElementById('contador-resultados');
                if (contador) contador.textContent = `${ventas.length} resultado(s)`;
                this.renderizarTabla(ventas);
            },
            limpiarFiltros() {
                ['busqueda', 'filtro-fecha-desde', 'filtro-fecha-hasta', 'filtro-categoria', 'filtro-metodo', 'filtro-estado'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
                this.aplicarFiltros();
            },
            renderizarTabla(ventas) {
                const c = document.getElementById('tabla-ventas');
                if (!c) return;
                if (!ventas.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">No hay ventas que coincidan.</p>'; return; }
                // Destruir DataTable existente antes de re-renderizar
                if (typeof $ !== 'undefined' && $.fn.DataTable && $.fn.DataTable.isDataTable('#miTablaVentas')) {
                    $('#miTablaVentas').DataTable().destroy();
                }
                const mostrarDetalles = window._mostrarDetallesVenta;
                c.innerHTML = `<table id="miTablaVentas" class="${!mostrarDetalles ? 'mobile-hide-extra' : ''}"><thead><tr><th>Fecha</th><th class="col-extra">SKU</th><th>Producto</th><th class="col-extra">Categoría</th><th class="col-extra">Cant.</th><th class="col-extra">Precio</th><th>Total</th>${mostrarDetalles ? '<th>Monto Recibido</th><th>Vuelto</th>' : ''}<th class="col-extra">Cliente</th><th class="col-extra">Método</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>` +
                    ventas.map(v => {
                        const [y, m, d] = v.fecha.split('-');
                        const metodoCombinado = Ventas.calcularMetodoCombinado(v.historialPagos || [{ monto: v.adelanto, metodo: v.metodo || '-' }]);
                        const montoRecibido = v.montoRecibido !== undefined ? v.montoRecibido : v.adelanto;
                        const vuelto = v.vuelto || 0;
                        return `<tr>
                        <td>${d}/${m}/${y}</td><td class="col-extra" style="font-size:0.8em;color:#666;">${v.sku || '-'}</td><td>${v.producto}</td><td class="col-extra">${v.categoria || '-'}</td>
                        <td class="col-extra">${v.cantidad}</td><td class="col-extra">S/${v.precio.toFixed(2)}</td><td><strong>S/${v.total.toFixed(2)}</strong></td>
                        ${mostrarDetalles ? `<td>S/${montoRecibido.toFixed(2)}</td><td>S/${vuelto.toFixed(2)}</td>` : ''}
                        <td class="col-extra">${v.cliente || '-'}</td><td class="col-extra">${metodoCombinado}</td>
                        <td>${v.estadoPago === 'Pagado' ? '<span class="estado-pagado">✅ Pagado</span>' : '<span class="estado-pendiente">⏳ Pendiente</span>'}</td>
                        <td style="white-space:nowrap;">
                            ${v.estadoPago === 'Pendiente' ? `<button class="btn-pago" onclick="Ventas.actualizarPago(${v.id})">💰 Pago</button>` : ''}
                            <button class="small-btn" onclick="Boletas.generarDesdeVenta(${v.id})" style="background:linear-gradient(135deg,#1E3A6E,#2B56A5);" title="Generar Boleta">🧾 Boleta</button>
                            <button class="delete-btn" onclick="Ventas.eliminar(${v.id})">🗑️</button>
                        </td>
                    </tr>`;
                    }).join('') + `</tbody></table>`;
                // ── Activar DataTables en la tabla recién renderizada ──
                if (typeof $ !== 'undefined' && $.fn.DataTable) {
                    setTimeout(() => {
                        $('#miTablaVentas').DataTable({
                            language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' },
                            pageLength: 10,
                            order: [],
                            columnDefs: [{ orderable: false, targets: -1 }]
                        });
                    }, 50);
                }
            }
        };

        // ════════════════════════════════════════════════════════════════
        // THEME MANAGER — DARK / LIGHT MODE
        // ════════════════════════════════════════════════════════════════
        const ThemeManager = {
            init() {
                const saved = localStorage.getItem('theme') || 'light';
                this.apply(saved);
            },
            toggle() {
                const current = document.documentElement.getAttribute('data-theme') || 'light';
                const next = current === 'dark' ? 'light' : 'dark';
                this.apply(next);
                localStorage.setItem('theme', next);
            },
            apply(theme) {
                document.documentElement.setAttribute('data-theme', theme);
                const icon = document.getElementById('theme-icon');
                const label = document.getElementById('theme-label');
                if (!icon || !label) return;
                if (theme === 'dark') {
                    icon.textContent = '☀️';
                    label.textContent = 'Modo Claro';
                } else {
                    icon.textContent = '🌙';
                    label.textContent = 'Modo Oscuro';
                }
            }
        };