

        const OrdenesServicio = {
            fotosTemp: [],
            repuestosTemp: [],
            lightboxIndex: 0,
            lightboxFotos: [],
            cargarYRenderizar() {
                this.actualizarCards();
                this.aplicarFiltros();
            },
            cargar() { return Estado.ordenesServicio || []; },
            async guardar(data) { Estado.ordenesServicio = data; await Firebase.guardar('ordenesServicio', data); },
            rellenarDatosCliente() {
                const nombre = document.getElementById('os-cliente').value;
                if (!nombre || !Estado.clientes) return;
                const cliente = Estado.clientes.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
                if (cliente) {
                    if (cliente.dni && !document.getElementById('os-dni').value) document.getElementById('os-dni').value = cliente.dni;
                    if (cliente.telefono && !document.getElementById('os-telefono').value) document.getElementById('os-telefono').value = cliente.telefono;
                }
            },
            rellenarPrecioRepuesto() {
                const nombre = document.getElementById('os-repuesto-input').value;
                if (!nombre || !Estado.inventario) return;
                const producto = Estado.inventario.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
                if (producto) {
                    document.getElementById('os-repuesto-precio').value = producto.precioVenta.toFixed(2);
                }
            },
            agregarRepuesto() {
                const nombre = document.getElementById('os-repuesto-input').value.trim();
                const precio = parseFloat(document.getElementById('os-repuesto-precio').value);
                if (!nombre || isNaN(precio) || precio < 0) {
                    Toastify({ text: '⚠️ Ingrese un repuesto válido y su precio.', duration: 2500, backgroundColor: '#fd7e14' }).showToast();
                    return;
                }
                const producto = Estado.inventario ? Estado.inventario.find(p => p.nombre.toLowerCase() === nombre.toLowerCase()) : null;
                const idProducto = producto ? producto.id : null;
                
                this.repuestosTemp.push({ idProducto, nombre, precio });
                document.getElementById('os-repuesto-input').value = '';
                document.getElementById('os-repuesto-precio').value = '';
                this.renderRepuestos();
            },
            eliminarRepuesto(index) {
                this.repuestosTemp.splice(index, 1);
                this.renderRepuestos();
            },
            renderRepuestos() {
                const list = document.getElementById('os-repuestos-list');
                if (!list) return;
                list.innerHTML = this.repuestosTemp.map((r, i) => `
                    <div style="display:flex;justify-content:space-between;background:var(--bg-card);padding:8px;border-radius:6px;border:1px solid var(--border);">
                        <span>${r.nombre}</span>
                        <span>
                            S/ ${r.precio.toFixed(2)}
                            <button type="button" onclick="OrdenesServicio.eliminarRepuesto(${i})" style="margin-left:8px;background:var(--danger);color:#fff;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:12px;">✖</button>
                        </span>
                    </div>
                `).join('');
                const total = this.repuestosTemp.reduce((sum, r) => sum + r.precio, 0);
                document.getElementById('os-repuestos-total').textContent = total.toFixed(2);
                this.calcularSaldo();
            },
            mostrarFormNuevaOrden() {
                document.getElementById('form-nueva-orden').classList.remove('hidden');
                document.getElementById('os-form-titulo').textContent = '📋 Nueva Orden de Servicio';
                document.getElementById('os-editando-id').value = '';
                
                // Limpiar campos
                ['os-dni', 'os-cliente', 'os-telefono', 'os-tipo-equipo', 'os-marca', 'os-modelo', 'os-serie', 'os-accesorios', 'os-problema', 'os-diagnostico', 'os-costo', 'os-adelanto', 'os-metodo-pago', 'os-fecha-entrega', 'os-notas'].forEach(id => {
                    const el = document.getElementById(id); if (el) el.value = '';
                });
                if (typeof MetodoPagoCustom !== 'undefined') MetodoPagoCustom.limpiar('os-metodo-container', 'os-metodo-pago');
                document.getElementById('os-estado').value = 'Pendiente';
                document.getElementById('os-fecha').valueAsDate = new Date();
                
                document.getElementById('os-tecnico').value = (typeof Auth !== 'undefined' && Auth.usuarioActual) ? (Auth.usuarioActual.nombre || Auth.usuarioActual.email) : 'Administrador';
                
                // Cargar clientes para autocompletado
                const dl = document.getElementById('dl-clientes-os');
                if (dl && typeof Estado !== 'undefined' && Estado.clientes) {
                    dl.innerHTML = Estado.clientes.map(c => `<option value="${c.nombre}">${c.dni ? 'DNI: '+c.dni : ''}</option>`).join('');
                }

                // Cargar repuestos para autocompletado
                const dlRepuestos = document.getElementById('dl-repuestos-os');
                if (dlRepuestos && typeof Estado !== 'undefined' && Estado.inventario) {
                    dlRepuestos.innerHTML = Estado.inventario.filter(i => i.stock > 0).map(i => `<option value="${i.nombre}">Stock: ${i.stock} - S/${i.precioVenta.toFixed(2)}</option>`).join('');
                }
                this.repuestosTemp = [];
                this.renderRepuestos();

                if(typeof MarcasCustom !== 'undefined') MarcasCustom.cargarEnSelect();
                const ordenes = this.cargar();
                const siguiente = ordenes.length > 0 ? Math.max(...ordenes.map(o => parseInt((o.numero || 'OS-0').split('-')[1]) || 0)) + 1 : 1;
                document.getElementById('os-numero').value = `OS-${String(siguiente).padStart(4, '0')}`;
                this.fotosTemp = [];
                this.renderFotosPreview();
                document.getElementById('form-nueva-orden').scrollIntoView({ behavior: 'smooth' });
            },
            cancelarFormulario() { document.getElementById('form-nueva-orden').classList.add('hidden'); this.fotosTemp = []; this.repuestosTemp = []; },
            calcularSaldo() {
                const costoTotal = parseFloat(document.getElementById('os-costo').value) || 0;
                const adelanto = parseFloat(document.getElementById('os-adelanto').value) || 0;
                const saldo = costoTotal - adelanto;
                const disp = document.getElementById('os-saldo-display');
                if (saldo > 0) { disp.style.display = 'block'; document.getElementById('os-saldo-valor').textContent = `S/${saldo.toFixed(2)}`; }
                else disp.style.display = 'none';
            },
            manejarDrop(event) {
                event.preventDefault();
                event.currentTarget.style.background = '#f8f9fa';
                this.procesarArchivos(event.dataTransfer.files);
            },
            agregarFotos(event) { this.procesarArchivos(event.target.files); event.target.value = ''; },
            procesarArchivos(files) {
                if (this.fotosTemp.length >= 5) { Toastify({ text: '⚠️ Máximo 5 fotos', duration: 2500, gravity: 'top', position: 'right', backgroundColor: '#fd7e14' }).showToast(); return; }
                Array.from(files).slice(0, 5 - this.fotosTemp.length).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = e => { this.fotosTemp.push({ dataURL: e.target.result, nombre: file.name }); this.renderFotosPreview(); };
                    reader.readAsDataURL(file);
                });
            },
            renderFotosPreview() {
                const c = document.getElementById('os-fotos-preview'); if (!c) return;
                c.innerHTML = this.fotosTemp.map((f, i) => `<div class="os-foto-thumb"><img src="${f.dataURL}" alt="foto"><button class="os-foto-del" onclick="OrdenesServicio.eliminarFotoTemp(${i})">✕</button></div>`).join('');
            },
            eliminarFotoTemp(idx) { this.fotosTemp.splice(idx, 1); this.renderFotosPreview(); },
            async guardarOrden() {
                // Verificar si la caja está abierta
                if (typeof CierreCaja !== 'undefined') {
                    const estadoCaja = CierreCaja.cargarEstado();
                    if (!estadoCaja.abierta) {
                        const { isConfirmed } = await Swal.fire({
                            icon: 'warning',
                            title: '🔒 Caja Cerrada',
                            text: 'Debes abrir la caja antes de registrar una orden de servicio.',
                            confirmButtonText: '🔓 Abrir Caja',
                            showCancelButton: true,
                            cancelButtonText: 'Cancelar'
                        });
                        if (isConfirmed) {
                            CierreCaja.abrirCaja();
                        }
                        return;
                    }
                }
                const cliente = document.getElementById('os-cliente').value.trim();
                const tipoEquipo = document.getElementById('os-tipo-equipo').value;
                const problema = document.getElementById('os-problema').value.trim();
                const fecha = document.getElementById('os-fecha').value;
                if (!cliente || !tipoEquipo || !problema || !fecha) { Swal.fire('Error', 'Completa los campos obligatorios (*)', 'error'); return; }
                const editandoId = document.getElementById('os-editando-id').value;
                const ordenes = this.cargar();

                // Registro o actualización silenciosa de cliente
                if (cliente) {
                    const clienteExistente = Estado.clientes.find(c => c.nombre.toLowerCase() === cliente.toLowerCase());
                    if (!clienteExistente) {
                        const dniActual = document.getElementById('os-dni') ? document.getElementById('os-dni').value.trim() : '';
                        const telActual = document.getElementById('os-telefono') ? document.getElementById('os-telefono').value.trim() : '';
                        const { value: formData, isConfirmed } = await Swal.fire({
                            title: 'Registrar Cliente Nuevo',
                            html: `
                                <div style="text-align:left;font-size:14px;">
                                    <p style="margin-bottom:10px;">Agregar a <strong>${cliente}</strong> a la base de datos:</p>
                                    <input id="swal-dni" class="swal2-input" placeholder="DNI / RUC (Opcional)" value="${dniActual}" style="width:100%; max-width:100%; margin: 5px 0;">
                                    <input id="swal-tel" class="swal2-input" placeholder="Teléfono (Opcional)" value="${telActual}" style="width:100%; max-width:100%; margin: 5px 0;">
                                </div>
                            `,
                            showCancelButton: true,
                            confirmButtonText: 'Guardar y Continuar',
                            cancelButtonText: 'Solo continuar sin guardar',
                            confirmButtonColor: '#2B56A5',
                            preConfirm: () => {
                                return {
                                    dni: document.getElementById('swal-dni').value.trim(),
                                    telefono: document.getElementById('swal-tel').value.trim()
                                }
                            }
                        });
                        
                        if (isConfirmed) {
                            const nuevoCliente = {
                                id: Date.now().toString(),
                                nombre: cliente,
                                dni: formData.dni,
                                telefono: formData.telefono,
                                direccion: '',
                                correo: '',
                                fechaRegistro: new Date().toISOString()
                            };
                            if(!Estado.clientes) Estado.clientes = [];
                            Estado.clientes.push(nuevoCliente);
                            await Storage.agregarCliente(nuevoCliente);
                            if(typeof Clientes !== 'undefined') Clientes.renderizarLista();
                        }
                    } else {
                        const dniIngresado = document.getElementById('os-dni') ? document.getElementById('os-dni').value.trim() : '';
                        const telIngresado = document.getElementById('os-telefono') ? document.getElementById('os-telefono').value.trim() : '';
                        let modificado = false;
                        if (dniIngresado && !clienteExistente.dni) { clienteExistente.dni = dniIngresado; modificado = true; }
                        if (telIngresado && !clienteExistente.telefono) { clienteExistente.telefono = telIngresado; modificado = true; }
                        if (modificado) {
                            await Storage.actualizarCliente(clienteExistente);
                            if(typeof Clientes !== 'undefined') Clientes.renderizarLista();
                        }
                    }
                }

                // Descontar inventario de repuestos si es nueva orden (para que no descuente doble al editar)
                if (!editandoId && this.repuestosTemp.length > 0) {
                    this.repuestosTemp.forEach(rep => {
                        if (rep.idProducto && Estado.inventario) {
                            const invItem = Estado.inventario.find(i => i.id === rep.idProducto);
                            if (invItem && invItem.stock > 0) {
                                invItem.stock -= 1;
                                Storage.actualizarProducto(invItem); // Guardado atómico a la subcolección en background
                            }
                        }
                    });
                    if (typeof UI !== 'undefined' && UI.renderInventario) UI.renderInventario();
                }

                let numFinal = document.getElementById('os-numero').value.trim();
                if (!numFinal) {
                    const siguiente = ordenes.length > 0 ? Math.max(...ordenes.map(o => parseInt((o.numero || 'OS-0').split('-')[1]) || 0)) + 1 : 1;
                    numFinal = `OS-${String(siguiente).padStart(4, '0')}`;
                }
                const metodoData = MetodoPagoCustom.obtenerValores('os-metodo-container', 'os-metodo-pago');
                const metodoPago = typeof metodoData === 'string' ? metodoData : metodoData.string;
                
                const orden = {
                    id: editandoId || Date.now().toString(),
                    numero: numFinal,
                    fecha, cliente,
                    telefono: document.getElementById('os-telefono').value.trim(),
                    tipoEquipo, marca: document.getElementById('os-marca').value.trim(),
                    modelo: document.getElementById('os-modelo').value.trim(),
                    serie: document.getElementById('os-serie').value.trim(),
                    accesorios: document.getElementById('os-accesorios').value.trim(),
                    problema, diagnostico: document.getElementById('os-diagnostico').value.trim(),
                    tecnico: document.getElementById('os-tecnico').value.trim(),
                    estado: document.getElementById('os-estado').value,
                    costo: parseFloat(document.getElementById('os-costo').value) || 0,
                    repuestos: this.repuestosTemp.slice(),
                    adelanto: parseFloat(document.getElementById('os-adelanto').value) || 0,
                    saldo: 0, 
                    metodo: metodoPago,
                    metodoDesglose: metodoData.desglose || [],
                    fechaEntregaEstimada: document.getElementById('os-fecha-entrega').value,
                    notas: document.getElementById('os-notas').value.trim(),
                    fotos: this.fotosTemp.map(f => f.dataURL),
                    createdAt: editandoId ? (ordenes.find(o => o.id === editandoId) || {}).createdAt || new Date().toISOString() : new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                orden.saldo = orden.costo - orden.adelanto;
                
                if (editandoId) { const idx = ordenes.findIndex(o => o.id === editandoId); if (idx !== -1) ordenes[idx] = orden; else ordenes.unshift(orden); }
                else ordenes.unshift(orden);
                await this.guardar(ordenes);
                this.cancelarFormulario();
                this.cargarYRenderizar();
                
                Swal.fire({
                    title: editandoId ? '✅ Orden actualizada' : '✅ Orden creada',
                    text: '¿Deseas imprimir el Ticket de Recepción?',
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: '🖨️ Generar Ticket',
                    cancelButtonText: 'No, gracias',
                    confirmButtonColor: '#1E3A6E'
                }).then(result => {
                    if (result.isConfirmed && typeof Boletas !== 'undefined') {
                        Boletas.generarTicketRecepcion(orden.id);
                    }
                });
            },
            actualizarCards() {
                const ordenes = this.cargar();
                const pendientes = ordenes.filter(o => o.estado === 'Pendiente').length;
                const listos = ordenes.filter(o => o.estado === 'Listo').length;
                const enProceso = ordenes.filter(o => ['En diagnóstico', 'En reparación', 'Esperando repuesto'].includes(o.estado)).length;
                const porCobrar = ordenes.filter(o => o.saldo > 0).reduce((s, o) => s + o.saldo, 0);
                const c = document.getElementById('os-cards'); if (!c) return;
                c.innerHTML = `
                    <div class="card" style="border-left:4px solid var(--warning);"><h3>⏳ Pendientes</h3><div class="value" style="color:#856404;">${pendientes}</div></div>
                    <div class="card" style="border-left:4px solid #4472C4;"><h3>🔧 En Proceso</h3><div class="value" style="color:var(--primary);">${enProceso}</div></div>
                    <div class="card" style="border-left:4px solid #28a745;"><h3>✅ Listos para Entrega</h3><div class="value" style="color:#28a745;">${listos}</div></div>
                    <div class="card" style="border-left:4px solid #dc3545;"><h3>💰 Por Cobrar</h3><div class="value" style="color:#dc3545;">S/${porCobrar.toFixed(2)}</div></div>`;
            },
            limpiarFiltros() {
                ['os-busqueda', 'os-filtro-estado', 'os-filtro-tipo', 'os-filtro-desde', 'os-filtro-hasta'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
                this.aplicarFiltros();
            },
            aplicarFiltros() {
                let ordenes = this.cargar();
                const busq = (document.getElementById('os-busqueda') || {}).value?.toLowerCase() || '';
                const est = (document.getElementById('os-filtro-estado') || {}).value || '';
                const tipo = (document.getElementById('os-filtro-tipo') || {}).value || '';
                const desde = (document.getElementById('os-filtro-desde') || {}).value || '';
                const hasta = (document.getElementById('os-filtro-hasta') || {}).value || '';
                if (busq) ordenes = ordenes.filter(o => (o.cliente || '').toLowerCase().includes(busq) || (o.modelo || '').toLowerCase().includes(busq) || (o.marca || '').toLowerCase().includes(busq) || (o.tecnico || '').toLowerCase().includes(busq) || (o.numero || '').toLowerCase().includes(busq));
                if (est) ordenes = ordenes.filter(o => o.estado === est);
                if (tipo) ordenes = ordenes.filter(o => o.tipoEquipo === tipo);
                if (desde) ordenes = ordenes.filter(o => o.fecha >= desde);
                if (hasta) ordenes = ordenes.filter(o => o.fecha <= hasta);
                const contador = document.getElementById('os-contador'); if (contador) contador.textContent = `${ordenes.length} orden(es)`;
                this.renderizarOrdenes(ordenes);
            },
            renderizarOrdenes(ordenes) {
                const c = document.getElementById('os-tabla-ordenes'); if (!c) return;
                if (!ordenes.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">No hay órdenes de servicio.</p>'; return; }
                const estadoColors = { 'Pendiente': '#ffc107', 'En diagnóstico': '#17a2b8', 'En reparación': '#4472C4', 'Esperando repuesto': '#fd7e14', 'Listo': '#28a745', 'Entregado': '#20c997', 'Cancelado': '#6c757d' };
                c.innerHTML = ordenes.map(o => {
                    const [y, m, d] = o.fecha.split('-');
                    const color = estadoColors[o.estado] || '#6c757d';
                    const fotosHtml = o.fotos && o.fotos.length ? `<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">${o.fotos.map((f, i) => `<div class="os-foto-thumb" onclick="OrdenesServicio.abrirLightbox(${JSON.stringify(o.fotos)},${i})"><img src="${f}" alt="foto"></div>`).join('')}</div>` : '';
                    return `<div class="os-orden-card estado-${o.estado.replace(/\s+/g, '-')}">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                            <div>
                                <span style="font-weight:700;color:var(--primary);font-size:0.95em;">${o.numero || '-'}</span>
                                <span class="os-estado" style="margin-left:8px;background:${color}22;color:${color};">${o.estado}</span>
                                ${o.saldo > 0 ? `<span style="margin-left:8px;background:rgba(239,68,68,0.15);color:#721c24;padding:3px 8px;border-radius:10px;font-size:0.8em;font-weight:700;">⚠️ S/${o.saldo.toFixed(2)} pendiente</span>` : ''}
                            </div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                <button class="small-btn gray" onclick="OrdenesServicio.editarOrden('${o.id}')">✏️ Editar</button>
                                <button class="small-btn" onclick="OrdenesServicio.generarPDFOrden('${o.id}')" style="background:var(--danger);">📄 PDF</button>
                                <button class="small-btn" onclick="Boletas.generarDesdeOrden('${o.id}')" style="background:linear-gradient(135deg,#1E3A6E,#2B56A5);">🧾 Boleta</button>
                                <button class="delete-btn" onclick="OrdenesServicio.eliminarOrden('${o.id}')">🗑️</button>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;font-size:0.88em;color:#555;margin-bottom:8px;">
                            <div>👤 <strong>${o.cliente}</strong>${o.telefono ? ` · 📞 ${o.telefono}` : ''}</div>
                            <div>💻 ${o.tipoEquipo}${o.marca ? ` ${o.marca}` : ''}${o.modelo ? ` — ${o.modelo}` : ''}</div>
                            <div>📅 ${d}/${m}/${y}${o.tecnico ? ` · 🔧 ${o.tecnico}` : ''}</div>
                            <div>💰 S/${o.costo.toFixed(2)} ${o.adelanto > 0 ? `· Adelanto: S/${o.adelanto.toFixed(2)}` : ''}</div>
                        </div>
                        <div style="background:var(--bg-surface-hover);padding:10px;border-radius:6px;font-size:0.88em;margin-bottom:6px;"><strong>Problema:</strong> ${o.problema}</div>
                        ${o.diagnostico ? `<div style="background:rgba(16,185,129,0.1);padding:8px;border-radius:6px;font-size:0.85em;"><strong>Diagnóstico:</strong> ${o.diagnostico}</div>` : ''}
                        ${fotosHtml}
                        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                            ${['Pendiente', 'En diagnóstico', 'En reparación', 'Esperando repuesto', 'Listo', 'Entregado'].map(est =>
                        est !== o.estado ? `<button class="small-btn" style="background:${estadoColors[est] || '#6c757d'};font-size:11px;padding:4px 10px;" onclick="OrdenesServicio.cambiarEstado('${o.id}','${est}')">${est}</button>` : ''
                    ).join('')}
                        </div>
                    </div>`;
                }).join('');
            },
            async cambiarEstado(id, nuevoEstado) {
                const ordenes = this.cargar();
                const idx = ordenes.findIndex(o => o.id === id);
                if (idx === -1) return;
                ordenes[idx].estado = nuevoEstado;
                ordenes[idx].updatedAt = new Date().toISOString();
                await this.guardar(ordenes);
                this.cargarYRenderizar();
                Toastify({ text: `📋 Estado → ${nuevoEstado}`, duration: 2500, gravity: 'top', position: 'right', backgroundColor: `linear-gradient(to right,${nuevoEstado === 'Listo' ? '#28a745,#20c997' : '#4472C4,#2c5aa0'})` }).showToast();
            },
            editarOrden(id) {
                const orden = this.cargar().find(o => String(o.id) === String(id)); if (!orden) return;
                this.mostrarFormNuevaOrden();
                document.getElementById('os-editando-id').value = id;
                document.getElementById('os-form-titulo').textContent = '✏️ Editar Orden';
                document.getElementById('os-numero').value = orden.numero || '';
                document.getElementById('os-fecha').value = orden.fecha;
                document.getElementById('os-cliente').value = orden.cliente;
                document.getElementById('os-telefono').value = orden.telefono || '';
                document.getElementById('os-tipo-equipo').value = orden.tipoEquipo;
                document.getElementById('os-marca').value = orden.marca || '';
                document.getElementById('os-modelo').value = orden.modelo || '';
                document.getElementById('os-serie').value = orden.serie || '';
                document.getElementById('os-accesorios').value = orden.accesorios || '';
                document.getElementById('os-problema').value = orden.problema;
                document.getElementById('os-diagnostico').value = orden.diagnostico || '';
                document.getElementById('os-tecnico').value = orden.tecnico || '';
                document.getElementById('os-estado').value = orden.estado;
                document.getElementById('os-costo').value = orden.costo || '';
                document.getElementById('os-adelanto').value = orden.adelanto || '';
                if (typeof MetodoPagoCustom !== 'undefined') MetodoPagoCustom.setValores('os-metodo-container', 'os-metodo-pago', orden.metodo || '', orden.metodoDesglose || []);
                document.getElementById('os-fecha-entrega').value = orden.fechaEntregaEstimada || '';
                document.getElementById('os-notas').value = orden.notas || '';
                this.repuestosTemp = orden.repuestos ? [...orden.repuestos] : [];
                this.renderRepuestos();
                this.fotosTemp = (orden.fotos || []).map((url, i) => ({ dataURL: url, nombre: `foto_${i + 1}` }));
                this.renderFotosPreview();
                this.calcularSaldo();
            },
            async eliminarOrden(id) {
                const r = await Swal.fire({ title: '¿Eliminar orden?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
                if (!r.isConfirmed) return;
                const itemABorrar = this.cargar().find(x => x.id === id);
                if (itemABorrar) await Papelera.moverA('ordenesServicio', itemABorrar, `Orden: ${itemABorrar.cliente} - ${itemABorrar.tipoEquipo}`);
                await this.guardar(this.cargar().filter(o => o.id !== id));
                this.cargarYRenderizar();
                Toastify({ text: '🗑️ Orden eliminada', duration: 2500, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#dc3545,#c82333)' }).showToast();
            },
            abrirLightbox(fotos, idx) {
                this.lightboxFotos = fotos; this.lightboxIndex = idx;
                document.getElementById('os-lightbox').classList.add('open');
                this._setLightboxImg();
            },
            cerrarLightbox() { document.getElementById('os-lightbox').classList.remove('open'); },
            navLightbox(dir) { this.lightboxIndex = (this.lightboxIndex + dir + this.lightboxFotos.length) % this.lightboxFotos.length; this._setLightboxImg(); },
            _setLightboxImg() { document.getElementById('os-lightbox-img').src = this.lightboxFotos[this.lightboxIndex]; document.getElementById('os-lightbox-counter').textContent = `${this.lightboxIndex + 1} / ${this.lightboxFotos.length}`; },
            generarPDFOrden(id) {
                const orden = this.cargar().find(o => o.id === id); if (!orden) return;
                const { jsPDF } = window.jspdf; const doc = new jsPDF();
                doc.setFillColor(68, 114, 196); doc.rect(0, 0, 210, 40, 'F');
                doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
                doc.text('ORDEN DE SERVICIO TÉCNICO', 105, 20, { align: 'center' });
                doc.setFontSize(11); doc.text(orden.numero || '', 105, 30, { align: 'center' });
                doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
                const [y, m, d] = orden.fecha.split('-');
                let yd = 50;
                [['Cliente', orden.cliente], ['Teléfono', orden.telefono || '-'], ['Fecha', `${d}/${m}/${y}`], ['Equipo', `${orden.tipoEquipo} ${orden.marca || ''} ${orden.modelo || ''}`], ['N° Serie', orden.serie || '-'], ['Estado', orden.estado], ['Técnico', orden.tecnico || '-']].forEach(([l, v]) => { doc.setFont('helvetica', 'bold'); doc.text(`${l}:`, 14, yd); doc.setFont('helvetica', 'normal'); doc.text(v, 55, yd); yd += 7; });
                yd += 5; doc.setFont('helvetica', 'bold'); doc.text('Problema Reportado:', 14, yd); yd += 7; doc.setFont('helvetica', 'normal'); const lines = doc.splitTextToSize(orden.problema, 182); doc.text(lines, 14, yd); yd += lines.length * 5 + 5;
                if (orden.diagnostico) { doc.setFont('helvetica', 'bold'); doc.text('Diagnóstico:', 14, yd); yd += 7; doc.setFont('helvetica', 'normal'); const dl = doc.splitTextToSize(orden.diagnostico, 182); doc.text(dl, 14, yd); yd += dl.length * 5 + 5; }
                yd += 5; doc.setFillColor(240, 244, 255); doc.rect(14, yd - 5, 182, 25, 'F');
                doc.setFont('helvetica', 'bold'); doc.text(`Costo: S/${orden.costo.toFixed(2)}`, 16, yd + 3); doc.text(`Adelanto: S/${orden.adelanto.toFixed(2)}`, 80, yd + 3); doc.text(`Saldo: S/${(orden.costo - orden.adelanto).toFixed(2)}`, 150, yd + 3);
                doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.text('Firma del cliente: _______________________________', 14, yd + 20);
                doc.save(`OrdenServicio_${orden.numero || orden.id}.pdf`);
            },
            exportarExcel() {
                const ordenes = this.cargar(); if (!ordenes.length) { Swal.fire('Sin datos', 'No hay órdenes', 'info'); return; }
                const ws = XLSX.utils.json_to_sheet(ordenes.map(o => ({ Número: o.numero, Fecha: o.fecha, Cliente: o.cliente, Teléfono: o.telefono || '-', Equipo: o.tipoEquipo, Marca: o.marca || '-', Modelo: o.modelo || '-', Serie: o.serie || '-', Problema: o.problema, Estado: o.estado, Técnico: o.tecnico || '-', Costo: o.costo, Adelanto: o.adelanto, Saldo: o.saldo })));
                const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Órdenes');
                XLSX.writeFile(wb, `OrdenesServicio_${new Date().toISOString().slice(0, 10)}.xlsx`);
            },
            exportarPDF() {
                const ordenes = this.cargar(); if (!ordenes.length) { Swal.fire('Sin datos', 'No hay órdenes', 'info'); return; }
                const { jsPDF } = window.jspdf; const doc = new jsPDF();
                doc.setFillColor(68, 114, 196); doc.rect(0, 0, 210, 35, 'F');
                doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
                doc.text('LISTADO DE ÓRDENES DE SERVICIO', 105, 22, { align: 'center' });
                let y = 45; doc.setTextColor(0, 0, 0); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
                ordenes.forEach((o, i) => {
                    if (y > 270) { doc.addPage(); y = 20; }
                    const [yr, mo, da] = (o.fecha || '---').split('-');
                    doc.text(`${i + 1}. ${o.numero || '-'} | ${da || '-'}/${mo || '-'}/${yr || '-'} | ${o.cliente} | ${o.tipoEquipo} ${o.marca || ''} | ${o.estado} | S/${o.costo.toFixed(2)}`, 14, y);
                    y += 7;
                });
                doc.save(`OrdenesServicio_${new Date().toISOString().slice(0, 10)}.pdf`);
            }
        };