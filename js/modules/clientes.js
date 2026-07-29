

        const CuentasCobrar = {
            ordenActual: 'monto',
            actualizar() {
                const pendientes = Estado.ventas.filter(v => v.estadoPago === 'Pendiente' && v.saldoPendiente > 0);
                const totalPendiente = pendientes.reduce((s, v) => s + v.saldoPendiente, 0);
                const cards = document.getElementById('cuentas-por-cobrar-cards');
                if (cards) cards.innerHTML = `
                    <div class="card" style="border-left:4px solid #dc3545;"><h3>📊 Cuentas Pendientes</h3><div class="value">${pendientes.length}</div></div>
                    <div class="card" style="border-left:4px solid var(--warning);"><h3>💰 Total por Cobrar</h3><div class="value" style="color:#dc3545;">S/${totalPendiente.toFixed(2)}</div></div>
                    <div class="card" style="border-left:4px solid #28a745;"><h3>✅ Cuentas Pagadas</h3><div class="value" style="color:#28a745;">${Estado.ventas.filter(v => v.estadoPago === 'Pagado').length}</div></div>`;
                this.renderizarTabla();
            },
            ordenarPor(campo) { this.ordenActual = campo; this.renderizarTabla(); },
            renderizarTabla() {
                const c = document.getElementById('tabla-cuentas-cobrar');
                if (!c) return;
                let pendientes = Estado.ventas.filter(v => v.estadoPago === 'Pendiente' && v.saldoPendiente > 0);
                if (this.ordenActual === 'monto') pendientes.sort((a, b) => b.saldoPendiente - a.saldoPendiente);
                else if (this.ordenActual === 'fecha') pendientes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                else if (this.ordenActual === 'cliente') pendientes.sort((a, b) => (a.cliente || '').localeCompare(b.cliente || ''));
                else if (this.ordenActual === 'dias') pendientes.sort((a, b) => { const da = Math.floor((Date.now() - new Date(a.fecha)) / (1000 * 60 * 60 * 24)); const db = Math.floor((Date.now() - new Date(b.fecha)) / (1000 * 60 * 60 * 24)); return db - da; });
                if (!pendientes.length) { c.innerHTML = '<div style="text-align:center;padding:40px;color:#28a745;"><div style="font-size:3em;">✅</div><h3>¡No hay cuentas pendientes!</h3></div>'; return; }
                c.innerHTML = pendientes.map(v => {
                    const dias = Math.floor((Date.now() - new Date(v.fecha)) / (1000 * 60 * 60 * 24));
                    const [y, m, d] = v.fecha.split('-');
                    const diasClass = dias > 30 ? 'dias-alto' : dias > 7 ? 'dias-medio' : 'dias-nuevo';
                    return `<div class="cliente-card">
                        <div class="cliente-header">
                            <div class="cliente-nombre">${v.producto}</div>
                            <div style="display:flex;gap:10px;align-items:center;">
                                <span class="dias-pendiente ${diasClass}">${dias} días</span>
                                <span style="font-size:1.4em;font-weight:700;color:#dc3545;">S/${v.saldoPendiente.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="cliente-info">
                            <div class="cliente-info-item"><strong>👤 Cliente:</strong> ${v.cliente || 'Anónimo'}</div>
                            <div class="cliente-info-item"><strong>📅 Fecha:</strong> ${d}/${m}/${y}</div>
                            <div class="cliente-info-item"><strong>💰 Total:</strong> S/${v.total.toFixed(2)}</div>
                            <div class="cliente-info-item"><strong>✅ Pagado:</strong> S/${v.adelanto.toFixed(2)}</div>
                        </div>
                        <div style="margin-top:10px;">
                            <button onclick="Ventas.actualizarPago(${v.id})" class="btn-pago" style="padding:10px 20px;border-radius:8px;">💰 Registrar Pago</button>
                            <button onclick="Facturas.generar(${v.id})" class="small-btn" style="margin-left:10px;">📄 PDF</button>
                        </div>
                    </div>`;
                }).join('');
            }
        };

        const Clientes = {
            actualizar() { this.renderizarLista(); },
            mostrarFormNuevoCliente() { document.getElementById('form-nuevo-cliente').classList.remove('hidden'); },
            cancelarNuevoCliente() { document.getElementById('form-nuevo-cliente').classList.add('hidden'); },
            async guardarNuevoCliente() {
                const nombre = document.getElementById('nuevo-cliente-nombre').value.trim();
                if (!nombre) { Swal.fire('Error', 'El nombre es obligatorio', 'error'); return; }
                if (Estado.clientes.find(c => c.nombre.toLowerCase() === nombre.toLowerCase())) { Swal.fire('Ya existe', 'Este cliente ya está registrado.', 'warning'); return; }
                const nuevoCliente = { id: Date.now().toString(), nombre, telefono: document.getElementById('nuevo-cliente-telefono').value.trim(), email: document.getElementById('nuevo-cliente-email').value.trim(), direccion: document.getElementById('nuevo-cliente-direccion').value.trim(), notas: document.getElementById('nuevo-cliente-notas').value.trim(), fechaRegistro: new Date().toISOString() };
                Estado.clientes.push(nuevoCliente);
                await Storage.agregarCliente(nuevoCliente);
                this.cancelarNuevoCliente();
                this.renderizarLista();
                ['nuevo-cliente-nombre', 'nuevo-cliente-telefono', 'nuevo-cliente-email', 'nuevo-cliente-direccion', 'nuevo-cliente-notas'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
                Toastify({ text: '✅ Cliente guardado', duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#00b09b,#96c93d)' }).showToast();
            },
            buscarClientes() {
                const busq = document.getElementById('busqueda-clientes').value.toLowerCase();
                this.renderizarLista(busq);
            },
            renderizarLista(filtro = '') {
                const c = document.getElementById('lista-clientes');
                if (!c) return;
                let clientes = Estado.clientes;
                if (filtro) clientes = clientes.filter(cl => cl.nombre.toLowerCase().includes(filtro) || (cl.telefono || '').includes(filtro) || (cl.email || '').toLowerCase().includes(filtro));
                if (!clientes.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">No hay clientes registrados.</p>'; return; }
                c.innerHTML = clientes.map(cl => {
                    const transacciones = window.obtenerDatosFiltradosGlobales();
                    const ventasCl = transacciones.filter(v => v.cliente && v.cliente.toLowerCase() === cl.nombre.toLowerCase());
                    const totalComprado = ventasCl.reduce((s, v) => s + v.total, 0);
                    // Las órdenes de servicio no manejan saldoPendiente de la misma forma, así que comprobaremos si existe o usaremos 0
                    const pendiente = ventasCl.reduce((s, v) => s + (v.saldoPendiente || 0), 0);
                    return `<div class="cliente-card">
                        <div class="cliente-header">
                            <div class="cliente-nombre">👤 ${cl.nombre}</div>
                            <div class="cliente-actions">
                                <button class="delete-btn" onclick="Clientes.eliminar(${cl.id})">🗑️</button>
                            </div>
                        </div>
                        <div class="cliente-info">
                            ${cl.telefono ? `<div class="cliente-info-item"><strong>📞</strong> ${cl.telefono}</div>` : ''}
                            ${cl.email ? `<div class="cliente-info-item"><strong>📧</strong> ${cl.email}</div>` : ''}
                            ${cl.direccion ? `<div class="cliente-info-item"><strong>📍</strong> ${cl.direccion}</div>` : ''}
                        </div>
                        <div class="cliente-stats">
                            <div class="cliente-stat"><div class="cliente-stat-label">Compras</div><div class="cliente-stat-value">${ventasCl.length}</div></div>
                            <div class="cliente-stat"><div class="cliente-stat-label">Total Comprado</div><div class="cliente-stat-value" style="font-size:1.2em;">S/${totalComprado.toFixed(2)}</div></div>
                            ${pendiente > 0 ? `<div class="cliente-stat"><div class="cliente-stat-label" style="color:var(--danger);font-weight:bold;">DEUDA PENDIENTE</div><div class="cliente-stat-value pendiente" style="font-size:1.2em;color:var(--danger);font-weight:800;">S/${pendiente.toFixed(2)}</div></div>` : ''}
                        </div>
                        ${cl.notas ? `<div style="margin-top:8px;padding:8px;background:var(--bg-surface-hover);border-radius:6px;font-size:0.9em;">📝 ${cl.notas}</div>` : ''}
                    </div>`;
                }).join('');
            },
            async eliminar(id) {
                const r = await Swal.fire({ title: '¿Eliminar cliente?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
                if (!r.isConfirmed) return;
                const itemABorrar = Estado.clientes.find(c => c.id === id);
                if (itemABorrar) await Papelera.moverA('clientes', itemABorrar, `Cliente: ${itemABorrar.nombre}`);
                Estado.clientes = Estado.clientes.filter(c => c.id !== id);
                await Storage.eliminarCliente(id);
                this.renderizarLista();
            },
            exportarClientes() {
                if (!Estado.clientes.length) return Swal.fire('Sin datos', 'No hay clientes', 'info');
                const ws = XLSX.utils.json_to_sheet(Estado.clientes.map(c => ({ Nombre: c.nombre, Teléfono: c.telefono || '-', Email: c.email || '-', Dirección: c.direccion || '-', Notas: c.notas || '-' })));
                const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
                XLSX.writeFile(wb, `Clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
            }
        };