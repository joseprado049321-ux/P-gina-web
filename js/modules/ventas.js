

        const Ventas = {
            init() {
                document.getElementById('ventaForm').addEventListener('submit', (e) => this.registrarVenta(e));

                document.getElementById('sku').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const sku = e.target.value.trim().toUpperCase();
                        if (!sku) return;
                        const item = Estado.inventario.find(i => i.sku === sku);
                        if (item) {
                            document.getElementById('producto').value = item.nombre;
                            const costoInfo = Estado.costosProductos[sku];
                            const precio = costoInfo ? costoInfo.precioVenta : 0;
                            document.getElementById('precio').value = precio.toFixed(2);
                            document.getElementById('cantidad').value = 1;
                            document.getElementById('total-display').value = `S/${precio.toFixed(2)}`;
                            document.querySelector('#ventaForm button[type="submit"]').focus();
                        } else {
                            Toastify({ text: "⚠️ SKU no encontrado", backgroundColor: "#dc3545" }).showToast();
                        }
                    }
                });

                const calcularTotal = () => {
                    const cantidad = parseFloat(document.getElementById('cantidad').value) || 0;
                    const precio = parseFloat(document.getElementById('precio').value) || 0;
                    document.getElementById('total-display').value = `S/${(cantidad * precio).toFixed(2)}`;
                    this.calcularSaldo();
                };
                document.getElementById('cantidad').addEventListener('input', calcularTotal);
                document.getElementById('precio').addEventListener('input', calcularTotal);
                document.getElementById('adelanto').addEventListener('input', () => this.calcularSaldo());
            },
            calcularSaldo() {
                const cantidad = parseFloat(document.getElementById('cantidad').value) || 0;
                const precio = parseFloat(document.getElementById('precio').value) || 0;
                const total = cantidad * precio;
                const adelanto = parseFloat(document.getElementById('adelanto').value) || 0;
                const saldo = total - adelanto;
                const saldoDisplay = document.getElementById('saldo-pendiente-display');
                if (saldo > 0 && adelanto > 0) { saldoDisplay.style.display = 'block'; document.getElementById('saldo-valor').textContent = `S/${saldo.toFixed(2)}`; }
                else saldoDisplay.style.display = 'none';
            },
            async registrarVenta(e) {
                e.preventDefault();
                
                // Verificar si la caja está abierta
                if (typeof CierreCaja !== 'undefined') {
                    const estadoCaja = CierreCaja.cargarEstado();
                    if (!estadoCaja.abierta) {
                        const { isConfirmed } = await Swal.fire({
                            icon: 'warning',
                            title: '🔒 Caja Cerrada',
                            text: 'Debes abrir la caja antes de poder registrar una venta.',
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


                if (!document.getElementById('fecha').value) document.getElementById('fecha').valueAsDate = new Date();
                if (!document.getElementById('categoria').value.trim()) document.getElementById('categoria').value = 'Otros';
                if (!document.getElementById('cliente').value.trim()) document.getElementById('cliente').value = 'Público General';

                const giro = (typeof Estado !== 'undefined' && Estado.configuracion) ? Estado.configuracion.giro : 'tecnico';
                if (giro === 'general') {
                    const totalVenta = (parseFloat(document.getElementById('precio').value) || 0) * (parseInt(document.getElementById('cantidad').value) || 1);
                    const { value: posData, isConfirmed } = await Swal.fire({
                        title: '💵 Cobro Rápido',
                        html: `
                            <div style="font-size:2.2em; font-weight:800; color:var(--primary); margin-bottom:15px; font-family:'Poppins',sans-serif;">Total: S/${totalVenta.toFixed(2)}</div>
                            <label style="display:block;text-align:left;font-weight:600;margin-bottom:5px;">Método de Pago:</label>
                            <select id="swal-pos-metodo" class="swal2-input" style="width:100%;margin:0;" onchange="const isEf = this.value==='Efectivo'; document.getElementById('swal-pos-efectivo-container').style.display = isEf ? 'block' : 'none';">
                                <option value="Efectivo">💵 Efectivo</option>
                                <option value="Yape">📱 Yape / Plin</option>
                                <option value="Tarjeta">💳 Tarjeta</option>
                            </select>
                            <div id="swal-pos-efectivo-container" style="display:block; text-align:left; margin-top:15px; background:var(--bg-body); padding:15px; border-radius:10px; border:1px solid var(--border);">
                                <label style="display:block;font-weight:600;margin-bottom:5px;">¿Con cuánto paga? (S/)</label>
                                <input type="number" id="swal-pos-paga" class="swal2-input" style="width:100%;margin:0;font-size:1.2em;font-weight:bold;color:var(--success);" step="0.01" min="${totalVenta}" placeholder="Ej: 50" oninput="const paga=parseFloat(this.value)||0; const vuelto=paga-${totalVenta}; const el=document.getElementById('swal-pos-vuelto'); el.textContent = vuelto>=0 ? 'S/'+vuelto.toFixed(2) : 'S/0.00'; el.style.color = vuelto>=0 ? 'var(--success)' : 'var(--danger)';">
                                <div style="margin-top:10px; font-size:1.6em; font-weight:800;">VUELTO: <span id="swal-pos-vuelto" style="color:var(--danger);">S/0.00</span></div>
                            </div>`,
                        showCancelButton: true, confirmButtonText: '✅ Confirmar Pago (Enter)', cancelButtonText: 'Cancelar', confirmButtonColor: '#10B981',
                        didOpen: () => { setTimeout(() => document.getElementById('swal-pos-paga').focus(), 100); },
                        preConfirm: () => {
                            const met = document.getElementById('swal-pos-metodo').value.replace('📱 ', '').replace('💳 ', '').replace('💵 ', '').trim();
                            const paga = parseFloat(document.getElementById('swal-pos-paga').value) || 0;
                            if (met === 'Efectivo' && paga < totalVenta) { Swal.showValidationMessage('El monto pagado es insuficiente'); return false; }
                            return { metodo: met, paga: met === 'Efectivo' ? paga : totalVenta };
                        }
                    });

                    if (!isConfirmed) return;
                    MetodoPagoCustom.setValores('metodo-container', 'metodo', posData.metodo);
                    document.getElementById('adelanto').value = totalVenta.toFixed(2);
                }

                const metodoData = MetodoPagoCustom.obtenerValores('metodo-container', 'metodo');
                const metodoPago = typeof metodoData === 'string' ? metodoData : metodoData.string;
                let sku = document.getElementById('sku').value.trim();
                const cantidad = parseInt(document.getElementById('cantidad').value);
                const categoria = document.getElementById('categoria').value;
                if (!sku) {
                    const nombreProd = document.getElementById('producto').value;
                    sku = SkuGen.generarInteligente(nombreProd, categoria);
                    document.getElementById('sku').value = sku;
                    if(typeof Toastify !== 'undefined') {
                        Toastify({ text: '🤖 SKU autogenerado: ' + sku, duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#7C3AED,#5B21B6)' }).showToast();
                    }
                }
                if (sku) {
                    let item = Estado.inventario.find(x => x.sku === sku);
                    if (!item) {
                        const result = await Swal.fire({
                            title: '¡Nuevo SKU!',
                            text: 'Ingrese el Inventario existente',
                            icon: 'info',
                            input: 'number',
                            inputAttributes: { min: 0, step: 1 },
                            showDenyButton: true,
                            showCancelButton: true,
                            confirmButtonText: '✅ Confirmar',
                            denyButtonText: '🕒 Lo ingresaré luego',
                            cancelButtonText: 'Cancelar',
                            confirmButtonColor: '#28a745',
                            denyButtonColor: '#ffc107',
                            cancelButtonColor: '#6c757d',
                            preConfirm: (stockValue) => {
                                if (stockValue === '' || stockValue === null) {
                                    Swal.showValidationMessage('Falta poner el Inventario');
                                    return false;
                                }
                                return parseInt(stockValue);
                            }
                        });

                        let stockInicial = 0;
                        let faltaInventario = false;

                        if (result.isConfirmed) {
                            stockInicial = result.value;
                        } else if (result.isDenied) {
                            faltaInventario = true;
                        } else {
                            Swal.fire('Cancelado', 'No se registró la venta.', 'info');
                            return;
                        }

                        const nuevoNombre = document.getElementById('producto').value || sku;
                        const nuevoPrecio = parseFloat(document.getElementById('precio').value) || 0;
                        item = { sku: sku, nombre: nuevoNombre, stock: stockInicial, precio: nuevoPrecio, reorderThreshold: 5, faltaInventario: faltaInventario };
                        Estado.inventario.push(item);
                        await Storage.agregarProducto(item);
                        if (typeof UI.actualizarAlertasInventario === 'function') UI.actualizarAlertasInventario();
                    }

                    if (!item.faltaInventario && item.stock < cantidad) {
                        Swal.fire({
                            title: 'Stock insuficiente',
                            text: `Stock: ${item.stock} disponibles.`,
                            icon: 'error',
                            showCancelButton: true,
                            confirmButtonText: 'OK',
                            cancelButtonText: '➕ Ingresar Inventario',
                            cancelButtonColor: 'var(--primary)'
                        }).then(result => {
                            if (result.dismiss === Swal.DismissReason.cancel) {
                                const idx = Estado.inventario.indexOf(item);
                                if (idx !== -1) Inventario.ajustarStock(idx);
                            }
                        });
                        return;
                    }
                }
                const montoRecibido = parseFloat(document.getElementById('adelanto').value) || 0;
                const totalCalculado = Math.round(cantidad * parseFloat(document.getElementById('precio').value) * 100) / 100;
                
                if (montoRecibido < totalCalculado) {
                    const { isConfirmed } = await Swal.fire({
                        title: 'Saldo Pendiente',
                        text: `El monto recibido (S/${montoRecibido.toFixed(2)}) es menor al total (S/${totalCalculado.toFixed(2)}). ¿Deseas registrar esta venta con saldo pendiente?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, guardar',
                        cancelButtonText: 'No, corregir'
                    });
                    if (!isConfirmed) return;
                } else if (montoRecibido > totalCalculado) {
                    await Swal.fire('Vuelto a entregar', `S/${(montoRecibido - totalCalculado).toFixed(2)}`, 'info');
                }
                
                const adelantoReal = Math.min(montoRecibido, totalCalculado);
                let costoItem = 0;
                if (sku) {
                    const invItem = Estado.inventario.find(x => x.sku === sku);
                    if (invItem) costoItem = invItem.costo || 0;
                }
                const venta = {
                    id: Date.now(), fecha: document.getElementById('fecha').value,
                    producto: document.getElementById('producto').value, categoria,
                    cantidad, precio: parseFloat(document.getElementById('precio').value),
                    total: totalCalculado, costoReal: costoItem * cantidad,
                    adelanto: adelantoReal, saldoPendiente: 0, estadoPago: 'Pendiente',
                    montoRecibido: montoRecibido, vuelto: montoRecibido > totalCalculado ? montoRecibido - totalCalculado : 0,
                    cliente: document.getElementById('cliente').value, metodo: metodoPago,
                    historialPagos: [], vendedor: (typeof Auth !== 'undefined' && Auth.usuarioActual) ? (Auth.usuarioActual.nombre || Auth.usuarioActual.email) : document.getElementById('vendedor').value.trim(),
                    notas: document.getElementById('notas').value, sku, createdAt: new Date().toISOString(),
                    dni: document.getElementById('dniInput') ? document.getElementById('dniInput').value.trim() : ''
                };
                const dniIngresadoTemp = document.getElementById('dniInput') ? document.getElementById('dniInput').value.trim() : '';
                const telIngresadoTemp = document.getElementById('os-telefono') ? document.getElementById('os-telefono').value.trim() : '';
                venta.saldoPendiente = venta.total - venta.adelanto;
                venta.estadoPago = venta.saldoPendiente <= 0 ? 'Pagado' : 'Pendiente';
                if (adelantoReal > 0) {
                    if (metodoData.desglose && metodoData.desglose.length > 0) {
                        let restante = adelantoReal;
                        metodoData.desglose.forEach(d => {
                            if (d.monto > 0 && restante > 0) {
                                const cobrar = Math.min(d.monto, restante);
                                venta.historialPagos.push({ monto: cobrar, metodo: d.metodo, fecha: new Date().toISOString() });
                                restante -= cobrar;
                            }
                        });
                        if (restante > 0) {
                            venta.historialPagos.push({ monto: restante, metodo: metodoData.desglose[0].metodo, fecha: new Date().toISOString() });
                        }
                    } else {
                        venta.historialPagos.push({ monto: adelantoReal, metodo: metodoPago, fecha: new Date().toISOString() });
                    }
                }
                try {
                    if (venta.sku) {
                        const item = Estado.inventario.find(x => x.sku === venta.sku);
                        if (item) { 
                            await Storage.incrementarStock(venta.sku, -venta.cantidad); 
                            item.stock -= venta.cantidad; 
                            if (item.stock < 0) item.stock = 0; 
                        }
                    }
                    Estado.ventas.unshift(venta);
                    await Storage.agregarVenta(venta);
                    UI.actualizarVistas();
                    const msg = document.getElementById('success-msg');
                    msg.classList.add('show');
                    setTimeout(() => msg.classList.remove('show'), 3000);
                    Toastify({ text: "✅ Venta registrada", duration: 3000, gravity: "top", position: "right", style: { background: "linear-gradient(to right,#00b09b,#96c93d)" } }).showToast();
                } catch (error) {
                    console.error("Error al registrar la venta:", error);
                    if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
                        Swal.fire('❌ Stock Insuficiente', 'Otra caja vendió este producto al mismo tiempo y el stock llegó a cero. La venta ha sido anulada para evitar descuadres.', 'error');
                    } else {
                        Swal.fire('❌ Error', 'Hubo un problema de conexión al registrar la venta. Inténtalo de nuevo.', 'error');
                    }
                    return; // Abortar el resto del proceso
                }
                const ventaGuardada = venta;
                this.limpiarFormulario();
                // Ofrecer generar boleta
                const { isConfirmed: hacerBoleta } = await Swal.fire({
                    icon: 'success',
                    title: '✅ Venta Registrada',
                    html: `<p>¿Deseas generar una boleta electrónica para esta venta?</p>`,
                    showCancelButton: true,
                    confirmButtonText: '🧾 Generar Boleta',
                    cancelButtonText: 'No, gracias',
                    confirmButtonColor: '#1E3A6E',
                    cancelButtonColor: '#6c757d',
                    timer: 8000,
                    timerProgressBar: true
                });
                if (hacerBoleta) {
                    await Boletas.generarDesdeVenta(ventaGuardada.id);
                }
                const nombreCliente = venta.cliente ? venta.cliente.trim() : '';
                if (nombreCliente) {
                    const clienteExistente = Estado.clientes.find(c => c.nombre.toLowerCase() === nombreCliente.toLowerCase());
                    if (!clienteExistente) {
                        const { value: formData, isConfirmed } = await Swal.fire({
                            title: 'Registrar Cliente Nuevo',
                            html: `
                                <div style="text-align:left;font-size:14px;">
                                    <p style="margin-bottom:10px;">Agregar a <strong>${nombreCliente}</strong> a la base de datos:</p>
                                    <input id="swal-dni" class="swal2-input" placeholder="DNI / RUC (Opcional)" value="${dniIngresadoTemp}" style="width:100%; max-width:100%; margin: 5px 0;">
                                    <input id="swal-tel" class="swal2-input" placeholder="Teléfono (Opcional)" value="${telIngresadoTemp}" style="width:100%; max-width:100%; margin: 5px 0;">
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
                                nombre: nombreCliente,
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
                        // Actualización silenciosa de DNI si falta
                        const dniIngresado = document.getElementById('dniInput') ? document.getElementById('dniInput').value.trim() : '';
                        if (dniIngresado && !clienteExistente.dni) {
                            clienteExistente.dni = dniIngresado;
                            await Storage.actualizarCliente(clienteExistente);
                            if(typeof Clientes !== 'undefined') Clientes.renderizarLista();
                        }
                    }
                }
            },
            limpiarFormulario() {
                document.getElementById('ventaForm').reset();
                if (typeof MetodoPagoCustom !== 'undefined') MetodoPagoCustom.limpiar('metodo-container', 'metodo');
                document.getElementById('fecha').valueAsDate = new Date();
                document.getElementById('total-display').value = '';
                document.getElementById('adelanto').value = '';
                document.getElementById('saldo-pendiente-display').style.display = 'none';
            },
            async eliminar(id) {
                const result = await Swal.fire({ title: '¿Eliminar venta?', text: "Esta acción no se puede deshacer", icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
                if (!result.isConfirmed) return;
                try {
                    const venta = Estado.ventas.find(v => v.id === id);
                    if (venta) await Papelera.moverA('ventas', venta, `Venta - Total: S/ ${venta.total || 0}`);
                    if (venta && venta.sku) { const item = Estado.inventario.find(x => x.sku === venta.sku); if (item) { item.stock += venta.cantidad; await Storage.incrementarStock(venta.sku, venta.cantidad); } }
                    Estado.ventas = Estado.ventas.filter(v => v.id !== id);
                    await Storage.eliminarVenta(id);
                    UI.actualizarVistas();
                    Toastify({ text: "🗑️ Venta eliminada", duration: 3000, gravity: "top", position: "right", backgroundColor: "linear-gradient(to right,#ff5f6d,#ffc371)" }).showToast();
                } catch (e) {
                    console.error("Error eliminando venta:", e);
                    Swal.fire('Error', 'Fallo al eliminar la venta. Verifica tu conexión.', 'error');
                }
            },
            calcularMetodoCombinado(historialPagos) {
                if (!historialPagos || !historialPagos.length) return 'Sin método';
                if (historialPagos.length === 1) return historialPagos[0].metodo;
                const metodosOrdenados = historialPagos.map(p => p.metodo);
                const metodosUnicos = [...new Set(metodosOrdenados)];
                if (metodosUnicos.length === 1) return metodosUnicos[0];
                return `${metodosOrdenados[0]}/${metodosOrdenados[metodosOrdenados.length - 1]}`;
            },
            async actualizarPago(id) {
                const venta = Estado.ventas.find(v => v.id === id);
                if (!venta) return;
                if (!venta.historialPagos) venta.historialPagos = [{ monto: venta.adelanto, metodo: venta.metodo, fecha: venta.createdAt }];
                const { value: formValues } = await Swal.fire({
                    title: 'Actualizar Pago',
                    html: `<div style="text-align:left;margin-bottom:15px;"><strong>Total:</strong> S/${venta.total.toFixed(2)}<br><strong>Adelanto:</strong> S/${venta.adelanto.toFixed(2)}<br><strong>Saldo:</strong> S/${venta.saldoPendiente.toFixed(2)}</div>
                        <label>Monto adicional:</label><input id="swal-pago" class="swal2-input" type="number" step="0.01" value="${venta.saldoPendiente.toFixed(2)}">
                        <label style="margin-top:15px;">Método:</label><select id="swal-metodo" class="swal2-input"><option>Efectivo</option><option>Plin</option><option>Yape</option><option>Transferencia</option><option>Tarjeta</option><option>Otro</option></select>`,
                    focusConfirm: false, showCancelButton: true, confirmButtonText: 'Registrar Pago', cancelButtonText: 'Cancelar', confirmButtonColor: '#4472C4',
                    preConfirm: () => {
                        const montoPago = parseFloat(document.getElementById('swal-pago').value) || 0;
                        const metodoPago = document.getElementById('swal-metodo').value;
                        if (montoPago <= 0) { Swal.showValidationMessage('El monto debe ser > 0'); return null; }
                        if (montoPago > venta.saldoPendiente + 0.01) { Swal.showValidationMessage(`Máximo S/${venta.saldoPendiente.toFixed(2)}`); return null; }
                        return { montoPago, metodoPago };
                    }
                });
                if (!formValues) return;
                const { montoPago, metodoPago } = formValues;
                venta.historialPagos.push({ monto: montoPago, metodo: metodoPago, fecha: new Date().toISOString() });
                venta.adelanto += montoPago;
                venta.saldoPendiente = venta.total - venta.adelanto;
                venta.estadoPago = venta.saldoPendiente <= 0.01 ? 'Pagado' : 'Pendiente';
                venta.metodo = Ventas.calcularMetodoCombinado(venta.historialPagos);
                await Storage.actualizarVenta(venta);
                UI.actualizarVistas();
                if (venta.estadoPago === 'Pagado') await Swal.fire({ icon: 'success', title: '¡Pago Completo!', html: `<p>Total pagado. Método: ${venta.metodo}</p>`, confirmButtonColor: '#4472C4' });
                else Toastify({ text: `💰 Saldo restante: S/${venta.saldoPendiente.toFixed(2)}`, duration: 4000, gravity: "top", position: "right", backgroundColor: "linear-gradient(to right,#17a2b8,#138496)" }).showToast();
            }
        };



        // ════════════════════════════════════════════════════════════════
        // MÓDULO: BOLETAS ELECTRÓNICAS
        // ════════════════════════════════════════════════════════════════
        const Boletas = {
            _getNextNumber() {
                const n = parseInt(localStorage.getItem('boletaCounter') || '0') + 1;
                localStorage.setItem('boletaCounter', n);
                return String(n).padStart(6, '0');
            },
            _peekNextNumber() {
                const n = parseInt(localStorage.getItem('boletaCounter') || '0') + 1;
                return String(n).padStart(6, '0');
            },
            _fmtFecha(fechaISO) {
                if (!fechaISO) return { d: '__', m: '__', y: '____' };
                const parts = fechaISO.split('-');
                return { d: parts[2] || '__', m: parts[1] || '__', y: parts[0] || '____' };
            },

            // ─── ENTRADA DESDE VENTA ─────────────────────────────────────
            async generarDesdeVenta(id) {
                const venta = Estado.ventas.find(v => v.id === id);
                if (!venta) return Swal.fire('Error', 'Venta no encontrada', 'error');
                const datos = {
                    tipo: 'venta',
                    ventaId: id,
                    cliente: venta.cliente || '',
                    dni: venta.dni || '',
                    telefono: '',
                    direccion: '',
                    fecha: venta.fecha,
                    items: [{ cant: venta.cantidad, descripcion: venta.producto, codigo: venta.sku || '', precioUnit: venta.precio, total: venta.total }],
                    total: venta.total,
                    metodoPago: venta.metodo || '',
                    notas: venta.notas || '',
                    saldoPendiente: venta.saldoPendiente || 0,
                    montoPagado: venta.total - (venta.saldoPendiente || 0)
                };
                // Buscar datos del cliente en el módulo Clientes
                if (venta.cliente) {
                    const cl = Estado.clientes.find(c => c.nombre.toLowerCase() === venta.cliente.toLowerCase());
                    if (cl) {
                        if (!datos.dni) datos.dni = cl.dni || '';
                        datos.telefono = cl.telefono || '';
                        datos.direccion = cl.direccion || '';
                    }
                }
                await this._flujo(datos);
            },

            // ─── ENTRADA DESDE ORDEN ─────────────────────────────────────
            async generarDesdeOrden(id) {
                const ordenes = OrdenesServicio.cargar();
                const orden = ordenes.find(o => o.id === id);
                if (!orden) return Swal.fire('Error', 'Orden no encontrada', 'error');
                const desc = `Servicio técnico: ${orden.tipoEquipo}${orden.marca ? ' ' + orden.marca : ''}${orden.modelo ? ' - ' + orden.modelo : ''}`;
                const datos = {
                    tipo: 'orden',
                    ordenId: id,
                    cliente: orden.cliente || '',
                    dni: orden.dni || '',
                    telefono: orden.telefono || '',
                    direccion: '',
                    fecha: orden.fecha,
                    items: [{ cant: 1, descripcion: desc, codigo: orden.numero || '', precioUnit: orden.costo, total: orden.costo }],
                    total: orden.costo,
                    metodoPago: orden.metodo || '',
                    notas: orden.notas || '',
                    saldoPendiente: orden.saldoPendiente || 0,
                    montoPagado: orden.costo - (orden.saldoPendiente || 0)
                };
                const cl = Estado.clientes.find(c => c.nombre.toLowerCase() === (orden.cliente || '').toLowerCase());
                if (cl) {
                    if (!datos.dni) datos.dni = cl.dni || '';
                    datos.telefono = cl.telefono || datos.telefono;
                    datos.direccion = cl.direccion || '';
                }
                await this._flujo(datos);
            },

            async generarTicketRecepcion(id) {
                const ordenes = OrdenesServicio.cargar();
                const orden = ordenes.find(o => o.id === id);
                if (!orden) return Swal.fire('Error', 'Orden no encontrada', 'error');
                
                const datosNegocioLocal = {
                    nombre: Estado.configuracion?.nombre || 'Mi Negocio',
                    propietario: Estado.configuracion?.propietario || '',
                    direccion: Estado.configuracion?.direccion || '',
                    documento: Estado.configuracion?.documento || '',
                    telefono: Estado.configuracion?.telefono || '',
                    mensaje: Estado.configuracion?.mensaje || 'Gracias por su preferencia'
                };

                const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
                const W = 80; const PX = 4; const PXR = W - PX; let y = 6; const LH = 4; const FS = 9;
                doc.setFont('courier', 'normal'); doc.setFontSize(FS);
                
                const txtt = (txt, x, yy, opts = {}) => {
                    const text = String(txt || '');
                    if (opts.align === 'right') { const tw = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor; doc.text(text, x - tw, yy); }
                    else if (opts.align === 'center') { const tw = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor; doc.text(text, x - tw / 2, yy); }
                    else { doc.text(text, x, yy); }
                };
                const row = (txt, size, bold = false) => { doc.setFont('courier', bold ? 'bold' : 'normal'); doc.setFontSize(size); txtt(txt, W / 2, y, { align: 'center' }); y += LH; };
                const sep = () => { doc.setFont('courier', 'normal'); doc.setFontSize(FS); txtt('-'.repeat(32), W / 2, y, { align: 'center' }); y += LH; };
                const gap = (lines = 1) => { y += LH * lines; };

                // HEADER
                doc.setFont('courier', 'bold'); doc.setFontSize(14);
                txtt('TICKET DE RECEPCION', W / 2, y, { align: 'center' }); y += LH + 2;
                
                row(`Negocio : ${datosNegocioLocal.nombre}`, FS, true);
                if(datosNegocioLocal.direccion) row(`Direcc. : ${datosNegocioLocal.direccion}`, FS);
                if(datosNegocioLocal.telefono) row(`Tel. : ${datosNegocioLocal.telefono}`, FS);
                gap(0.5); sep(); gap(0.5);

                const f = this._fmtFecha(orden.fecha);
                row(`Orden N.: ${orden.numero}`, FS + 1, true);
                row(`Fecha   : ${f.d}/${f.m}/${f.y}`, FS);
                
                gap(0.5); sep(); gap(0.5);

                // CLIENTE
                doc.setFont('courier', 'bold'); txtt('DATOS DEL CLIENTE', PX, y); y += LH;
                doc.setFont('courier', 'normal');
                const cliLines = doc.splitTextToSize(`Cliente: ${orden.cliente || '—'}`, W - PX * 2);
                cliLines.forEach(l => { txtt(l, PX, y); y += LH; });
                if(orden.telefono) { txtt(`Tel: ${orden.telefono}`, PX, y); y += LH; }
                
                gap(0.5); sep(); gap(0.5);

                // EQUIPO
                doc.setFont('courier', 'bold'); txtt('DATOS DEL EQUIPO', PX, y); y += LH;
                doc.setFont('courier', 'normal');
                txtt(`Tipo : ${orden.tipoEquipo}`, PX, y); y += LH;
                txtt(`Marca: ${orden.marca || '—'}`, PX, y); y += LH;
                txtt(`Mod. : ${orden.modelo || '—'}`, PX, y); y += LH;
                
                gap(0.5); sep(); gap(0.5);

                // PROBLEMA
                doc.setFont('courier', 'bold'); txtt('PROBLEMA REPORTADO', PX, y); y += LH;
                doc.setFont('courier', 'normal');
                const probLines = doc.splitTextToSize(orden.problema || '—', W - PX * 2);
                probLines.forEach(l => { txtt(l, PX, y); y += LH; });

                gap(0.5); sep(); gap(0.5);

                // IMPORTES
                doc.setFont('courier', 'bold'); txtt('IMPORTES', PX, y); y += LH;
                doc.setFont('courier', 'normal');
                txtt(`Costo Aprox:`, PX, y); txtt(`S/ ${Number(orden.costo || 0).toFixed(2)}`, PXR, y, { align: 'right' }); y += LH;
                txtt(`Monto Recibido:`, PX, y); txtt(`S/ ${Number(orden.adelanto || 0).toFixed(2)}`, PXR, y, { align: 'right' }); y += LH;
                doc.setFont('courier', 'bold');
                txtt(`Saldo Pendiente:`, PX, y); txtt(`S/ ${Number(orden.saldo || 0).toFixed(2)}`, PXR, y, { align: 'right' }); y += LH;
                
                gap(1);
                doc.setFont('courier', 'normal'); doc.setFontSize(8);
                const msgLines = doc.splitTextToSize(`Estimado cliente, por favor conserve este ticket. Es indispensable para recoger su equipo.`, W - PX * 2);
                msgLines.forEach(l => { txtt(l, W/2, y, {align: 'center'}); y += LH-1; });
                
                gap(1);
                row('*** COPIA CLIENTE ***', 9, true);

                doc.save(`Ticket_Recepcion_${orden.numero}.pdf`);
                Toastify({ text: `✅ Ticket de Recepción generado`, duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#1E3A6E,#2B56A5)' }).showToast();
            },

            // ─── PASO 1: ELEGIR TIPO ─────────────────────────────────────
            async _flujo(datos) {
                const { value: tipo } = await Swal.fire({
                    title: '🧾 Generar Boleta Electrónica',
                    html: `<p style="margin-bottom:18px;color:var(--text-secondary);">Selecciona el tipo de boleta que deseas generar:</p>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:10px 0;">
                            <div onclick="document.getElementById('tipo-simple').click()" style="border:2px solid var(--border);border-radius:12px;padding:18px;cursor:pointer;transition:all 0.2s;" id="card-simple" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="document.getElementById('tipo-simple').checked&&(this.style.borderColor='var(--primary)')||( this.style.borderColor='var(--border)')">
                                <div style="font-size:2em;margin-bottom:8px;">📄</div>
                                <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">Boleta Simple</div>
                                <div style="font-size:0.82em;color:var(--text-secondary);">Formato texto con líneas de separación. Ideal para impresión rápida.</div>
                                <input type="radio" id="tipo-simple" name="tipo-boleta" value="simple" style="margin-top:10px;">
                            </div>
                            <div onclick="document.getElementById('tipo-estructurada').click()" style="border:2px solid var(--border);border-radius:12px;padding:18px;cursor:pointer;transition:all 0.2s;" id="card-estruct" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="document.getElementById('tipo-estructurada').checked&&(this.style.borderColor='var(--primary)')||( this.style.borderColor='var(--border)')">
                                <div style="font-size:2em;margin-bottom:8px;">📋</div>
                                <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">Boleta Estructurada</div>
                                <div style="font-size:0.82em;color:var(--text-secondary);">Formato empresarial con IGV, garantías y datos completos.</div>
                                <input type="radio" id="tipo-estructurada" name="tipo-boleta" value="estructurada" style="margin-top:10px;">
                            </div>
                        </div>`,
                    showCancelButton: true,
                    confirmButtonText: 'Continuar →',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#2B56A5',
                    focusConfirm: false,
                    preConfirm: () => {
                        const sel = document.querySelector('input[name="tipo-boleta"]:checked');
                        if (!sel) { Swal.showValidationMessage('Por favor selecciona un tipo de boleta'); return null; }
                        return sel.value;
                    }
                });
                if (!tipo) return;
                await this._mostrarFormulario(datos, tipo);
            },

            // ─── PASO 2: FORMULARIO DE DATOS ────────────────────────────
            async _mostrarFormulario(datos, tipo) {
                const numPreview = this._peekNextNumber();
                const f = this._fmtFecha(datos.fecha);
                const esEstructurada = tipo === 'estructurada';

                // Construir filas de items editables
                let itemsHTML = datos.items.map((it, i) => `
                    <tr id="boleta-item-row-${i}">
                        <td><input type="number" min="1" value="${it.cant}" id="bitem-cant-${i}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:55px;" oninput="Boletas._recalcItem(${i})"></td>
                        ${esEstructurada ? `<td><input type="text" value="${it.codigo || ''}" id="bitem-cod-${i}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:80px;"></td>` : ''}
                        <td style="min-width:130px;"><input type="text" value="${it.descripcion}" id="bitem-desc-${i}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:100%;"></td>
                        <td><input type="number" step="0.01" value="${it.precioUnit.toFixed(2)}" id="bitem-pu-${i}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:75px;" oninput="Boletas._recalcItem(${i})"></td>
                        <td id="bitem-tot-${i}" style="font-weight:700;padding:4px 8px;font-size:13px;">S/${it.total.toFixed(2)}</td>
                        <td><button type="button" onclick="Boletas._removeItemRow(${i})" style="background:var(--danger);color:white;border:none;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:14px;line-height:1;">✕</button></td>
                    </tr>`).join('');

                const igvPct = 0.18;
                const subtotalOrig = datos.items.reduce((s, it) => s + it.total, 0);
                const igvOrig = subtotalOrig * igvPct;

                const { value: formData } = await Swal.fire({
                    title: `🧾 ${esEstructurada ? 'Boleta Estructurada' : 'Boleta Simple'} — N° 001-${numPreview}`,
                    width: '720px',
                    html: `
                    <div style="text-align:left;font-family:'Poppins',sans-serif;font-size:13px;color:var(--text-primary);">
                        <div style="background:var(--bg-card);border-radius:10px;padding:14px;margin-bottom:14px;border:1px solid var(--border);">
                            <div style="font-weight:700;color:var(--text-primary);margin-bottom:10px;">📋 Datos del Cliente</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <div>
                                    <label style="font-weight:600;color:var(--text-secondary);font-size:12px;">Nombre / Razón Social *</label>
                                    <input id="bcliente-nombre" class="swal2-input" value="${datos.cliente}" placeholder="Nombre del cliente" style="margin:4px 0 0;font-size:13px;width:100%;">
                                </div>
                                <div>
                                    <label style="font-weight:600;color:var(--text-secondary);font-size:12px;">DNI / RUC</label>
                                    <input id="bcliente-dni" class="swal2-input" value="${datos.dni || ''}" placeholder="DNI o RUC" style="margin:4px 0 0;font-size:13px;width:100%;">
                                </div>
                                <div>
                                    <label style="font-weight:600;color:var(--text-secondary);font-size:12px;">Teléfono</label>
                                    <input id="bcliente-tel" class="swal2-input" value="${datos.telefono || ''}" placeholder="912345678" style="margin:4px 0 0;font-size:13px;width:100%;">
                                </div>
                                <div>
                                    <label style="font-weight:600;color:var(--text-secondary);font-size:12px;">Dirección</label>
                                    <input id="bcliente-dir" class="swal2-input" value="${datos.direccion || ''}" placeholder="Dirección del cliente" style="margin:4px 0 0;font-size:13px;width:100%;">
                                </div>
                            </div>
                        </div>

                        <div style="background:var(--bg-secondary);border-radius:10px;padding:14px;margin-bottom:14px;border:1px solid var(--border);">
                            <div style="font-weight:700;color:var(--text-primary);margin-bottom:10px;">📦 Ítems de la Boleta</div>
                            <div style="overflow-x:auto;">
                                <table id="boleta-items-table" style="width:100%;border-collapse:collapse;font-size:12px;">
                                    <thead>
                                        <tr style="background:var(--primary);color:white;">
                                            <th style="padding:6px 8px;">Cant.</th>
                                            ${esEstructurada ? '<th style="padding:6px 8px;">Código</th>' : ''}
                                            <th style="padding:6px 8px;min-width:140px;">Descripción</th>
                                            <th style="padding:6px 8px;">P. Unit.</th>
                                            <th style="padding:6px 8px;">Total</th>
                                            <th style="padding:6px 8px;"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="boleta-items-tbody">${itemsHTML}</tbody>
                                </table>
                            </div>
                            <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                                <input type="number" min="1" value="1" id="bnew-cant" class="swal2-input" placeholder="Cant." style="margin:0;padding:4px 6px;font-size:12px;width:60px;">
                                ${esEstructurada ? '<input type="text" id="bnew-cod" class="swal2-input" placeholder="Código" style="margin:0;padding:4px 6px;font-size:12px;width:80px;">' : ''}
                                <input type="text" id="bnew-desc" class="swal2-input" placeholder="Descripción" style="margin:0;padding:4px 6px;font-size:12px;flex:1;min-width:100px;">
                                <input type="number" step="0.01" id="bnew-pu" class="swal2-input" placeholder="P. Unit." style="margin:0;padding:4px 6px;font-size:12px;width:80px;">
                                <button type="button" onclick="Boletas._addItemRow(${esEstructurada})" style="background:var(--primary);color:white;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;">➕ Añadir</button>
                            </div>
                        </div>

                        <div style="background:var(--bg-card);border-radius:10px;padding:14px;margin-bottom:${esEstructurada ? '14' : '0'}px;border:1px solid var(--border);">
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                                ${esEstructurada ? `
                                <div style="font-size:12px;">
                                    <label style="font-weight:600;"><input type="checkbox" id="bincluir-igv" onchange="Boletas._recalcTotales()" checked> Incluir IGV (18%)</label>
                                </div>
                                <div style="text-align:right;font-size:13px;line-height:1.9;">
                                    <div>Op. Gravadas: <strong id="b-subtotal">S/${subtotalOrig.toFixed(2)}</strong></div>
                                    <div>IGV (18%): <strong id="b-igv">S/${igvOrig.toFixed(2)}</strong></div>
                                    <div style="font-size:1.1em;color:var(--text-primary);">TOTAL FINAL: <strong id="b-total">S/${(subtotalOrig + igvOrig).toFixed(2)}</strong></div>
                                </div>`
                            : `<div style="font-size:1.1em;font-weight:700;color:var(--text-primary);width:100%;text-align:right;">
                                    TOTAL A PAGAR: <strong id="b-total">S/${subtotalOrig.toFixed(2)}</strong>
                                </div>`}
                            </div>
                        </div>

                        ${esEstructurada ? `
                        <div style="background:var(--bg-secondary);border-radius:10px;padding:14px;border:1px solid var(--border);">
                            <div style="font-weight:700;color:var(--text-primary);margin-bottom:10px;">📝 Notas y Garantía</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <div>
                                    <label style="font-weight:600;color:var(--text-secondary);font-size:12px;">Meses de Garantía</label>
                                    <input id="bgarantia-meses" class="swal2-input" type="number" min="0" value="6" style="margin:4px 0 0;font-size:13px;width:100%;">
                                </div>
                                <div>
                                    <label style="font-weight:600;color:var(--text-secondary);font-size:12px;">Notas adicionales</label>
                                    <input id="bnotas-extra" class="swal2-input" value="${datos.notas || ''}" placeholder="Observaciones..." style="margin:4px 0 0;font-size:13px;width:100%;">
                                </div>
                            </div>
                        </div>`: ''}
                    </div>`,
                    showCancelButton: true,
                    confirmButtonText: '🧾 Generar PDF',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#1E3A6E',
                    didOpen: () => {
                        window._boletaItemsTemp = datos.items.map(it => ({ ...it }));
                        window._boletaEsEstructurada = esEstructurada;
                        if (esEstructurada) Boletas._recalcTotales();
                    },
                    focusConfirm: false,
                    preConfirm: () => {
                        const nombre = document.getElementById('bcliente-nombre').value.trim();
                        if (!nombre) { Swal.showValidationMessage('El nombre del cliente es obligatorio'); return null; }
                        if (!window._boletaItemsTemp || !window._boletaItemsTemp.length) { Swal.showValidationMessage('Debes tener al menos un ítem'); return null; }
                        const result = {
                            cliente: nombre,
                            dni: document.getElementById('bcliente-dni').value.trim(),
                            telefono: document.getElementById('bcliente-tel').value.trim(),
                            direccion: document.getElementById('bcliente-dir').value.trim(),
                            items: window._boletaItemsTemp.slice(),
                        };
                        if (esEstructurada) {
                            result.incluirIGV = document.getElementById('bincluir-igv').checked;
                            result.garantiaMeses = parseInt(document.getElementById('bgarantia-meses').value) || 6;
                            result.notasExtra = document.getElementById('bnotas-extra').value.trim();
                        }
                        const subtotal = result.items.reduce((s, it) => s + it.total, 0);
                        result.subtotal = subtotal;
                        result.igv = esEstructurada && result.incluirIGV ? subtotal * 0.18 : 0;
                        result.total = subtotal + result.igv;
                        return result;
                    }
                });
                if (!formData) return;

                // Actualizar cliente si ya existe
                this._actualizarCliente({ ...datos, ...formData });

                // Generar número de boleta real
                const numBoleta = this._getNextNumber();

                if (tipo === 'simple') {
                    this._generarSimplePDF({ ...datos, ...formData, numBoleta });
                } else {
                    this._generarEstructuradaPDF({ ...datos, ...formData, numBoleta });
                }
            },

            // ─── HELPERS PARA EL FORMULARIO DINÁMICO ────────────────────
            _recalcItem(i) {
                const cant = parseFloat(document.getElementById(`bitem-cant-${i}`)?.value) || 0;
                const pu = parseFloat(document.getElementById(`bitem-pu-${i}`)?.value) || 0;
                const tot = cant * pu;
                const totEl = document.getElementById(`bitem-tot-${i}`);
                if (totEl) totEl.textContent = `S/${tot.toFixed(2)}`;
                if (window._boletaItemsTemp && window._boletaItemsTemp[i]) {
                    window._boletaItemsTemp[i].cant = cant;
                    window._boletaItemsTemp[i].precioUnit = pu;
                    window._boletaItemsTemp[i].total = tot;
                }
                this._recalcTotales();
            },
            _recalcTotales() {
                if (!window._boletaItemsTemp) return;
                const subtotal = window._boletaItemsTemp.reduce((s, it) => s + (it.total || 0), 0);
                const incIGV = document.getElementById('bincluir-igv')?.checked;
                const igv = incIGV ? subtotal * 0.18 : 0;
                const total = subtotal + igv;
                const subEl = document.getElementById('b-subtotal');
                if (subEl) subEl.textContent = `S/${subtotal.toFixed(2)}`;
                const igvEl = document.getElementById('b-igv');
                if (igvEl) igvEl.textContent = `S/${igv.toFixed(2)}`;
                const totEl = document.getElementById('b-total');
                if (totEl) totEl.textContent = `S/${total.toFixed(2)}`;
            },
            _removeItemRow(i) {
                if (!window._boletaItemsTemp) return;
                window._boletaItemsTemp.splice(i, 1);
                // Re-render rows
                const tbody = document.getElementById('boleta-items-tbody');
                if (!tbody) return;
                const esE = window._boletaEsEstructurada;
                tbody.innerHTML = window._boletaItemsTemp.map((it, idx) => `
                    <tr id="boleta-item-row-${idx}">
                        <td><input type="number" min="1" value="${it.cant}" id="bitem-cant-${idx}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:55px;" oninput="Boletas._recalcItem(${idx})"></td>
                        ${esE ? `<td><input type="text" value="${it.codigo || ''}" id="bitem-cod-${idx}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:80px;"></td>` : ''}
                        <td><input type="text" value="${it.descripcion}" id="bitem-desc-${idx}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:100%;min-width:120px;"></td>
                        <td><input type="number" step="0.01" value="${it.precioUnit.toFixed(2)}" id="bitem-pu-${idx}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:75px;" oninput="Boletas._recalcItem(${idx})"></td>
                        <td id="bitem-tot-${idx}" style="font-weight:700;padding:4px 8px;font-size:13px;">S/${it.total.toFixed(2)}</td>
                        <td><button type="button" onclick="Boletas._removeItemRow(${idx})" style="background:var(--danger);color:white;border:none;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:14px;line-height:1;">✕</button></td>
                    </tr>`).join('');
                this._recalcTotales();
            },
            _addItemRow(esE) {
                const cantEl = document.getElementById('bnew-cant');
                const descEl = document.getElementById('bnew-desc');
                const puEl = document.getElementById('bnew-pu');
                const codEl = document.getElementById('bnew-cod');
                const cant = parseFloat(cantEl?.value) || 1;
                const desc = descEl?.value.trim() || '';
                const pu = parseFloat(puEl?.value) || 0;
                const cod = codEl?.value.trim() || '';
                if (!desc || pu <= 0) { alert('Ingresa descripción y precio unitario'); return; }
                if (!window._boletaItemsTemp) window._boletaItemsTemp = [];
                const newItem = { cant, descripcion: desc, codigo: cod, precioUnit: pu, total: cant * pu };
                window._boletaItemsTemp.push(newItem);
                // Re-render
                const tbody = document.getElementById('boleta-items-tbody');
                if (tbody) {
                    const idx = window._boletaItemsTemp.length - 1;
                    tbody.insertAdjacentHTML('beforeend', `
                        <tr id="boleta-item-row-${idx}">
                            <td><input type="number" min="1" value="${cant}" id="bitem-cant-${idx}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:55px;" oninput="Boletas._recalcItem(${idx})"></td>
                            ${esE ? `<td><input type="text" value="${cod}" id="bitem-cod-${idx}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:80px;"></td>` : ''}
                            <td><input type="text" value="${desc}" id="bitem-desc-${idx}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:100%;min-width:120px;"></td>
                            <td><input type="number" step="0.01" value="${pu.toFixed(2)}" id="bitem-pu-${idx}" class="swal2-input" style="margin:0;padding:4px 6px;font-size:12px;width:75px;" oninput="Boletas._recalcItem(${idx})"></td>
                            <td id="bitem-tot-${idx}" style="font-weight:700;padding:4px 8px;font-size:13px;">S/${(cant * pu).toFixed(2)}</td>
                            <td><button type="button" onclick="Boletas._removeItemRow(${idx})" style="background:var(--danger);color:white;border:none;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:14px;line-height:1;">✕</button></td>
                        </tr>`);
                }
                if (cantEl) cantEl.value = '1';
                if (descEl) descEl.value = '';
                if (puEl) puEl.value = '';
                if (codEl) codEl.value = '';
                this._recalcTotales();
            },

            // ─── ACTUALIZAR CLIENTE ──────────────────────────────────────
            async _actualizarCliente(datos) {
                if (!datos.cliente) return;
                const nombreNorm = datos.cliente.toLowerCase();
                const idx = Estado.clientes.findIndex(c => c.nombre.toLowerCase() === nombreNorm);
                if (idx !== -1) {
                    // Actualizar datos existentes
                    if (datos.telefono) Estado.clientes[idx].telefono = datos.telefono;
                    if (datos.direccion) Estado.clientes[idx].direccion = datos.direccion;
                    if (datos.dni) Estado.clientes[idx].dni = datos.dni;
                    await Storage.actualizarCliente(Estado.clientes[idx]);
                    if (typeof Clientes !== 'undefined' && Clientes.renderizarLista) Clientes.renderizarLista();
                } else {
                    // Guardado silencioso de nuevo cliente
                    const nuevoC = {
                        id: Date.now().toString(),
                        nombre: datos.cliente,
                        dni: datos.dni || '',
                        telefono: datos.telefono || '',
                        direccion: datos.direccion || '',
                        notas: '',
                        fechaRegistro: new Date().toISOString()
                    };
                    Estado.clientes.push(nuevoC);
                    await Storage.agregarCliente(nuevoC);
                    if (typeof Clientes !== 'undefined' && Clientes.renderizarLista) Clientes.renderizarLista();
                }
            },
            // ════════════════════════════════════════════════
            // TICKET HELPERS  (compartidos por ambos formatos)
            // ════════════════════════════════════════════════
            _ticket(d, tipo) {
                /*  Medidas ticketera 80 mm
                    Ancho útil  ≈ 72 mm  (margen 4 mm c/lado)
                    Fuente      : Courier  (mono)
                    ~38 caracteres por línea a 8 pt
                -------------------------------------------------------- */
                const { jsPDF } = window.jspdf;
                const W = 80;
                const PX = 4;
                const PXR = 76;
                const CX = 40;
                const FS = 8;
                const LH = 4.4;
                const esE = tipo === 'estructurada';
                const garantiaMeses = d.garantiaMeses || 6;
                const now = new Date();

                // ── Pre-cálculo de altura dinámica ───────────────────────
                let extraRows = 0;
                d.items.forEach(it => {
                    const chars = (it.descripcion || "").length;
                    if (chars > 22) extraRows += Math.ceil(chars / 22) - 1;
                    if (esE && (it.codigo || "").length > 0) extraRows += 1;
                });
                const baseH = esE ? 180 : 135;
                const H = baseH + d.items.length * 14 + extraRows * LH + (d.incluirIGV ? 14 : 0) + (d.notasExtra ? 8 : 0);

                const doc = new jsPDF({ format: [W, H], unit: 'mm', orientation: 'portrait' });
                let y = 6;

                // ── Utilidades de dibujo ─────────────────────────────────
                const txtt = (s, x, yy, opts = {}) => { doc.text(String(s), x, yy, opts); };
                const row = (s, size = FS, bold = false, align = 'left', color = [0, 0, 0]) => {
                    doc.setFontSize(size);
                    doc.setFont('courier', bold ? 'bold' : 'normal');
                    doc.setTextColor(color[0], color[1], color[2]);
                    const xPos = align === 'center' ? CX : align === 'right' ? PXR : PX;
                    doc.text(String(s), xPos, y, { align });
                    y += LH + (size - FS) * 0.35;
                };
                const gap = (mm = 1.5) => { y += mm; };
                const sep = () => { row('.'.repeat(15), FS, false, 'center'); };
                const dbl = () => { row('.'.repeat(15), FS, false, 'center'); };

                // ══════════════════════════════════════════════════════
                // ENCABEZADO DINÁMICO
                // ══════════════════════════════════════════════════════
                // Obtenemos los datos del negocio desde el estado central
                const datosNegocioLocal = {
                    nombre: Estado.configuracion?.nombre || 'Nombre de su Negocio',
                    propietario: Estado.configuracion?.propietario || 'Propietario',
                    direccion: Estado.configuracion?.direccion || 'Dirección del Local',
                    documento: Estado.configuracion?.documento || '___________________',
                    mensaje: Estado.configuracion?.mensaje || '¡Gracias por su preferencia!'
                };

                dbl(); gap(0.5);
                row(datosNegocioLocal.nombre, 12, true, 'center', [30, 58, 110]);
                gap(0.5);
                row('BOLETA DE VENTA', 9, true, 'center');
                gap(0.5); dbl(); gap(1);

                row(`Negocio : ${datosNegocioLocal.nombre}`, FS, true);
                row(`Propiet.: ${datosNegocioLocal.propietario}`, FS);
                row(`Direcc. : ${datosNegocioLocal.direccion}`, FS);
                row(`RUC/DNI : ${datosNegocioLocal.documento}`, FS);
                gap(1); sep();

                const f = this._fmtFecha(d.fecha);
                row(`Boleta N.: 001-${d.numBoleta}`, FS, true);
                row(`Fecha    : ${f.d}/${f.m}/${f.y}`, FS);
                const hh = String(now.getHours()).padStart(2, '0');
                const mm2 = String(now.getMinutes()).padStart(2, '0');
                row(`Hora     : ${hh}:${mm2}`, FS);
                gap(0.5); sep();

                gap(0.5);
                const cliLines = doc.splitTextToSize(`Cliente: ${d.cliente || '—'}`, W - PX * 2);
                cliLines.forEach(l => { row(l, FS); });
                row(`DNI/RUC: ${d.dni || '___________________'}`, FS);
                if (d.telefono) row(`Telef. : ${d.telefono}`, FS);
                if (d.direccion) {
                    const dirLines = doc.splitTextToSize(`Dir.   : ${d.direccion}`, W - PX * 2);
                    dirLines.forEach(l => { row(l, FS); });
                }
                gap(1);

                // ── Cabecera de ítems ──────────────────────────────────
                sep();
                doc.setFont('courier', 'bold'); doc.setFontSize(FS); doc.setTextColor(0, 0, 0);
                txtt('Ct', PX, y);
                txtt('Descripcion', PX + 9, y);
                txtt('P.Unit', PX + 47, y);
                txtt('Total', PXR, y, { align: 'right' });
                y += LH; sep();

                // ── Ítems ──────────────────────────────────────────────
                doc.setFont('courier', 'normal'); doc.setFontSize(FS); doc.setTextColor(0, 0, 0);
                d.items.forEach((it) => {
                    const descText = it.descripcion || '';
                    const maxW = 34;
                    const chunks = [];
                    for (let i = 0; i < descText.length; i += maxW) chunks.push(descText.slice(i, i + maxW));

                    doc.setFont('courier', 'normal');
                    txtt(String(it.cant), PX, y);
                    txtt(chunks[0] || '', PX + 9, y);
                    txtt(it.precioUnit.toFixed(2), PX + 47, y);
                    doc.setFont('courier', 'bold');
                    txtt(`S/${it.total.toFixed(2)}`, PXR, y, { align: 'right' });
                    doc.setFont('courier', 'normal');
                    y += LH;

                    for (let k = 1; k < chunks.length; k++) {
                        txtt('  ' + chunks[k], PX + 9, y); y += LH;
                    }
                    if (esE && it.codigo) {
                        doc.setFont('courier', 'italic'); doc.setFontSize(FS - 0.5);
                        txtt(`  Cod: ${it.codigo}`, PX + 9, y); y += LH;
                        doc.setFont('courier', 'normal'); doc.setFontSize(FS);
                    }
                });

                sep(); gap(1);

                // ── Totales ───────────────────────────────────────────
                if (esE && d.incluirIGV) {
                    doc.setFont('courier', 'normal'); doc.setFontSize(FS); doc.setTextColor(0, 0, 0);
                    txtt('Op. Gravadas:', PX, y);
                    txtt(`S/ ${d.subtotal.toFixed(2)}`, PXR, y, { align: 'right' });
                    y += LH;
                    txtt('IGV (18%):', PX, y);
                    txtt(`S/ ${d.igv.toFixed(2)}`, PXR, y, { align: 'right' });
                    y += LH; sep();
                }

                doc.setFont('courier', 'bold'); doc.setFontSize(FS + 1); doc.setTextColor(0, 0, 0);
                txtt('TOTAL A PAGAR:', PX, y);
                txtt(`S/ ${d.total.toFixed(2)}`, PXR, y, { align: 'right' });
                y += LH + 1;

                if (d.metodoPago) {
                    doc.setFont('courier', 'normal'); doc.setFontSize(FS);
                    txtt(`Metodo: ${d.metodoPago}`, PX, y); y += LH;
                }
                
                if (d.saldoPendiente > 0) {
                    doc.setFont('courier', 'bold');
                    txtt(`Monto Pagado:`, PX, y); txtt(`S/ ${d.montoPagado.toFixed(2)}`, PXR, y, { align: 'right' }); y += LH;
                    doc.setTextColor(220, 0, 0); // Rojo para pendiente
                    txtt(`Por Pagar   :`, PX, y); txtt(`S/ ${d.saldoPendiente.toFixed(2)}`, PXR, y, { align: 'right' }); y += LH;
                    doc.setTextColor(0, 0, 0);
                }

                sep(); gap(1);

                // ── Garantía (sólo estructurada) ─────────────────
                if (esE) {
                    row('GARANTIA/NOTAS:', FS, true, 'left', [30, 58, 110]);
                    const g1 = doc.splitTextToSize(`* Componentes con ${garantiaMeses} meses de garantia por defecto de fabrica.`, W - PX * 2);
                    g1.forEach(l => { row(l, FS - 0.5); });
                    const g2 = doc.splitTextToSize('* Sin devolucion si sellos violados.', W - PX * 2);
                    g2.forEach(l => { row(l, FS - 0.5); });
                    if (d.notasExtra) {
                        const gx = doc.splitTextToSize(`* ${d.notasExtra}`, W - PX * 2);
                        gx.forEach(l => { row(l, FS - 0.5); });
                    }
                    gap(1);
                    doc.setFont('courier', 'normal'); doc.setFontSize(FS - 1); doc.setTextColor(100, 100, 100);
                    txtt('Firma: ________________________', PX, y); y += LH + 2;
                    sep(); gap(1);
                }

                // ── Footer DINÁMICO ────────────────────────────────────────────
                gap(0.5);
                // Imprime el mensaje configurado (o el de por defecto si está vacío)
                row(datosNegocioLocal.mensaje || '¡Gracias por su preferencia!', FS, true, 'center', [30, 58, 110]);
                // Imprime el nombre del negocio y su dirección en la parte inferior
                row(`${datosNegocioLocal.nombre} - ${datosNegocioLocal.direccion}`, FS - 0.5, false, 'center', [80, 80, 80]);
                gap(1); dbl();
                gap(5); // espacio corte

                const label = esE ? 'Estructurada' : 'Simple';
                doc.save(`Boleta_${label}_${d.numBoleta}.pdf`);
                Toastify({ text: `✅ Boleta ${label.toLowerCase()} generada (80 mm)`, duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#1E3A6E,#2B56A5)' }).showToast();
            },

            // ─── PDF: BOLETA SIMPLE ──────────────────────────────────────────────
            _generarSimplePDF(d) {
                this._ticket(d, 'simple');
            },

            // ─── PDF: BOLETA ESTRUCTURADA ────────────────────────────────────────
            _generarEstructuradaPDF(d) {
                this._ticket(d, 'estructurada');
            }
        };

        // Alias para retrocompatibilidad
        const Facturas = {
            generar(id) { Boletas.generarDesdeVenta(id); }
        };

        // ========================================
        // MÓDULO: DEVOLUCIONES
        // ========================================
        const Devoluciones = {
            cargar() {
                return Estado.devoluciones || [];
            },
            async guardar(data) {
                Estado.devoluciones = data; await Firebase.guardar('devoluciones', data);
            },

            actualizarVista() {
                this.actualizarCards();
                this.actualizarTabla();
            },

            actualizarCards() {
                const devs = this.cargar();
                const totalDevuelto = devs.reduce((s, d) => s + d.montoDevuelto, 0);
                const mesActual = new Date().getMonth();
                const devsMes = devs.filter(d => new Date(d.fecha).getMonth() === mesActual);
                document.getElementById('dev-cards').innerHTML = `
            <div class="card"><h3>↩️ Total Devoluciones</h3><div class="value">${devs.length}</div></div>
            <div class="card"><h3>💸 Total Devuelto</h3><div class="value" style="color:#dc3545;">S/${totalDevuelto.toFixed(2)}</div></div>
            <div class="card"><h3>📅 Devoluciones este Mes</h3><div class="value">${devsMes.length}</div></div>`;
            },

            async iniciarDevolucion() {
                // Paso 1: buscar la venta
                const { value: ventaId } = await Swal.fire({
                    title: '🔍 Buscar Venta a Devolver',
                    html: `
                <label style="display:block;text-align:left;font-weight:600;margin-bottom:8px;">Busca por cliente o producto:</label>
                <input id="swal-dev-busq" class="swal2-input" placeholder="Nombre del cliente o producto..." oninput="Devoluciones._filtrarVentas(this.value)">
                <div id="swal-dev-lista" style="max-height:280px;overflow-y:auto;margin-top:10px;"></div>
                <input type="hidden" id="swal-dev-id-sel">`,
                    showCancelButton: true,
                    confirmButtonText: 'Continuar →',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#4472C4',
                    didOpen: () => { Devoluciones._filtrarVentas(''); },
                    preConfirm: () => {
                        const id = document.getElementById('swal-dev-id-sel').value;
                        if (!id) { Swal.showValidationMessage('Selecciona una venta'); return null; }
                        return id;
                    }
                });
                if (!ventaId) return;

                const venta = Estado.ventas.find(v => v.id == ventaId);
                if (!venta) return;

                // Paso 2: detalles de la devolución
                const { value: detalle } = await Swal.fire({
                    title: '↩️ Detalles de la Devolución',
                    html: `
                <div style="text-align:left;background:var(--bg-surface-hover);padding:12px;border-radius:8px;margin-bottom:15px;font-size:0.9em;line-height:1.8;">
                    <strong>Producto:</strong> ${venta.producto}<br>
                    <strong>Cliente:</strong> ${venta.cliente || 'Anónimo'}<br>
                    <strong>Total venta:</strong> S/${venta.total.toFixed(2)}<br>
                    <strong>Cantidad vendida:</strong> ${venta.cantidad}
                </div>
                <label style="display:block;text-align:left;font-weight:600;margin-bottom:4px;">Cantidad a devolver:</label>
                <input id="swal-dev-cant" class="swal2-input" type="number" min="1" max="${venta.cantidad}" value="${venta.cantidad}">
                <label style="display:block;text-align:left;font-weight:600;margin:10px 0 4px;">Motivo:</label>
                <select id="swal-dev-motivo" class="swal2-input">
                    <option value="Producto defectuoso">Producto defectuoso</option>
                    <option value="No era lo solicitado">No era lo solicitado</option>
                    <option value="Cambio de opinión">Cambio de opinión</option>
                    <option value="Daño en transporte">Daño en transporte</option>
                    <option value="Otro">Otro</option>
                </select>
                <label style="display:block;text-align:left;font-weight:600;margin:10px 0 4px;">Tipo de resolución:</label>
                <select id="swal-dev-tipo" class="swal2-input">
                    <option value="Reembolso">💰 Reembolso al cliente</option>
                    <option value="Cambio">🔄 Cambio de producto</option>
                    <option value="Nota de crédito">📄 Nota de crédito</option>
                </select>
                <label style="display:block;text-align:left;font-weight:600;margin:10px 0 4px;">Observaciones:</label>
                <input id="swal-dev-obs" class="swal2-input" placeholder="Observaciones adicionales...">`,
                    showCancelButton: true,
                    confirmButtonText: '✅ Registrar Devolución',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#4472C4',
                    preConfirm: () => {
                        const cant = parseInt(document.getElementById('swal-dev-cant').value) || 0;
                        if (cant <= 0 || cant > venta.cantidad) { Swal.showValidationMessage(`Cantidad inválida (máx. ${venta.cantidad})`); return null; }
                        return {
                            cantidad: cant,
                            motivo: document.getElementById('swal-dev-motivo').value,
                            tipo: document.getElementById('swal-dev-tipo').value,
                            observaciones: document.getElementById('swal-dev-obs').value.trim()
                        };
                    }
                });
                if (!detalle) return;

                // Calcular monto a devolver proporcional
                const montoDevuelto = (venta.precio * detalle.cantidad);
                const devolucion = {
                    id: Date.now().toString(),
                    fecha: new Date().toISOString().slice(0, 10),
                    ventaId: venta.id,
                    producto: venta.producto,
                    sku: venta.sku,
                    cliente: venta.cliente || 'Anónimo',
                    cantidadOriginal: venta.cantidad,
                    cantidadDevuelta: detalle.cantidad,
                    montoDevuelto,
                    motivo: detalle.motivo,
                    tipo: detalle.tipo,
                    observaciones: detalle.observaciones,
                    createdAt: new Date().toISOString()
                };

                // Restaurar stock en inventario
                if (venta.sku) {
                    const invItem = Estado.inventario.find(i => i.sku === venta.sku);
                    if (invItem) {
                        invItem.stock += detalle.cantidad;
                        await Storage.incrementarStock(venta.sku, detalle.cantidad);
                    } else { 
                        const nuevo = { sku: venta.sku, nombre: venta.producto, stock: detalle.cantidad, reorderThreshold: 5 };
                        Estado.inventario.push(nuevo);
                        await Storage.agregarProducto(nuevo);
                    }
                }

                // Marcar la venta como devuelta (parcial o total)
                const vIdx = Estado.ventas.findIndex(v => v.id == ventaId);
                if (vIdx !== -1) {
                    Estado.ventas[vIdx].devolucionParcial = (Estado.ventas[vIdx].devolucionParcial || 0) + detalle.cantidad;
                    if (Estado.ventas[vIdx].devolucionParcial >= venta.cantidad) Estado.ventas[vIdx].devolucionTotal = true;
                    await Storage.actualizarVenta(Estado.ventas[vIdx]);
                }

                const devs = this.cargar();
                devs.unshift(devolucion);
                await this.guardar(devs);
                this.actualizarVista();
                UI.actualizarVistas();

                await Swal.fire({ icon: 'success', title: '↩️ Devolución Registrada', html: `<p>Se restauraron <strong>${detalle.cantidad}</strong> unidades al inventario.</p><p style="margin-top:8px;"><strong>Monto devuelto:</strong> S/${montoDevuelto.toFixed(2)}</p><p><strong>Tipo:</strong> ${detalle.tipo}</p>`, confirmButtonColor: '#4472C4' });
            },

            _filtrarVentas(busq) {
                const lista = document.getElementById('swal-dev-lista');
                if (!lista) return;
                let ventas = Estado.ventas.filter(v => !v.devolucionTotal);
                if (busq) ventas = ventas.filter(v => (v.cliente || '').toLowerCase().includes(busq.toLowerCase()) || (v.producto || '').toLowerCase().includes(busq.toLowerCase()));
                ventas = ventas.slice(0, 20);
                if (!ventas.length) { lista.innerHTML = '<p style="text-align:center;color:#aaa;padding:10px;font-size:0.85em;">Sin resultados</p>'; return; }
                lista.innerHTML = ventas.map(v => {
                    const [y, m, d] = v.fecha.split('-');
                    return `<div onclick="document.getElementById('swal-dev-id-sel').value='${v.id}';document.querySelectorAll('.dev-item').forEach(el=>el.style.borderColor='#dee2e6');this.style.borderColor='#4472C4';"
                style="padding:10px;border:2px solid #dee2e6;border-radius:8px;margin-bottom:6px;cursor:pointer;transition:border-color 0.15s;text-align:left;" class="dev-item">
                <div style="font-weight:600;font-size:0.9em;">${v.producto}</div>
                <div style="font-size:0.8em;color:#666;">${v.cliente || 'Anónimo'} · ${d}/${m}/${y} · S/${v.total.toFixed(2)}</div>
            </div>`;
                }).join('');
            },

            actualizarTabla() {
                const c = document.getElementById('tabla-devoluciones');
                const devs = this.cargar();
                if (!devs.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">↩️ No hay devoluciones registradas</p>'; return; }
                c.innerHTML = `<table><thead><tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Monto</th><th>Motivo</th><th>Tipo</th><th>Obs.</th><th>Acciones</th></tr></thead><tbody>` +
                    devs.map(d => {
                        const [y, m, dn] = d.fecha.split('-');
                        return `<tr>
                    <td>${dn}/${m}/${y}</td>
                    <td>${d.cliente}</td>
                    <td>${d.producto}</td>
                    <td>${d.cantidadDevuelta}/${d.cantidadOriginal}</td>
                    <td style="color:#dc3545;font-weight:600;">-S/${d.montoDevuelto.toFixed(2)}</td>
                    <td>${d.motivo}</td>
                    <td><span class="badge badge-info">${d.tipo}</span></td>
                    <td style="font-size:0.85em;">${d.observaciones || '-'}</td>
                    <td><button class="delete-btn" onclick="Devoluciones.eliminar('${d.id}')" title="Eliminar devolución">🗑️</button></td>
                </tr>`;
                    }).join('') + `</tbody></table>`;
            },

            async eliminar(id) {
                const r = await Swal.fire({ title: '¿Eliminar devolución?', text: 'Se revertirá el inventario, pero debes ajustar la caja/ingresos manualmente si es necesario.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
                if (!r.isConfirmed) return;
                
                const devs = this.cargar();
                const devIndex = devs.findIndex(d => d.id == id);
                if (devIndex === -1) return;
                const devolucion = devs[devIndex];
                
                // Revertir inventario
                if (devolucion.sku) {
                    const invItem = Estado.inventario.find(i => i.sku === devolucion.sku);
                    if (invItem) {
                        invItem.stock -= devolucion.cantidadDevuelta;
                        await Storage.incrementarStock(devolucion.sku, -devolucion.cantidadDevuelta);
                    }
                }
                
                // Revertir venta
                const vIdx = Estado.ventas.findIndex(v => v.id == devolucion.ventaId);
                if (vIdx !== -1) {
                    Estado.ventas[vIdx].devolucionParcial = Math.max(0, (Estado.ventas[vIdx].devolucionParcial || 0) - devolucion.cantidadDevuelta);
                    if (Estado.ventas[vIdx].devolucionParcial < Estado.ventas[vIdx].cantidad) Estado.ventas[vIdx].devolucionTotal = false;
                    await Storage.actualizarVenta(Estado.ventas[vIdx]);
                }

                if (typeof Papelera !== 'undefined') await Papelera.moverA('devoluciones', devolucion, `Devolución de ${devolucion.producto}`);

                devs.splice(devIndex, 1);
                await this.guardar(devs);
                this.actualizarVista();
                Toastify({ text: '🗑️ Devolución eliminada', duration: 3000, gravity: 'top', position: 'right', backgroundColor: '#dc3545' }).showToast();
            },

            exportarExcel() {
                const data = this.cargar();
                if (!data.length) { Swal.fire('Sin datos', 'No hay devoluciones para exportar', 'info'); return; }
                const ws = XLSX.utils.json_to_sheet(data.map(d => ({ Fecha: d.fecha, Cliente: d.cliente, Producto: d.producto, 'Cant.Devuelta': d.cantidadDevuelta, 'Monto Devuelto': d.montoDevuelto, Motivo: d.motivo, Tipo: d.tipo, Observaciones: d.observaciones || '-' })));
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Devoluciones');
                XLSX.writeFile(wb, `Devoluciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
            }
        };

        // ========================================
        // MÓDULO: COTIZACIONES
        // ========================================
        const Cotizaciones = {
            itemsTemp: [],

            cargar() {
                return Estado.cotizaciones || [];
            },
            async guardar(data) {
                Estado.cotizaciones = data; await Firebase.guardar('cotizaciones', data);
            },

            mostrarForm() {
                document.getElementById('form-nueva-cotizacion').classList.remove('hidden');
                document.getElementById('cot-fecha').valueAsDate = new Date();
                const vence = new Date(); vence.setDate(vence.getDate() + 7);
                document.getElementById('cot-vencimiento').valueAsDate = vence;
                document.getElementById('cot-numero').value = this._generarNumero();
                document.getElementById('cot-editando-id').value = '';
                this.itemsTemp = [];
                this.renderItems();
                document.getElementById('form-nueva-cotizacion').scrollIntoView({ behavior: 'smooth' });
            },

            cancelarForm() {
                document.getElementById('form-nueva-cotizacion').classList.add('hidden');
                this.itemsTemp = [];
            },

            _generarNumero() {
                const cots = this.cargar();
                return `COT-${new Date().getFullYear()}-${String(cots.length + 1).padStart(4, '0')}`;
            },

            agregarItem() {
                const nombre = document.getElementById('cot-item-nombre').value.trim();
                const cantidad = parseInt(document.getElementById('cot-item-cant').value) || 0;
                const precio = parseFloat(document.getElementById('cot-item-precio').value) || 0;
                if (!nombre || cantidad <= 0 || precio <= 0) {
                    Toastify({ text: '⚠️ Completa nombre, cantidad y precio', duration: 2500, gravity: 'top', position: 'right', backgroundColor: '#fd7e14' }).showToast();
                    return;
                }
                const descuento = parseFloat(document.getElementById('cot-item-desc').value) || 0;
                const subtotal = cantidad * precio * (1 - descuento / 100);
                this.itemsTemp.push({ nombre, cantidad, precio, descuento, subtotal });
                ['cot-item-nombre', 'cot-item-cant', 'cot-item-precio', 'cot-item-desc'].forEach(id => { document.getElementById(id).value = ''; });
                document.getElementById('cot-item-cant').value = '1';
                this.renderItems();
            },

            eliminarItemTemp(idx) {
                this.itemsTemp.splice(idx, 1);
                this.renderItems();
            },

            renderItems() {
                const c = document.getElementById('cot-items-lista');
                const subtotal = this.itemsTemp.reduce((s, i) => s + i.subtotal, 0);
                const igv = subtotal * 0.18;
                const total = subtotal + igv;
                const inclIGV = document.getElementById('cot-incluir-igv')?.checked;
                document.getElementById('cot-subtotal-display').textContent = `S/${subtotal.toFixed(2)}`;
                document.getElementById('cot-igv-display').textContent = inclIGV ? `S/${igv.toFixed(2)}` : 'No incluido';
                document.getElementById('cot-total-display').textContent = `S/${inclIGV ? total.toFixed(2) : subtotal.toFixed(2)}`;
                if (!this.itemsTemp.length) { c.innerHTML = '<p style="text-align:center;color:#aaa;padding:15px;font-size:0.9em;">Sin productos</p>'; return; }
                c.innerHTML = `<table><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Desc.%</th><th>Subtotal</th><th></th></tr></thead><tbody>` +
                    this.itemsTemp.map((it, i) => `<tr>
                <td>${it.nombre}</td><td>${it.cantidad}</td>
                <td>S/${it.precio.toFixed(2)}</td>
                <td>${it.descuento}%</td>
                <td><strong>S/${it.subtotal.toFixed(2)}</strong></td>
                <td><button class="delete-btn" onclick="Cotizaciones.eliminarItemTemp(${i})">✕</button></td>
            </tr>`).join('') + `</tbody></table>`;
            },

            async guardarCotizacion() {
                const cliente = document.getElementById('cot-cliente').value.trim();
                const fecha = document.getElementById('cot-fecha').value;
                if (!cliente || !fecha || !this.itemsTemp.length) {
                    Swal.fire('Error', 'Completa cliente, fecha y al menos un producto', 'error'); return;
                }
                const inclIGV = document.getElementById('cot-incluir-igv').checked;
                const subtotal = this.itemsTemp.reduce((s, i) => s + i.subtotal, 0);
                const total = inclIGV ? subtotal * 1.18 : subtotal;
                const editandoId = document.getElementById('cot-editando-id').value;
                const cotizacion = {
                    id: editandoId || Date.now().toString(),
                    numero: document.getElementById('cot-numero').value,
                    fecha,
                    vencimiento: document.getElementById('cot-vencimiento').value,
                    cliente,
                    telefono: document.getElementById('cot-tel').value.trim(),
                    email: document.getElementById('cot-email').value.trim(),
                    items: [...this.itemsTemp],
                    subtotal,
                    igv: inclIGV ? subtotal * 0.18 : 0,
                    incluyeIGV: inclIGV,
                    total,
                    estado: 'Pendiente',
                    condiciones: document.getElementById('cot-condiciones').value.trim(),
                    notas: document.getElementById('cot-notas-cot').value.trim(),
                    createdAt: new Date().toISOString()
                };
                const cots = this.cargar();
                if (editandoId) {
                    const idx = cots.findIndex(c => c.id === editandoId);
                    if (idx !== -1) cots[idx] = cotizacion; else cots.unshift(cotizacion);
                } else {
                    cots.unshift(cotizacion);
                }
                await this.guardar(cots);
                this.cancelarForm();
                this.actualizarVista();
                Toastify({ text: '✅ Cotización guardada', duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#00b09b,#96c93d)' }).showToast();
            },

            async convertirAVenta(id) {
                const cot = this.cargar().find(c => c.id === id);
                if (!cot) return;
                if (cot.items.length === 0) { Swal.fire('Sin productos', 'La cotización no tiene productos', 'warning'); return; }
                const result = await Swal.fire({
                    title: '🛒 Convertir a Venta',
                    html: `<p>¿Confirmas convertir la cotización <strong>${cot.numero}</strong> en una venta?</p>
                  <p style="margin-top:10px;"><strong>Cliente:</strong> ${cot.cliente}</p>
                  <p><strong>Total:</strong> S/${cot.total.toFixed(2)}</p>`,
                    icon: 'question', showCancelButton: true, confirmButtonColor: '#28a745', cancelButtonColor: '#6c757d',
                    confirmButtonText: '✅ Convertir a Venta', cancelButtonText: 'Cancelar'
                });
                if (!result.isConfirmed) return;

                // Registrar una venta por cada item de la cotización
                const fecha = new Date().toISOString().slice(0, 10);
                for (const item of cot.items) {
                    const venta = {
                        id: Date.now() + Math.random(),
                        fecha,
                        producto: item.nombre,
                        categoria: 'Otros',
                        cantidad: item.cantidad,
                        precio: item.precio * (1 - item.descuento / 100),
                        total: item.subtotal,
                        adelanto: item.subtotal,
                        saldoPendiente: 0,
                        estadoPago: 'Pagado',
                        cliente: cot.cliente,
                        metodo: 'Efectivo',
                        historialPagos: [{ monto: item.subtotal, metodo: 'Efectivo', fecha: new Date().toISOString() }],
                        vendedor: '',
                        notas: `Cotización ${cot.numero}`,
                        sku: '',
                        createdAt: new Date().toISOString()
                    };
                    Estado.ventas.unshift(venta);
                    await Storage.agregarVenta(venta);
                }

                // Marcar cotización como aprobada
                const cots = this.cargar();
                const idx = cots.findIndex(c => c.id === id);
                if (idx !== -1) { cots[idx].estado = 'Aprobada'; cots[idx].ventaCreada = true; }
                await this.guardar(cots);
                this.actualizarVista();
                UI.actualizarVistas();
                await Swal.fire({ icon: 'success', title: '🎉 ¡Venta Registrada!', html: `<p>Se crearon ${cot.items.length} venta(s) a partir de la cotización.</p>`, confirmButtonColor: '#4472C4' });
            },

            async cambiarEstado(id, nuevoEstado) {
                const cots = this.cargar();
                const idx = cots.findIndex(c => c.id === id);
                if (idx !== -1) { cots[idx].estado = nuevoEstado; await this.guardar(cots); this.actualizarVista(); }
            },

            async eliminarCotizacion(id) {
                const r = await Swal.fire({ title: '¿Eliminar cotización?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
                if (!r.isConfirmed) return;
                const cots = this.cargar().filter(c => c.id !== id);
                await this.guardar(cots);
                this.actualizarVista();
                Toastify({ text: '🗑️ Cotización eliminada', duration: 2500, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#dc3545,#c82333)' }).showToast();
            },

            async exportarPDF(id) {
                const cot = this.cargar().find(c => c.id === id);
                if (!cot) return;
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                // Header
                doc.setFillColor(68, 114, 196); doc.rect(0, 0, 210, 35, 'F');
                doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
                doc.text('COTIZACIÓN', 105, 18, { align: 'center' });
                doc.setFontSize(11); doc.text(cot.numero, 105, 27, { align: 'center' });
                // Info
                doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
                const [fy, fm, fd] = cot.fecha.split('-');
                doc.text(`Fecha: ${fd}/${fm}/${fy}`, 14, 45);
                if (cot.vencimiento) { const [vy, vm, vd] = cot.vencimiento.split('-'); doc.text(`Válida hasta: ${vd}/${vm}/${vy}`, 14, 52); }
                doc.setFont('helvetica', 'bold'); doc.text('Cliente:', 120, 45); doc.setFont('helvetica', 'normal');
                doc.text(cot.cliente, 140, 45);
                if (cot.telefono) doc.text(cot.telefono, 140, 52);
                if (cot.email) doc.text(cot.email, 140, 59);
                // Tabla
                let y = 70;
                doc.setFillColor(68, 114, 196); doc.rect(14, y, 182, 8, 'F');
                doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
                doc.text('PRODUCTO/SERVICIO', 16, y + 5.5); doc.text('CANT.', 110, y + 5.5); doc.text('PRECIO', 130, y + 5.5); doc.text('DESC.', 152, y + 5.5); doc.text('SUBTOTAL', 168, y + 5.5);
                y += 8; doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
                cot.items.forEach((it, i) => {
                    if (i % 2 === 0) { doc.setFillColor(245, 247, 255); doc.rect(14, y, 182, 7, 'F'); }
                    doc.text(it.nombre.slice(0, 40), 16, y + 5); doc.text(String(it.cantidad), 112, y + 5);
                    doc.text(`S/${it.precio.toFixed(2)}`, 132, y + 5); doc.text(`${it.descuento}%`, 154, y + 5);
                    doc.text(`S/${it.subtotal.toFixed(2)}`, 170, y + 5); y += 7;
                });
                // Totales
                y += 5;
                doc.setFont('helvetica', 'bold');
                doc.text(`Subtotal:`, 150, y); doc.text(`S/${cot.subtotal.toFixed(2)}`, 185, y, { align: 'right' }); y += 7;
                if (cot.incluyeIGV) { doc.text(`IGV (18%):`, 150, y); doc.text(`S/${cot.igv.toFixed(2)}`, 185, y, { align: 'right' }); y += 7; }
                doc.setFontSize(12); doc.text(`TOTAL:`, 150, y); doc.text(`S/${cot.total.toFixed(2)}`, 185, y, { align: 'right' });
                // Condiciones
                if (cot.condiciones) { y += 15; doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.text('Condiciones: ' + cot.condiciones, 14, y, { maxWidth: 182 }); }
                doc.save(`Cotizacion_${cot.numero}.pdf`);
            },

            actualizarVista() {
                this.actualizarCards();
                this.actualizarTabla();
            },

            actualizarCards() {
                const cots = this.cargar();
                const pendientes = cots.filter(c => c.estado === 'Pendiente').length;
                const aprobadas = cots.filter(c => c.estado === 'Aprobada').length;
                const rechazadas = cots.filter(c => c.estado === 'Rechazada').length;
                const totalPendiente = cots.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + c.total, 0);
                document.getElementById('cot-cards').innerHTML = `
            <div class="card"><h3>📄 Total Cotizaciones</h3><div class="value">${cots.length}</div></div>
            <div class="card"><h3>⏳ Pendientes</h3><div class="value" style="color:#ffc107;">${pendientes}</div></div>
            <div class="card"><h3>✅ Aprobadas</h3><div class="value" style="color:#28a745;">${aprobadas}</div></div>
            <div class="card"><h3>💰 Valor Pendiente</h3><div class="value" style="color:var(--primary);">S/${totalPendiente.toFixed(2)}</div></div>`;
            },

            actualizarTabla() {
                const c = document.getElementById('tabla-cotizaciones');
                const cots = this.cargar();
                if (!cots.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">No hay cotizaciones registradas</p>'; return; }
                const estadoColors = { Pendiente: '#ffc107', Aprobada: '#28a745', Rechazada: '#dc3545', Vencida: '#6c757d' };
                c.innerHTML = cots.map(cot => {
                    const [y, m, d] = cot.fecha.split('-');
                    const isVencida = cot.estado === 'Pendiente' && cot.vencimiento && cot.vencimiento < new Date().toISOString().slice(0, 10);
                    const estadoFinal = isVencida ? 'Vencida' : cot.estado;
                    const color = estadoColors[estadoFinal] || '#6c757d';
                    return `<div style="background:var(--bg-surface);border:2px solid var(--border);border-radius:10px;padding:18px;margin-bottom:12px;transition:all 0.2s;" onmouseenter="this.style.borderColor='#4472C4'" onmouseleave="this.style.borderColor='#e9ecef'">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                    <div>
                        <span style="font-weight:700;font-size:1.05em;color:var(--text-primary);">${cot.cliente}</span>
                        <span style="margin-left:8px;font-size:0.82em;color:#888;">${cot.numero}</span>
                        <span style="margin-left:8px;background:${color}22;color:${color};padding:2px 8px;border-radius:10px;font-size:0.8em;font-weight:700;">${estadoFinal}</span>
                    </div>
                    <div style="font-size:1.3em;font-weight:700;color:var(--primary);">S/${cot.total.toFixed(2)}</div>
                </div>
                <div style="font-size:0.85em;color:#666;margin-bottom:10px;">
                    📅 ${d}/${m}/${y}${cot.vencimiento ? ` · Vence: ${cot.vencimiento.split('-').reverse().join('/')}` : ''} · ${cot.items.length} item(s)
                    ${cot.telefono ? ` · 📞 ${cot.telefono}` : ''}
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
                    ${cot.items.map(it => `<span style="background:#f0f4ff;color:var(--primary);padding:3px 10px;border-radius:12px;font-size:0.8em;">${it.nombre} ×${it.cantidad}</span>`).join('')}
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${cot.estado === 'Pendiente' && !isVencida ? `<button class="small-btn" onclick="Cotizaciones.convertirAVenta('${cot.id}')">🛒 Convertir a Venta</button>` : ''}
                    <button class="small-btn" onclick="Cotizaciones.exportarPDF('${cot.id}')" style="background:var(--danger);">📄 PDF</button>
                    ${cot.estado === 'Pendiente' ? `
                        <button class="small-btn gray" onclick="Cotizaciones.cambiarEstado('${cot.id}','Aprobada')">✅ Aprobar</button>
                        <button class="small-btn" style="background:#6c757d;" onclick="Cotizaciones.cambiarEstado('${cot.id}','Rechazada')">❌ Rechazar</button>` : ''}
                    <button class="delete-btn" onclick="Cotizaciones.eliminarCotizacion('${cot.id}')">🗑️</button>
                </div>
            </div>`;
                }).join('');
            }
        };

        // ========================================
        // MÓDULO: CIERRE DE CAJA
        // ========================================
        const CierreCaja = {
            cargar() {
                try { return JSON.parse(localStorage.getItem('cierresCaja') || '[]'); } catch (e) { return []; }
            },
            async guardar(data) {
                localStorage.setItem('cierresCaja', JSON.stringify(data));
                if (window.firebaseOK && !Auth.modoInvitado) await Firebase.guardar('cierresCaja', data);
            },
            cargarEstado() {
                try { return JSON.parse(localStorage.getItem('estadoCaja')) || { abierta: false, montoInicial: 0, fechaApertura: null }; }
                catch (e) { return { abierta: false, montoInicial: 0, fechaApertura: null }; }
            },
            guardarEstado(estado) {
                localStorage.setItem('estadoCaja', JSON.stringify(estado));
            },

            async abrirCaja() {
                const estado = this.cargarEstado();
                if (estado.abierta) { Swal.fire('Caja ya abierta', 'La caja ya se encuentra abierta.', 'info'); return; }

                const { value: monto } = await Swal.fire({
                    title: '🔓 Apertura de Caja',
                    html: `<p style="margin-bottom:15px;color:#555;">Ingresa el monto inicial (sencillo) con el que abres la caja hoy:</p>
                   <input id="swal-monto-inicial" class="swal2-input" type="number" step="0.01" min="0" placeholder="0.00" value="0">`,
                    showCancelButton: true, confirmButtonText: '✅ Abrir Caja', cancelButtonText: 'Cancelar', confirmButtonColor: '#ffc107',
                    preConfirm: () => parseFloat(document.getElementById('swal-monto-inicial').value) || 0
                });

                if (monto === undefined) return;

                this.guardarEstado({ abierta: true, montoInicial: monto, fechaApertura: new Date().toISOString() });

                if (typeof Auditoria !== 'undefined') Auditoria.registrar('APERTURA CAJA', `Monto inicial: S/${monto.toFixed(2)}`);

                Toastify({ text: `🔓 Caja abierta con S/${monto.toFixed(2)}`, duration: 3000, gravity: 'top', position: 'right', style: { background: 'linear-gradient(135deg,#ffc107,#fd7e14)', color: '#000' } }).showToast();
                this.actualizarVista();
            },

            async realizarCierre() {
                const estado = this.cargarEstado();
                if (!estado.abierta) {
                    Swal.fire('Caja no abierta', 'Debes abrir la caja antes de poder realizar el cierre.', 'warning');
                    return;
                }

                const hoy = new Date().toISOString().slice(0, 10);

                // Calcular valores del día
                const ventasHoy = Estado.ventas.filter(v => v.fecha === hoy);
                const cobradoEfectivo = ventasHoy.reduce((s, v) => {
                    return s + (v.historialPagos || []).filter(p => p.metodo === 'Efectivo' && p.fecha.slice(0, 10) === hoy).reduce((ss, p) => ss + p.monto, 0);
                }, 0);
                const cobradoDigital = ventasHoy.reduce((s, v) => {
                    return s + (v.historialPagos || []).filter(p => ['Yape', 'Plin', 'Transferencia', 'Tarjeta'].includes(p.metodo) && p.fecha.slice(0, 10) === hoy).reduce((ss, p) => ss + p.monto, 0);
                }, 0);

                const totalVentas = ventasHoy.reduce((s, v) => s + v.total, 0);
                const gastosHoy = Estado.gastos.filter(g => g.fecha === hoy).reduce((s, g) => s + g.monto, 0);

                // Matemática clave: Lo que debe haber físicamente en el cajón
                const montoInicial = estado.montoInicial;
                const efectivoEsperado = montoInicial + cobradoEfectivo - gastosHoy;

                const { value: formData } = await Swal.fire({
                    title: '🏧 Cierre de Caja',
                    width: '640px',
                    html: `
                <div style="background:var(--bg-surface-hover);border-radius:10px;padding:15px;margin-bottom:15px;text-align:left;font-size:0.9em;line-height:2;">
                    <div style="font-size:1em;font-weight:700;color:var(--text-primary);margin-bottom:8px;">📊 Resumen del Día: ${hoy.split('-').reverse().join('/')}</div>
                    <div>🔓 Monto inicial en caja: <strong style="color:#ffc107;">S/${montoInicial.toFixed(2)}</strong></div>
                    <div>💵 Cobrado efectivo: <strong style="color:#28a745;">S/${cobradoEfectivo.toFixed(2)}</strong></div>
                    <div>📱 Cobrado digital (Yape/Plin/Tarjeta): <strong style="color:#17a2b8;">S/${cobradoDigital.toFixed(2)}</strong></div>
                    <div>💸 Gastos pagados en efectivo: <strong style="color:#dc3545;">S/${gastosHoy.toFixed(2)}</strong></div>
                    <div style="border-top:2px dashed #ddd;margin-top:8px;padding-top:8px;font-size:1.1em;">
                        💰 Efectivo ESPERADO en cajón: <strong style="color:#1E3A6E;">S/${efectivoEsperado.toFixed(2)}</strong>
                    </div>
                </div>
                <div style="text-align:left;">
                    <label style="font-weight:600;display:block;margin-bottom:4px;">💵 Efectivo FÍSICO contado (S/):</label>
                    <input id="cc-efectivo" class="swal2-input" type="number" step="0.01" min="0" placeholder="0.00" value="${efectivoEsperado.toFixed(2)}">
                    <label style="font-weight:600;display:block;margin:10px 0 4px;">📱 Total comprobado en digital (S/):</label>
                    <input id="cc-digital" class="swal2-input" type="number" step="0.01" min="0" placeholder="0.00" value="${cobradoDigital.toFixed(2)}">
                    <label style="font-weight:600;display:block;margin:10px 0 4px;">🏦 Monto para retiro/depósito (S/):</label>
                    <input id="cc-retiro" class="swal2-input" type="number" step="0.01" min="0" placeholder="0.00" value="0">
                    <label style="font-weight:600;display:block;margin:10px 0 4px;">📝 Observaciones:</label>
                    <input id="cc-obs" class="swal2-input" placeholder="Notas del cierre...">
                </div>`,
                    showCancelButton: true, confirmButtonText: '✅ Registrar Cierre', cancelButtonText: 'Cancelar', confirmButtonColor: '#4472C4',
                    preConfirm: () => ({
                        efectivoReal: parseFloat(document.getElementById('cc-efectivo').value) || 0,
                        digitalReal: parseFloat(document.getElementById('cc-digital').value) || 0,
                        retiro: parseFloat(document.getElementById('cc-retiro').value) || 0,
                        observaciones: document.getElementById('cc-obs').value.trim()
                    })
                });

                if (!formData) return;

                const { efectivoReal, digitalReal, retiro, observaciones } = formData;
                // La diferencia se calcula en base al efectivo físico esperado vs el contado
                const diferencia = efectivoReal - efectivoEsperado;
                const saldoFinal = efectivoReal - retiro;

                const cierre = {
                    id: Date.now().toString(),
                    fecha: hoy,
                    hora: new Date().toLocaleTimeString('es-PE'),
                    montoInicial,
                    ventasCount: ventasHoy.length,
                    totalFacturado: totalVentas,
                    cobradoEfectivoSistema: cobradoEfectivo,
                    cobradoDigitalSistema: cobradoDigital,
                    efectivoReal,
                    digitalReal,
                    gastosPagados: gastosHoy,
                    retiro,
                    diferencia,
                    saldoFinal,
                    observaciones,
                    createdAt: new Date().toISOString()
                };

                const cierres = this.cargar();
                cierres.unshift(cierre);
                await this.guardar(cierres);

                // Se cierra la caja reseteando el estado
                this.guardarEstado({ abierta: false, montoInicial: 0, fechaApertura: null });

                if (typeof Auditoria !== 'undefined') Auditoria.registrar('CIERRE CAJA', `Diferencia: S/${diferencia.toFixed(2)} | Real: S/${efectivoReal.toFixed(2)}`);

                this.actualizarVista();

                const diferenciaTexto = diferencia === 0 ? '✅ Sin diferencia (Caja cuadrada)' : diferencia > 0 ? `✅ Sobrante: S/${diferencia.toFixed(2)}` : `⚠️ Faltante: S/${Math.abs(diferencia).toFixed(2)}`;

                await Swal.fire({
                    icon: diferencia < -0.01 ? 'warning' : 'success',
                    title: '🏧 Cierre Completado',
                    html: `<div style="text-align:left;line-height:2;font-size:0.95em;">
                <div>💵 Efectivo real: <strong style="color:#28a745;">S/${efectivoReal.toFixed(2)}</strong></div>
                <div>🏦 Retiro realizado: <strong>S/${retiro.toFixed(2)}</strong></div>
                <div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px;">
                    <strong>Fondo para mañana: S/${saldoFinal.toFixed(2)}</strong><br>
                    <span style="color:${diferencia < -0.01 ? '#dc3545' : '#28a745'};font-weight:bold;">${diferenciaTexto}</span>
                </div>
            </div>`,
                    confirmButtonColor: '#4472C4'
                });
            },

            actualizarVista() {
                this.actualizarCards();
                this.actualizarTabla();
            },

            actualizarCards() {
                const cierres = this.cargar();
                const estado = this.cargarEstado();
                const ultimo = cierres[0];

                // Alternar visualización de los botones
                const btnAbrir = document.getElementById('btn-abrir-caja');
                const btnCerrar = document.getElementById('btn-cerrar-caja');
                if (btnAbrir && btnCerrar) {
                    btnAbrir.style.display = estado.abierta ? 'none' : 'inline-block';
                    btnCerrar.style.display = estado.abierta ? 'inline-block' : 'none';
                }

                document.getElementById('caja-cards').innerHTML = `
            <div class="card" style="border-left:4px solid ${estado.abierta ? '#28a745' : '#dc3545'};">
                <h3>🛒 Estado de Caja</h3>
                <div class="value" style="color:${estado.abierta ? '#28a745' : '#dc3545'};font-size:1.4em;">${estado.abierta ? '🔓 ABIERTA' : '🔒 CERRADA'}</div>
                ${estado.abierta ? `<div style="font-size:0.85em;color:#666;margin-top:5px;">Fondo actual: S/${estado.montoInicial.toFixed(2)}</div>` : '<div style="font-size:0.85em;color:#666;margin-top:5px;">Requiere apertura</div>'}
            </div>
            <div class="card"><h3>🏧 Total Cierres</h3><div class="value">${cierres.length}</div></div>
            <div class="card"><h3>📅 Último Cierre</h3><div class="value" style="font-size:1.2em;">${ultimo ? ultimo.fecha.split('-').reverse().join('/') : '--'}</div>
                ${ultimo ? `<div style="font-size:0.8em;color:${ultimo.diferencia < -0.01 ? '#dc3545' : '#28a745'};margin-top:5px;">${ultimo.diferencia < -0.01 ? '⚠️ Faltante: S/' + Math.abs(ultimo.diferencia).toFixed(2) : '✅ Cuadrado'}</div>` : ''}
            </div>`;
            },

            actualizarTabla() {
                const c = document.getElementById('tabla-cierres');
                const cierres = this.cargar();
                if (!cierres.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">No hay cierres registrados</p>'; return; }
                c.innerHTML = `<div style="overflow-x:auto;"><table><thead><tr><th>Fecha</th><th>Hora</th><th>Inicial</th><th>Ventas</th><th>Ef. Real</th><th>Digital Real</th><th>Gastos</th><th>Retiro</th><th>Diferencia</th><th>Saldo Final</th></tr></thead><tbody>` +
                    cierres.map(c => {
                        const [y, m, d] = c.fecha.split('-');
                        const difClass = c.diferencia < -0.01 ? 'color:#dc3545;' : 'color:#28a745;';
                        const inicial = c.montoInicial || 0;
                        return `<tr>
                    <td style="white-space:nowrap;"><strong>${d}/${m}/${y}</strong></td>
                    <td>${c.hora || '-'}</td>
                    <td style="color:#ffc107;font-weight:600;">S/${inicial.toFixed(2)}</td>
                    <td>${c.ventasCount} <span style="font-size:0.85em;color:#666;">(S/${c.totalFacturado.toFixed(2)})</span></td>
                    <td style="color:#28a745;font-weight:600;">S/${c.efectivoReal.toFixed(2)}</td>
                    <td style="color:#17a2b8;">S/${c.digitalReal.toFixed(2)}</td>
                    <td style="color:#dc3545;">S/${(c.gastosPagados || 0).toFixed(2)}</td>
                    <td>S/${c.retiro.toFixed(2)}</td>
                    <td style="${difClass}font-weight:700;">${c.diferencia > 0 ? '+' : ''}S/${c.diferencia.toFixed(2)}</td>
                    <td style="font-weight:700;">S/${c.saldoFinal.toFixed(2)}</td>
                </tr>`;
                    }).join('') + `</tbody></table></div>`;
            },

            exportarExcel() {
                const data = this.cargar();
                if (!data.length) { Swal.fire('Sin datos', 'No hay cierres para exportar', 'info'); return; }
                const ws = XLSX.utils.json_to_sheet(data.map(c => ({ Fecha: c.fecha, Hora: c.hora, 'Fondo Inicial': c.montoInicial || 0, Ventas: c.ventasCount, 'Facturado Total': c.totalFacturado, 'Efectivo Real': c.efectivoReal, 'Digital Real': c.digitalReal, Gastos: c.gastosPagados || 0, Retiro: c.retiro, Diferencia: c.diferencia, 'Fondo para mañana': c.saldoFinal, Observaciones: c.observaciones || '-' })));
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Cierres de Caja');
                XLSX.writeFile(wb, `CierresCaja_${new Date().toISOString().slice(0, 10)}.xlsx`);
            }
        };