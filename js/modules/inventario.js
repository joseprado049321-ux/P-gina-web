

        const Autocomplete = {
            currentFocus: -1,
            init() {
                const input = document.getElementById('producto');
                input.addEventListener('input', (e) => this.mostrarSugerencias(e.target));
                input.addEventListener('keydown', (e) => this.handleKeydown(e));
                document.addEventListener('click', (e) => this.cerrarSugerencias(e));
            },
            mostrarSugerencias(input) {
                const val = input.value;
                this.cerrarSugerencias();
                if (!val || val.length < 2) return;
                this.currentFocus = -1;
                const productosVentas = Estado.ventas.map(v => v.producto);
                const productosInventario = Estado.inventario.map(i => i.nombre);
                const todosProductos = [...new Set([...productosVentas, ...productosInventario])];
                const sugerencias = todosProductos.filter(p => p.toLowerCase().includes(val.toLowerCase()));
                if (!sugerencias.length) return;
                const container = document.createElement('div');
                container.setAttribute('id', 'autocomplete-list');
                container.setAttribute('class', 'autocomplete-items');
                input.parentNode.appendChild(container);
                sugerencias.forEach(producto => {
                    const item = document.createElement('div');
                    const pos = producto.toLowerCase().indexOf(val.toLowerCase());
                    item.innerHTML = producto.substr(0, pos) + '<strong>' + producto.substr(pos, val.length) + '</strong>' + producto.substr(pos + val.length);
                    item.addEventListener('click', () => {
                        input.value = producto;
                        let precio = 0;
                        const itemInv = Estado.inventario.find(i => i.nombre === producto);
                        if (itemInv) {
                            document.getElementById('sku').value = itemInv.sku;
                            if (itemInv.categoria) document.getElementById('categoria').value = itemInv.categoria;
                            const costoInfo = Estado.costosProductos ? Estado.costosProductos[itemInv.sku] : null;
                            if (costoInfo && costoInfo.precioVenta) precio = costoInfo.precioVenta;
                        }
                        
                        if (!precio) {
                            const lastSale = Estado.ventas.find(v => v.producto === producto);
                            if (lastSale) {
                                if (!document.getElementById('sku').value && lastSale.sku) {
                                    document.getElementById('sku').value = lastSale.sku;
                                }
                                if (!document.getElementById('categoria').value && lastSale.categoria) {
                                    document.getElementById('categoria').value = lastSale.categoria;
                                }
                                precio = lastSale.precio || 0;
                            }
                        }

                        if (precio > 0) {
                            document.getElementById('precio').value = precio.toFixed(2);
                            document.getElementById('cantidad').value = 1;
                            document.getElementById('total-display').value = `S/${precio.toFixed(2)}`;
                        }
                        this.cerrarSugerencias();
                    });
                    container.appendChild(item);
                });
            },
            handleKeydown(e) {
                const container = document.getElementById('autocomplete-list');
                if (!container) return;
                const items = container.getElementsByTagName('div');
                if (e.keyCode === 40) { this.currentFocus++; this.activarItem(items); }
                else if (e.keyCode === 38) { this.currentFocus--; this.activarItem(items); }
                else if (e.keyCode === 13) { e.preventDefault(); if (this.currentFocus > -1 && items) items[this.currentFocus].click(); }
            },
            activarItem(items) {
                if (!items) return;
                this.removerActivos(items);
                if (this.currentFocus >= items.length) this.currentFocus = 0;
                if (this.currentFocus < 0) this.currentFocus = items.length - 1;
                items[this.currentFocus].classList.add('autocomplete-active');
            },
            removerActivos(items) { for (let i = 0; i < items.length; i++) items[i].classList.remove('autocomplete-active'); },
            cerrarSugerencias(e) {
                const container = document.getElementById('autocomplete-list');
                if (container && (!e || e.target !== document.getElementById('producto'))) container.parentNode.removeChild(container);
            },
            initClientes() {
                const input = document.getElementById('cliente');
                input.addEventListener('input', (e) => this.mostrarSugerenciasClientes(e.target));
                document.addEventListener('click', (e) => this.cerrarSugerenciasClientes(e));
            },
            mostrarSugerenciasClientes(input) {
                const val = input.value;
                this.cerrarSugerenciasClientes();
                if (!val || val.length < 1) return;
                const sugerencias = Estado.clientes.filter(c => c.nombre.toLowerCase().includes(val.toLowerCase()));
                if (!sugerencias.length) return;
                const container = document.createElement('div');
                container.setAttribute('id', 'autocomplete-list-clientes');
                container.setAttribute('class', 'autocomplete-items');
                input.parentNode.appendChild(container);
                sugerencias.forEach(cliente => {
                    const item = document.createElement('div');
                    item.textContent = cliente.nombre;
                    item.addEventListener('click', () => { input.value = cliente.nombre; this.cerrarSugerenciasClientes(); });
                    container.appendChild(item);
                });
            },
            cerrarSugerenciasClientes(e) {
                const container = document.getElementById('autocomplete-list-clientes');
                if (container && (!e || e.target !== document.getElementById('cliente'))) container.parentNode.removeChild(container);
            }
        };

        const Inventario = {
            mostrarFormNuevoItem() { document.getElementById('form-nuevo-item').classList.remove('hidden'); },
            cancelarNuevoItem() { document.getElementById('form-nuevo-item').classList.add('hidden'); },
            async guardarNuevoItem() {
                const sku = document.getElementById('nuevo-sku').value.trim().toUpperCase();
                const nombre = document.getElementById('nuevo-nombre').value.trim();
                const stock = parseInt(document.getElementById('nuevo-stock').value) || 0;
                const reorder = parseInt(document.getElementById('nuevo-reorder').value) || 5;
                const marca = document.getElementById('nuevo-marca-inv').value;
                const precio = parseFloat(document.getElementById('nuevo-precio-inv').value) || 0;
                const costo = parseFloat(document.getElementById('nuevo-costo-inv').value) || 0;
                if (!sku || !nombre) { Swal.fire('Error', 'SKU y Nombre son obligatorios', 'error'); return; }

                try {
                    const existente = Estado.inventario.find(x => x.sku === sku);
                    if (existente) {
                        existente.stock += stock; existente.nombre = nombre; existente.reorderThreshold = reorder;
                        existente.precioVenta = precio; existente.costo = costo;
                        await Storage.actualizarProducto(existente);
                        Toastify({ text: `📦 Stock actualizado: ${sku}`, duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#00b09b,#96c93d)' }).showToast();
                    } else {
                        const nuevoItem = { sku, nombre, stock, reorderThreshold: reorder, precioVenta: precio, costo: costo };
                        Estado.inventario.push(nuevoItem);
                        await Storage.agregarProducto(nuevoItem);
                        Toastify({ text: `✅ Producto añadido: ${sku}`, duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#00b09b,#96c93d)' }).showToast();
                    }
                } catch (e) {
                    console.error("Error al guardar producto:", e);
                    Swal.fire('Error', 'Fallo de red o permisos al guardar el producto.', 'error');
                    return;
                }
                this.cancelarNuevoItem();
                ['nuevo-sku', 'nuevo-nombre', 'nuevo-precio-inv', 'nuevo-costo-inv', 'nuevo-stock', 'nuevo-reorder'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
                document.getElementById('nuevo-stock').value = '0';
                document.getElementById('nuevo-reorder').value = '5';
            },
            actualizarTabla() {
                const c = document.getElementById('tabla-inventario');
                if (!c) return;
                const inv = Estado.inventario;
                if (!inv.length) { c.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">No hay productos en inventario. Añade productos o registra compras.</p>'; return; }
                c.innerHTML = `<table><thead><tr><th>SKU</th><th>Producto</th><th>Stock</th><th>Umbral</th><th>Costo</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>` +
                    inv.map((item, idx) => {
                        const bajo = item.stock <= item.reorderThreshold;
                        const cero = item.stock === 0;
                        const estado = cero ? '<span class="badge badge-danger">Sin stock</span>' : bajo ? '<span class="badge badge-warning">Bajo</span>' : '<span class="badge badge-success">OK</span>';
                        return `<tr style="${cero ? 'background:rgba(239,68,68,0.15);' : bajo ? 'background:rgba(255,193,7,0.15);' : ''}">
                        <td><strong>${item.sku}</strong></td>
                        <td>${item.nombre}</td>
                        <td><strong>${item.stock}</strong></td>
                        <td>${item.reorderThreshold}</td>
                        <td>S/${(item.costo || 0).toFixed(2)}</td>
                        <td>S/${(item.precioVenta || 0).toFixed(2)}</td>
                        <td>${estado}</td>
                        <td>
                            <button class="small-btn" onclick="Inventario.ajustarStock(${idx})">✏️ Ajustar</button>
                            <button class="delete-btn" onclick="Inventario.eliminarItem(${idx})">🗑️</button>
                        </td>
                    </tr>`;
                    }).join('') + `</tbody></table>`;
            },
            async ajustarStock(idx) {
                const item = Estado.inventario[idx];
                const { value: formValues } = await Swal.fire({
                    title: `Ajustar Stock: ${item.nombre}`,
                    html: `<p style="color:#666;margin-bottom:15px;">Stock actual: <strong>${item.stock}</strong></p>
                        <label>Tipo:</label><select id="swal-tipo" class="swal2-input"><option value="sumar">Sumar (+)</option><option value="restar">Restar (−)</option><option value="set">Establecer (=)</option></select>
                        <label style="margin-top:15px;">Cantidad:</label><input id="swal-ajuste" class="swal2-input" type="number" min="0" value="1">`,
                    focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', confirmButtonColor: '#4472C4',
                    preConfirm: () => ({ tipo: document.getElementById('swal-tipo').value, cantidad: parseInt(document.getElementById('swal-ajuste').value) || 0 })
                });
                if (!formValues) return;
                const { tipo, cantidad } = formValues;
                if (tipo === 'sumar') item.stock += cantidad;
                else if (tipo === 'restar') item.stock = Math.max(0, item.stock - cantidad);
                else item.stock = cantidad;
                try {
                    await Storage.actualizarProducto(item);
                    Toastify({ text: `📦 Stock actualizado: ${item.sku} → ${item.stock}`, duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#00b09b,#96c93d)' }).showToast();
                } catch(e) {
                    console.error("Error al ajustar stock:", e);
                    Swal.fire('Error', 'Fallo al ajustar el stock en la nube.', 'error');
                }
            },
            async eliminarItem(idx) {
                const r = await Swal.fire({ title: '¿Eliminar del inventario?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
                if (!r.isConfirmed) return;
                const itemABorrar = Estado.inventario[idx];
                if (itemABorrar) await Papelera.moverA('inventario', itemABorrar, `Producto: ${itemABorrar.nombre || itemABorrar.producto}`);
                Estado.inventario.splice(idx, 1);
                if (itemABorrar) await Storage.eliminarProducto(itemABorrar.sku);
            },
            exportarInventarioJSON() {
                const blob = new Blob([JSON.stringify(Estado.inventario, null, 2)], { type: 'application/json' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `inventario_${new Date().toISOString().slice(0, 10)}.json`; a.click();
            },
            exportarInventarioExcel() {
                const ws = XLSX.utils.json_to_sheet(Estado.inventario.map(i => ({ SKU: i.sku, Nombre: i.nombre, Stock: i.stock, Umbral: i.reorderThreshold })));
                const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
                XLSX.writeFile(wb, `Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
            },
            importarInventarioJSON(event) {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const datos = JSON.parse(e.target.result);
                        if (!Array.isArray(datos)) throw new Error('Formato inválido');
                        const result = await Swal.fire({ title: '¿Cómo importar?', icon: 'question', showDenyButton: true, showCancelButton: true, confirmButtonText: 'Combinar', denyButtonText: 'Reemplazar', cancelButtonText: 'Cancelar', confirmButtonColor: '#28a745', denyButtonColor: '#ff9800' });
                        if (result.isConfirmed) {
                            datos.forEach(nuevo => { const exist = Estado.inventario.find(x => x.sku === nuevo.sku); if (exist) exist.stock += nuevo.stock; else Estado.inventario.push(nuevo); });
                        } else if (result.isDenied) { Estado.inventario = datos; }
                        else return;
                        await Storage.guardarInventario();
                        Toastify({ text: '✅ Inventario importado', duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#00b09b,#96c93d)' }).showToast();
                    } catch (err) { Swal.fire('Error', 'Archivo inválido: ' + err.message, 'error'); }
                };
                reader.readAsText(file);
                event.target.value = '';
            }
        };

        // ========================================
        // MÓDULO: PROVEEDORES
        // ========================================
        const Proveedores = {
            mostrarForm() {
                document.getElementById('form-nuevo-proveedor').classList.remove('hidden');
            },
            cancelarForm() {
                document.getElementById('form-nuevo-proveedor').classList.add('hidden');
                this.limpiarForm();
            },
            limpiarForm() {
                ['prov-nombre', 'prov-ruc', 'prov-telefono', 'prov-email', 'prov-direccion', 'prov-notas', 'prov-editando-id'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
            },
            cargar() {
                return Estado.proveedores || [];
            },
            async guardar(data) {
                Estado.proveedores = data; await Firebase.guardar('proveedores', data);
            },
            async guardarProveedor() {
                const nombre = document.getElementById('prov-nombre').value.trim();
                const ruc = document.getElementById('prov-ruc').value.trim();
                if (!nombre) { Swal.fire('Error', 'El nombre es obligatorio', 'error'); return; }
                const editandoId = document.getElementById('prov-editando-id').value;
                const proveedores = this.cargar();
                const proveedor = {
                    id: editandoId || Date.now().toString(),
                    nombre,
                    ruc,
                    telefono: document.getElementById('prov-telefono').value.trim(),
                    email: document.getElementById('prov-email').value.trim(),
                    direccion: document.getElementById('prov-direccion').value.trim(),
                    notas: document.getElementById('prov-notas').value.trim(),
                    fechaRegistro: editandoId ? (proveedores.find(p => p.id === editandoId) || {}).fechaRegistro : new Date().toISOString()
                };
                if (editandoId) {
                    const idx = proveedores.findIndex(p => p.id === editandoId);
                    if (idx !== -1) proveedores[idx] = proveedor;
                } else {
                    proveedores.push(proveedor);
                }
                await this.guardar(proveedores);
                this.cancelarForm();
                this.actualizarLista();
                Toastify({ text: editandoId ? '✅ Proveedor actualizado' : '✅ Proveedor registrado', duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#00b09b,#96c93d)' }).showToast();
            },
            editarProveedor(id) {
                const prov = this.cargar().find(p => p.id === id);
                if (!prov) return;
                this.mostrarForm();
                document.getElementById('prov-nombre').value = prov.nombre;
                document.getElementById('prov-ruc').value = prov.ruc || '';
                document.getElementById('prov-telefono').value = prov.telefono || '';
                document.getElementById('prov-email').value = prov.email || '';
                document.getElementById('prov-direccion').value = prov.direccion || '';
                document.getElementById('prov-notas').value = prov.notas || '';
                document.getElementById('prov-editando-id').value = id;
                document.getElementById('form-nuevo-proveedor').scrollIntoView({ behavior: 'smooth' });
            },
            async eliminarProveedor(id) {
                const result = await Swal.fire({ title: '¿Eliminar proveedor?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
                if (!result.isConfirmed) return;
                const proveedores = this.cargar().filter(p => p.id !== id);
                await this.guardar(proveedores);
                this.actualizarLista();
                Toastify({ text: '🗑️ Proveedor eliminado', duration: 2500, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#dc3545,#c82333)' }).showToast();
            },
            actualizarLista(busqueda = '') {
                const container = document.getElementById('lista-proveedores');
                let proveedores = this.cargar();
                if (busqueda) proveedores = proveedores.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.ruc || '').includes(busqueda));
                if (!proveedores.length) {
                    container.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">No hay proveedores registrados</p>';
                    return;
                }
                const compras = Compras.cargar();
                container.innerHTML = proveedores.map(p => {
                    const comprasProveedor = compras.filter(c => c.proveedorId === p.id);
                    const totalComprado = comprasProveedor.reduce((s, c) => s + c.total, 0);
                    return `<div class="cliente-card">
                <div class="cliente-header">
                    <div class="cliente-nombre">🏭 ${p.nombre}</div>
                    <div class="cliente-actions">
                        <button class="small-btn" onclick="Compras.nuevaCompraParaProveedor('${p.id}')">🛒 Nueva Compra</button>
                        <button class="small-btn gray" onclick="Proveedores.editarProveedor('${p.id}')">✏️ Editar</button>
                        <button class="small-btn" style="background:var(--danger);" onclick="Proveedores.eliminarProveedor('${p.id}')">🗑️</button>
                    </div>
                </div>
                <div class="cliente-info">
                    ${p.ruc ? `<div class="cliente-info-item"><strong>📋 RUC:</strong> ${p.ruc}</div>` : ''}
                    ${p.telefono ? `<div class="cliente-info-item"><strong>📞</strong> ${p.telefono}</div>` : ''}
                    ${p.email ? `<div class="cliente-info-item"><strong>📧</strong> ${p.email}</div>` : ''}
                    ${p.direccion ? `<div class="cliente-info-item"><strong>📍</strong> ${p.direccion}</div>` : ''}
                </div>
                <div class="cliente-stats">
                    <div class="cliente-stat"><div class="cliente-stat-label">Compras</div><div class="cliente-stat-value">${comprasProveedor.length}</div></div>
                    <div class="cliente-stat"><div class="cliente-stat-label">Total Comprado</div><div class="cliente-stat-value" style="font-size:1.2em;">S/${totalComprado.toFixed(2)}</div></div>
                </div>
                ${p.notas ? `<div style="margin-top:8px;padding:8px;background:var(--bg-surface-hover);border-radius:6px;font-size:0.88em;">📝 ${p.notas}</div>` : ''}
            </div>`;
                }).join('');
            },
            exportarExcel() {
                const data = this.cargar();
                if (!data.length) { Swal.fire('Sin datos', 'No hay proveedores para exportar', 'info'); return; }
                const ws = XLSX.utils.json_to_sheet(data.map(p => ({ Nombre: p.nombre, RUC: p.ruc || '-', Teléfono: p.telefono || '-', Email: p.email || '-', Dirección: p.direccion || '-', Notas: p.notas || '-' })));
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
                XLSX.writeFile(wb, `Proveedores_${new Date().toISOString().slice(0, 10)}.xlsx`);
            }
        };

        // ========================================
        // MÓDULO: COMPRAS
        // ========================================
        const Compras = {
            itemsTemp: [],

            cargar() {
                return Estado.compras || [];
            },
            async guardar(data) {
                Estado.compras = data; await Firebase.guardar('compras', data);
            },

            mostrarForm(proveedorIdPreset = '') {
                document.getElementById('form-nueva-compra').classList.remove('hidden');
                document.getElementById('compra-fecha').valueAsDate = new Date();
                document.getElementById('compra-editando-id').value = '';
                this.itemsTemp = [];
                this.renderItemsTemp();
                this.cargarSelectProveedores(proveedorIdPreset);
                document.getElementById('form-nueva-compra').scrollIntoView({ behavior: 'smooth' });
            },

            cancelarForm() {
                document.getElementById('form-nueva-compra').classList.add('hidden');
                this.itemsTemp = [];
                this.renderItemsTemp();
            },

            cargarSelectProveedores(preselect = '') {
                const select = document.getElementById('compra-proveedor');
                const proveedores = Proveedores.cargar();
                select.innerHTML = '<option value="">Sin proveedor</option>' +
                    proveedores.map(p => `<option value="${p.id}" ${p.id === preselect ? 'selected' : ''}>${p.nombre}</option>`).join('');
            },

            nuevaCompraParaProveedor(proveedorId) {
                SidebarMenu.selectTab('compras');
                setTimeout(() => this.mostrarForm(proveedorId), 100);
            },

            agregarItem() {
                const sku = document.getElementById('ci-sku').value.trim().toUpperCase();
                const nombre = document.getElementById('ci-nombre').value.trim();
                const cantidad = parseInt(document.getElementById('ci-cantidad').value) || 0;
                const costoUnit = parseFloat(document.getElementById('ci-costo').value) || 0;
                if (!nombre || cantidad <= 0 || costoUnit <= 0) {
                    Toastify({ text: '⚠️ Completa nombre, cantidad y costo', duration: 2500, gravity: 'top', position: 'right', backgroundColor: '#fd7e14' }).showToast();
                    return;
                }
                this.itemsTemp.push({ sku, nombre, cantidad, costoUnit, subtotal: cantidad * costoUnit });
                ['ci-sku', 'ci-nombre', 'ci-cantidad', 'ci-costo'].forEach(id => { document.getElementById(id).value = ''; });
                document.getElementById('ci-cantidad').value = '1';
                this.renderItemsTemp();
            },

            eliminarItemTemp(idx) {
                this.itemsTemp.splice(idx, 1);
                this.renderItemsTemp();
            },

            renderItemsTemp() {
                const c = document.getElementById('compra-items-lista');
                const total = this.itemsTemp.reduce((s, i) => s + i.subtotal, 0);
                document.getElementById('compra-total-display').value = `S/${total.toFixed(2)}`;
                if (!this.itemsTemp.length) {
                    c.innerHTML = '<p style="text-align:center;color:#aaa;padding:15px;font-size:0.9em;">Sin productos añadidos</p>';
                    return;
                }
                c.innerHTML = `<table><thead><tr><th>SKU</th><th>Producto</th><th>Cant.</th><th>Costo Unit.</th><th>Subtotal</th><th></th></tr></thead><tbody>` +
                    this.itemsTemp.map((it, i) => `<tr>
                <td>${it.sku || '-'}</td><td>${it.nombre}</td><td>${it.cantidad}</td>
                <td>S/${it.costoUnit.toFixed(2)}</td><td><strong>S/${it.subtotal.toFixed(2)}</strong></td>
                <td><button class="delete-btn" onclick="Compras.eliminarItemTemp(${i})">✕</button></td>
            </tr>`).join('') + `</tbody></table>`;
            },

            async guardarCompra() {
                const proveedorId = document.getElementById('compra-proveedor').value;
                const fecha = document.getElementById('compra-fecha').value;
                const nroDoc = document.getElementById('compra-nro-doc').value.trim();
                if (!fecha) { Swal.fire('Error', 'La fecha es obligatoria', 'error'); return; }
                if (!this.itemsTemp.length) { Swal.fire('Error', 'Agrega al menos un producto', 'error'); return; }

                const total = this.itemsTemp.reduce((s, i) => s + i.subtotal, 0);
                const proveedor = Proveedores.cargar().find(p => p.id === proveedorId);
                const editandoId = document.getElementById('compra-editando-id').value;

                const compra = {
                    id: editandoId || Date.now().toString(),
                    fecha,
                    proveedorId,
                    proveedorNombre: proveedor ? proveedor.nombre : 'Sin proveedor',
                    nroDoc,
                    items: [...this.itemsTemp],
                    total,
                    estado: 'Recibida',
                    notas: document.getElementById('compra-notas').value.trim(),
                    createdAt: new Date().toISOString()
                };

                // Actualizar inventario y costos automáticamente
                this.itemsTemp.forEach(item => {
                    if (item.sku) {
                        // Actualizar stock en inventario
                        const invItem = Estado.inventario.find(i => i.sku === item.sku);
                        if (invItem) {
                            invItem.stock += item.cantidad;
                            Storage.actualizarProducto(invItem); // Lanzado en background
                        } else {
                            const nuevoInvItem = { sku: item.sku, nombre: item.nombre, stock: item.cantidad, reorderThreshold: 5 };
                            Estado.inventario.push(nuevoInvItem);
                            Storage.agregarProducto(nuevoInvItem); // Lanzado en background
                        }
                        // Actualizar costo en rentabilidad
                        const precioVenta = Estado.ventas.filter(v => v.sku === item.sku).reduce((s, v, _, a) => s + v.precio / a.length, 0) || item.costoUnit * 1.3;
                        const margen = precioVenta - item.costoUnit;
                        Estado.costosProductos[item.sku] = { costo: item.costoUnit, precioVenta, margen, porcentajeMargen: precioVenta > 0 ? (margen / precioVenta * 100) : 0 };
                    }
                });
                await Storage.guardarCostos();

                const compras = this.cargar();
                if (editandoId) {
                    const idx = compras.findIndex(c => c.id === editandoId);
                    if (idx !== -1) compras[idx] = compra;
                } else {
                    compras.unshift(compra);
                }
                await this.guardar(compras);
                this.cancelarForm();
                this.actualizarVista();

                await Swal.fire({ icon: 'success', title: '✅ Compra registrada', html: `<p>Se actualizó el inventario y los costos automáticamente.</p><p style="margin-top:8px;font-size:0.9em;color:#666;">Total: <strong>S/${total.toFixed(2)}</strong> · ${this.itemsTemp.length} productos</p>`, confirmButtonColor: '#4472C4' });
            },

            actualizarVista() {
                this.actualizarCards();
                this.actualizarTabla();
            },

            actualizarCards() {
                const compras = this.cargar();
                const totalComprado = compras.reduce((s, c) => s + c.total, 0);
                const mesActual = new Date().getMonth();
                const comprasMes = compras.filter(c => new Date(c.fecha).getMonth() === mesActual);
                const totalMes = comprasMes.reduce((s, c) => s + c.total, 0);
                document.getElementById('compras-cards').innerHTML = `
            <div class="card"><h3>📦 Total Compras</h3><div class="value">${compras.length}</div></div>
            <div class="card"><h3>💸 Total Invertido</h3><div class="value" style="color:#dc3545;">S/${totalComprado.toFixed(2)}</div></div>
            <div class="card"><h3>📅 Compras este Mes</h3><div class="value">${comprasMes.length}</div></div>
            <div class="card"><h3>💰 Inversión del Mes</h3><div class="value" style="color:#fd7e14;">S/${totalMes.toFixed(2)}</div></div>`;
            },

            actualizarTabla(busqueda = '') {
                const container = document.getElementById('tabla-compras');
                let compras = this.cargar();
                if (busqueda) compras = compras.filter(c =>
                    c.proveedorNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                    (c.nroDoc || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                    c.items.some(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))
                );
                if (!compras.length) { container.innerHTML = '<p style="text-align:center;color:#666;padding:30px;">No hay compras registradas</p>'; return; }
                container.innerHTML = compras.map(c => {
                    const [y, m, d] = c.fecha.split('-');
                    return `<div style="background:var(--bg-surface);border:2px solid var(--border);border-radius:10px;padding:18px;margin-bottom:12px;transition:all 0.2s;" onmouseenter="this.style.borderColor='#4472C4'" onmouseleave="this.style.borderColor='#e9ecef'">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                    <div>
                        <span style="font-weight:700;font-size:1.05em;color:var(--text-primary);">🏭 ${c.proveedorNombre}</span>
                        ${c.nroDoc ? `<span style="margin-left:10px;font-size:0.85em;color:#888;">📄 ${c.nroDoc}</span>` : ''}
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <span style="font-size:1.3em;font-weight:700;color:#dc3545;">S/${c.total.toFixed(2)}</span>
                        <button class="delete-btn" onclick="Compras.eliminarCompra('${c.id}')">🗑️</button>
                    </div>
                </div>
                <div style="font-size:0.88em;color:#666;margin-bottom:10px;">📅 ${d}/${m}/${y} · ${c.items.length} producto(s)</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${c.items.map(it => `<span style="background:rgba(59,130,246,0.1);color:var(--primary);padding:3px 10px;border-radius:12px;font-size:0.82em;font-weight:600;">${it.nombre} ×${it.cantidad} — S/${it.costoUnit.toFixed(2)}</span>`).join('')}
                </div>
                ${c.notas ? `<div style="margin-top:8px;font-size:0.82em;color:#888;">💬 ${c.notas}</div>` : ''}
            </div>`;
                }).join('');
            },

            async eliminarCompra(id) {
                const result = await Swal.fire({ title: '¿Eliminar compra?', text: 'El stock NO se revertirá automáticamente.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
                if (!result.isConfirmed) return;
                const compras = this.cargar().filter(c => c.id !== id);
                await this.guardar(compras);
                this.actualizarVista();
                Toastify({ text: '🗑️ Compra eliminada', duration: 2500, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#dc3545,#c82333)' }).showToast();
            },

            exportarExcel() {
                const compras = this.cargar();
                if (!compras.length) { Swal.fire('Sin datos', 'No hay compras para exportar', 'info'); return; }
                const rows = [];
                compras.forEach(c => { c.items.forEach(it => { rows.push({ Fecha: c.fecha, Proveedor: c.proveedorNombre, Documento: c.nroDoc || '-', SKU: it.sku || '-', Producto: it.nombre, Cantidad: it.cantidad, 'Costo Unit.': it.costoUnit, Subtotal: it.subtotal, 'Total Compra': c.total }); }); });
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Compras');
                XLSX.writeFile(wb, `Compras_${new Date().toISOString().slice(0, 10)}.xlsx`);
            }
        };

        // ════════════════════════════════════════════════════════════════
        // MÓDULO: GENERADOR DE SKU (Panel inline en Registro)
        // ════════════════════════════════════════════════════════════════
        const SkuGen = {
            _activeIdx: {},
            _fields: [],
            configCampos: {
                tecnico: [
                    { id: 'marca', label: '🏢 Marca', placeholder: 'SAMSUNG' },
                    { id: 'producto', label: '📦 Producto', placeholder: 'LAPTOP' },
                    { id: 'unidad', label: '📐 Unidad', placeholder: 'UNIDAD' },
                    { id: 'color', label: '🎨 Color', placeholder: 'NEGRO' },
                    { id: 'tipo', label: '🔌 Tipo', placeholder: 'INALAMBRICO' },
                    { id: 'modelo', label: '🔢 Modelo', placeholder: 'PRO' },
                    { id: 'voltaje', label: '⚡ Voltaje/Watts', placeholder: '65W' },
                    { id: 'capacidad', label: '💾 Capacidad', placeholder: '512GB' },
                    { id: 'usb', label: '🔗 USB', placeholder: 'USB 3.0' },
                    { id: 'extra', label: '➕ Extra', placeholder: '4K, DDR5...' }
                ],
                general: [
                    { id: 'categoria', label: '📁 Categoría', placeholder: 'ABARROTES' },
                    { id: 'marca', label: '🏢 Marca', placeholder: 'GLORIA' },
                    { id: 'producto', label: '📦 Producto', placeholder: 'LECHE' },
                    { id: 'variante', label: '🏷️ Variante/Sabor', placeholder: 'CHOCOLATE' },
                    { id: 'unidad', label: '📐 Unidad', placeholder: 'CAJA' },
                    { id: 'tamano', label: '📏 Tamaño/Peso', placeholder: '1 LITRO' },
                    { id: 'color', label: '🎨 Color', placeholder: 'N/A' },
                    { id: 'extra', label: '➕ Extra', placeholder: 'PACK X6' }
                ],
                minimarket: [
                    { id: 'categoria', label: '📁 Categoría', placeholder: 'BEBIDAS' },
                    { id: 'marca', label: '🏢 Marca', placeholder: 'COCA COLA' },
                    { id: 'producto', label: '📦 Producto', placeholder: 'GASEOSA' },
                    { id: 'unidad', label: '📐 Unidad', placeholder: 'BOTELLA' },
                    { id: 'tamano', label: '📏 Tamaño/Peso', placeholder: '500ML' },
                    { id: 'extra', label: '➕ Extra', placeholder: 'SIN AZUCAR' }
                ],
                restaurante: [
                    { id: 'categoria', label: '📁 Categoría', placeholder: 'PLATO DE FONDO' },
                    { id: 'producto', label: '📦 Producto', placeholder: 'LOMO SALTADO' },
                    { id: 'variante', label: '🏷️ Variante', placeholder: 'A LO POBRE' },
                    { id: 'porcion', label: '🍽️ Porción', placeholder: 'FAMILIAR' },
                    { id: 'extra', label: '➕ Extra', placeholder: 'SIN CEBOLLA' }
                ],
                farmacia: [
                    { id: 'categoria', label: '📁 Categoría', placeholder: 'ANALGÉSICOS' },
                    { id: 'marca', label: '🏢 Laboratorio', placeholder: 'BAYER' },
                    { id: 'producto', label: '📦 Producto', placeholder: 'ASPIRINA' },
                    { id: 'principio', label: '🔬 Princ. Activo', placeholder: 'ÁCIDO ACETILSALICÍLICO' },
                    { id: 'presentacion', label: '💊 Presentación', placeholder: 'BLISTER 10' },
                    { id: 'concentracion', label: '💧 Concentración', placeholder: '500MG' }
                ],
                ferreteria: [
                    { id: 'categoria', label: '📁 Categoría', placeholder: 'HERRAMIENTAS' },
                    { id: 'marca', label: '🏢 Marca', placeholder: 'TRUPER' },
                    { id: 'producto', label: '📦 Producto', placeholder: 'MARTILLO' },
                    { id: 'unidad', label: '📐 Unidad', placeholder: 'UNIDAD' },
                    { id: 'medida', label: '📏 Medida/Tamaño', placeholder: '16 OZ' },
                    { id: 'material', label: '⚙️ Material', placeholder: 'ACERO' }
                ],
                abarrotes: [
                    { id: 'categoria', label: '📁 Categoría', placeholder: 'ABARROTES' },
                    { id: 'marca', label: '🏢 Marca', placeholder: 'COSTEÑO' },
                    { id: 'producto', label: '📦 Producto', placeholder: 'ARROZ' },
                    { id: 'unidad', label: '📐 Unidad', placeholder: 'SACO' },
                    { id: 'tamano', label: '📏 Peso', placeholder: '50KG' },
                    { id: 'extra', label: '➕ Extra', placeholder: 'GRADO 1' }
                ],
                musica: [
                    { id: 'categoria', label: '📁 Categoría', placeholder: 'CUERDAS' },
                    { id: 'marca', label: '🏢 Marca', placeholder: 'FENDER' },
                    { id: 'producto', label: '📦 Producto', placeholder: 'GUITARRA' },
                    { id: 'tipo', label: '🎸 Tipo', placeholder: 'ELECTRICA' },
                    { id: 'modelo', label: '🔢 Modelo', placeholder: 'STRATOCASTER' },
                    { id: 'material', label: '🪵 Material', placeholder: 'ARCE' },
                    { id: 'extra', label: '➕ Extra', placeholder: 'INCLUYE FUNDA' }
                ]
            },

            suggestionsTecnica: {
                marca: ['SAMSUNG', 'APPLE', 'HP', 'DELL', 'LENOVO', 'ASUS', 'ACER', 'SONY', 'LG', 'LOGITECH', 'RAZER', 'MSI', 'CORSAIR', 'KINGSTON', 'SEAGATE', 'WESTERN DIGITAL', 'CRUCIAL', 'INTEL', 'AMD', 'NVIDIA', 'TP-LINK', 'D-LINK', 'BELKIN', 'ANKER', 'JBL', 'XIAOMI', 'HUAWEI', 'CANON', 'BROTHER', 'EPSON'],
                producto: ['LAPTOP', 'DESKTOP', 'MONITOR', 'TECLADO', 'MOUSE', 'AURICULARES', 'WEBCAM', 'IMPRESORA', 'SCANNER', 'DISCO DURO', 'SSD', 'MEMORIA RAM', 'TARJETA GRAFICA', 'PROCESADOR', 'PLACA MADRE', 'FUENTE DE PODER', 'GABINETE', 'COOLER', 'TABLET', 'SMARTPHONE', 'CARGADOR', 'CABLE HDMI', 'HUB USB', 'ROUTER', 'SWITCH', 'ACCESS POINT', 'PROYECTOR', 'CAMARA WEB', 'MICROFONO', 'PARLANTE BLUETOOTH'],
                unidad: ['UNIDAD', 'PAR', 'SET', 'PAQUETE', 'CAJA', 'METRO', 'CENTIMETRO', 'KILOGRAMO', 'GRAMO', 'LITRO', 'MILILITRO', 'DOCENA', 'LOTE', 'KIT', 'ROLL', 'TIRA', 'PIEZA', 'SECCION', 'BOBINA', 'BUNDLE', 'COMBO', 'BLISTER', 'SOBRE', 'BOLSA', 'CARTUCHO', 'RESMA', 'PALETA', 'DISPLAY', 'TORRE', 'RACK'],
                color: ['NEGRO', 'BLANCO', 'PLATA', 'GRIS', 'AZUL', 'ROJO', 'VERDE', 'AMARILLO', 'NARANJA', 'MORADO', 'ROSA', 'DORADO', 'BRONCE', 'MARRON', 'BEIGE', 'TRANSPARENTE', 'MULTICOLOR', 'AZUL MARINO', 'ROJO OSCURO', 'VERDE MILITAR', 'GRIS ESPACIAL', 'BLANCO NIEVE', 'NEGRO MATE', 'PLATEADO', 'COBRE', 'TURQUESA', 'VIOLETA', 'CELESTE', 'ARENA', 'GRAFITO'],
                tipo: ['INALAMBRICO', 'CON CABLE', 'BLUETOOTH', 'WIFI', 'USB', 'HDMI', 'VGA', 'DISPLAYPORT', 'THUNDERBOLT', 'TIPO-C', 'MINI', 'COMPACTO', 'GAMING', 'MECANICO', 'MEMBRANA', 'OPTICO', 'LASER', 'ERGONOMICO', 'RETROILUMINADO', 'TKL', 'FULL SIZE', 'PORTATIL', 'EXTERNO', 'INTERNO', 'MODULAR', 'SEMI-MODULAR', 'ATX', 'MICRO-ATX', 'MINI-ITX', 'DUAL BAND'],
                modelo: ['GEN1', 'GEN2', 'GEN3', 'V1', 'V2', 'V3', 'PRO', 'PLUS', 'MAX', 'ULTRA', 'MINI', 'LITE', 'STANDARD', 'BASIC', 'ADVANCED', 'ELITE', 'PREMIUM', 'BUSINESS', 'HOME', 'ENTERPRISE', '2024', '2023', '2022', 'MK1', 'MK2', 'MK3', 'SERIES X', 'SERIES S', 'OEM', 'RETAIL'],
                voltaje: ['5W', '10W', '15W', '18W', '20W', '25W', '30W', '45W', '60W', '65W', '90W', '100W', '120W', '150W', '200W', '250W', '300W', '450W', '500W', '550W', '600W', '650W', '750W', '800W', '850W', '1000W', '1200W', '1500W', '2000W', '3000W'],
                capacidad: ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB', '4TB', '8TB', '16GB', '32GB', '8GB', '4GB', '2GB', '1GB', '500GB', '250GB', '120GB', '480GB', '960GB', '240GB', '6TB', '10TB', '12TB', '16TB', '18TB', '20TB', '3TB', '500MB', '4K', '8K'],
                usb: ['USB 2.0', 'USB 3.0', 'USB 3.1', 'USB 3.2', 'USB 4.0', 'USB-C', 'USB-A', 'USB-B', 'MINI-USB', 'MICRO-USB', 'USB 3.0 GEN1', 'USB 3.0 GEN2', 'USB 3.2 GEN2X2', 'THUNDERBOLT 3', 'THUNDERBOLT 4', 'LIGHTNING', 'USB-C PD', 'USB-C 3.1', 'USB-C 3.2', 'USB-C 4.0', 'FIREWIRE', 'ESATA', 'HUB 4 PUERTOS', 'HUB 7 PUERTOS', 'USB-C A USB-A', 'OTG', 'USB 2.0 HUB', 'USB 3.0 HUB', 'USB-C A HDMI', 'USB-C DOCK'],
                extra: ['4K', '8K', '1080P', '2K', '144HZ', '240HZ', 'HDR', 'OLED', 'IPS', 'TN', 'VA', 'DDR4', 'DDR5', 'PCIe 4.0', 'PCIe 5.0', 'NVMe', 'SATA', 'M.2', 'RGB', 'BACKLIT', 'IP67', 'IP68', 'WATERPROOF', 'ANTIVIRUS', '1AÑO', '2AÑOS', '3AÑOS', 'LICENCIA', 'ORIGINAL', 'COMPATIBLE']
            },

            suggestionsGeneral: {
                categoria: ['ABARROTES', 'BEBIDAS', 'LIMPIEZA', 'ROPA', 'CUIDADO PERSONAL', 'OTROS'],
                marca: ['GLORIA', 'NESTLE', 'ALICORP', 'BIMBO', 'COCA COLA', 'PEPSI', 'NIKE', 'ADIDAS', 'GENERICO'],
                producto: ['LECHE', 'ARROZ', 'FIDEOS', 'ACEITE', 'GALLETAS', 'GASEOSA', 'DETERGENTE', 'POLO', 'PANTALON', 'ZAPATILLAS'],
                variante: ['CHOCOLATE', 'FRESA', 'VAINILLA', 'MENTA', 'CLASICO', 'INTEGRAL'],
                unidad: ['UNIDAD', 'CAJA', 'DOCENA', 'KILOGRAMO', 'GRAMO', 'LITRO', 'MILILITRO', 'PAQUETE', 'PAR'],
                tamano: ['1 LITRO', '500 ML', '1 KG', '500 G', 'PEQUEÑO', 'MEDIANO', 'GRANDE'],
                color: ['ROJO', 'AZUL', 'BLANCO', 'NEGRO', 'VARIADO', 'VERDE', 'AMARILLO'],
                tipo: ['ABARROTES', 'BEBIDAS', 'LIMPIEZA', 'ROPA', 'CUIDADO PERSONAL', 'OTROS'],
                modelo: ['N/A', 'ESTANDAR', 'OFERTA'],
                voltaje: ['N/A', 'ESTANDAR', 'OFERTA'],
                capacidad: ['N/A', 'ESTANDAR', 'OFERTA'],
                usb: ['N/A', 'ESTANDAR', 'OFERTA'],
                extra: ['N/A', 'ESTANDAR', 'OFERTA']
            },

            suggestions: {}, // Se llenará dinámicamente

            generarInteligente(nombre, categoria) {
                if (!nombre || !nombre.trim()) return `GEN-${Math.floor(100 + Math.random() * 900)}`;

                let text = nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                const stopWords = /\b(DE|PARA|EL|LA|LOS|LAS|CON|SIN|EN|UN|UNA|UNOS|UNAS|POR|Y|O)\b/g;
                text = text.replace(stopWords, "").replace(/\s+/g, " ").trim();

                let caracteristica = "000";
                const regexCaracteristica = /\b(\d+(?:\.\d+)?(?:GB|TB|MB|L|ML|KG|G|W|V))\b/i;
                const match = text.match(regexCaracteristica);
                if (match) {
                    caracteristica = match[1].toUpperCase();
                    text = text.replace(regexCaracteristica, "").replace(/\s+/g, " ").trim();
                } else {
                    const numMatch = text.match(/\b(\d+[A-Z]*)\b/i);
                    if (numMatch) {
                        caracteristica = numMatch[1].toUpperCase();
                        text = text.replace(/\b(\d+[A-Z]*)\b/i, "").replace(/\s+/g, " ").trim();
                    }
                }

                const words = text.split(" ");
                let marca = words[0] ? words[0].substring(0, 4) : "GEN";

                let cat = "GEN";
                if (categoria && categoria.trim()) {
                    cat = categoria.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 3);
                }

                const rand = Math.floor(100 + Math.random() * 900);

                return `${cat}-${marca}-${caracteristica}-${rand}`;
            },

            renderCampos() {
                const giro = (typeof Estado !== 'undefined' && Estado.configuracion) ? Estado.configuracion.giro : 'tecnico';
                const configElegida = this.configCampos[giro] || this.configCampos.general;
                this._fields = configElegida.map(c => c.id);

                const html = configElegida.map(campo => `
                    <div class="sku-field-wrap">
                        <label>${campo.label}</label>
                        <input type="text" id="skup-${campo.id}" placeholder="${campo.placeholder}" 
                            oninput="SkuGen.onPanelInput(this,'${campo.id}')" 
                            onkeydown="SkuGen.onKey(event,'${campo.id}')" 
                            onfocus="SkuGen.showSuggestions('${campo.id}')" 
                            onblur="SkuGen.hideSuggestions('${campo.id}')">
                        <div class="sku-suggestions" id="sugp-${campo.id}"></div>
                    </div>`).join('');
                document.getElementById('sku-fields-container').innerHTML = html;
            },

            actualizarSugerencias() {
                const giro = (typeof Estado !== 'undefined' && Estado.configuracion) ? Estado.configuracion.giro : 'tecnico';
                if (giro === 'tecnico') {
                    this.suggestions = this.suggestionsTecnica;
                } else {
                    this.suggestions = this.suggestionsGeneral; // Para los demás rubros, por ahora usamos general como fallback para algunos campos. En showSuggestions si no existe, no falla.
                }
                this.renderCampos();
            },

            _abbrev(str) {
                if (!str) return '';
                const s = str.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9\-\.]/g, '');
                if (s.length <= 4) return s;
                const parts = s.split('-');
                return parts.map(p => p.length <= 4 ? p : (p[0] + p.slice(1).replace(/[AEIOU]/g, '').slice(0, 3)).slice(0, 4)).join('-');
            },

            _getVal(field) {
                const el = document.getElementById('skup-' + field);
                return el ? el.value.trim() : '';
            },

            generateSKU() {
                return this._fields.map(f => this._abbrev(this._getVal(f))).filter(Boolean).join('-') || '—';
            },

            updatePanelOutput() {
                const sku = this.generateSKU();
                const out = document.getElementById('sku-inline-output');
                if (out) out.textContent = sku;
            },

            togglePanel(targetInputId = 'sku') {
                const panel = document.getElementById('sku-inline-panel');
                if (!panel) return;

                const targetInput = document.getElementById(targetInputId);
                if (targetInput && targetInput.parentElement && targetInput.parentElement.parentElement) {
                    // Mover visualmente el panel debajo del input que lo llama (suele estar en un .form-group)
                    targetInput.parentElement.parentElement.appendChild(panel);
                }

                const open = panel.style.display !== 'none';
                panel.style.display = open ? 'none' : 'block';
                if (!open) {
                    this.currentTargetId = targetInputId;
                    this.updatePanelOutput();
                }
            },

            onPanelInput(input, field) {
                input.value = input.value.toUpperCase();
                this.updatePanelOutput();
                this._renderSuggestions(field, input.value);
            },

            _renderSuggestions(field, query) {
                const box = document.getElementById('sugp-' + field);
                if (!box) return;
                const all = this.suggestions[field] || [];
                const q = query.toUpperCase().trim();
                const filtered = q ? all.filter(s => s.includes(q)).slice(0, 30) : all.slice(0, 30);
                if (!filtered.length) { box.style.display = 'none'; return; }
                this._activeIdx[field] = -1;
                box.innerHTML = filtered.map((s, i) =>
                    `<div data-idx="${i}" onmousedown="SkuGen._selectSugg('${field}','${s.replace(/'/g, "\\'")}')">${s}</div>`
                ).join('');
                box.style.display = 'block';
            },

            showSuggestions(field) {
                this._renderSuggestions(field, this._getVal(field));
            },

            hideSuggestions(field) {
                setTimeout(() => {
                    const box = document.getElementById('sugp-' + field);
                    if (box) box.style.display = 'none';
                }, 180);
            },

            _selectSugg(field, value) {
                const el = document.getElementById('skup-' + field);
                if (el) el.value = value;
                const box = document.getElementById('sugp-' + field);
                if (box) box.style.display = 'none';
                this.updatePanelOutput();
            },

            onKey(e, field) {
                const box = document.getElementById('sugp-' + field);
                if (!box || box.style.display === 'none') return;
                const items = box.querySelectorAll('div');
                let idx = this._activeIdx[field] ?? -1;
                if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(idx + 1, items.length - 1); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, -1); }
                else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); items[idx].dispatchEvent(new MouseEvent('mousedown')); return; }
                else if (e.key === 'Escape') { box.style.display = 'none'; return; }
                else return;
                this._activeIdx[field] = idx;
                items.forEach((it, i) => it.classList.toggle('active', i === idx));
                if (idx >= 0) items[idx].scrollIntoView({ block: 'nearest' });
            },

            aplicarARegistro() {
                const sku = this.generateSKU();
                if (sku === '—') { Toastify({ text: '⚠️ Completa al menos un campo', duration: 2500, gravity: 'top', position: 'right', backgroundColor: '#fd7e14' }).showToast(); return; }
                
                const targetId = this.currentTargetId || 'sku';
                const skuField = document.getElementById(targetId);
                if (skuField) skuField.value = sku;
                
                document.getElementById('sku-inline-panel').style.display = 'none';
                Toastify({ text: '✅ SKU aplicado: ' + sku, duration: 3000, gravity: 'top', position: 'right', backgroundColor: 'linear-gradient(to right,#7C3AED,#5B21B6)' }).showToast();
            },

            limpiarPanel() {
                this._fields.forEach(f => {
                    const el = document.getElementById('skup-' + f);
                    if (el) el.value = '';
                    const box = document.getElementById('sugp-' + f);
                    if (box) box.style.display = 'none';
                });
                this.updatePanelOutput();
            },

            init() {
                this.actualizarSugerencias();
                this.renderCampos();
            }
        };