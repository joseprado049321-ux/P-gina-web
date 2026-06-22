
    const CategoriaCustom = (() => {
        const STORAGE_KEY = 'categorias_custom';

        function getDefaultCats() {
            const giro = localStorage.getItem('giroNegocio') || 'tecnico';
            if (giro === 'general') {
                return ['Abarrotes', 'Ropa', 'Bebidas', 'Limpieza', 'Cuidado Personal', 'Otros'];
            }
            return ['Laptops', 'Desktops', 'Accesorios', 'Periféricos', 'Componentes', 'Servicios', 'Otros'];
        }

        function getCustom() {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; }
        }
        function saveCustom(arr) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        }
        function cargarEnSelect() {
            const defaults = getDefaultCats();
            let customCats = [];
            try { 
                const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); 
                customCats = Array.isArray(parsed) ? parsed : [];
            } catch(e) { }

            customCats = customCats.filter(c => {
                if (!c || typeof c !== 'string') return false;
                const clean = c.trim().toLowerCase();
                return clean !== 'seleccionar...' && clean !== 'todas' && clean !== 'seleccionar';
            });
            const combined = [...new Set([...defaults, ...customCats])];

            const sel = document.getElementById('categoria');
            if (sel) {
                const val = sel.value;
                sel.options.length = 0; // Limpiar opciones de manera segura
                const optDef = document.createElement('option');
                optDef.value = '';
                optDef.textContent = 'Seleccionar...';
                sel.appendChild(optDef);
                
                combined.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    sel.appendChild(opt);
                });
                if (val) sel.value = val;
            }

            const selFiltro = document.getElementById('filtro-categoria');
            if (selFiltro) {
                const valFiltro = selFiltro.value;
                selFiltro.options.length = 0;
                const optDefFiltro = document.createElement('option');
                optDefFiltro.value = '';
                optDefFiltro.textContent = 'Todas';
                selFiltro.appendChild(optDefFiltro);

                combined.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    selFiltro.appendChild(opt);
                });
                if (valFiltro) selFiltro.value = valFiltro;
            }

            const selInv = document.getElementById('nuevo-categoria-inv');
            if (selInv) {
                const valInv = selInv.value;
                selInv.options.length = 0;
                const optDefInv = document.createElement('option');
                optDefInv.value = '';
                optDefInv.textContent = 'Seleccionar...';
                selInv.appendChild(optDefInv);
                
                combined.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    selInv.appendChild(opt);
                });
                if (valInv) selInv.value = valInv;
            }
        }

        async function agregar() {
            const { value: nombre } = await Swal.fire({
                title: 'Nueva Categoría',
                input: 'text',
                inputPlaceholder: 'Ej: Abarrotes',
                showCancelButton: true,
                confirmButtonColor: '#10B981',
                confirmButtonText: 'Guardar',
                cancelButtonText: 'Cancelar'
            });

            if (!nombre || !nombre.trim()) return;

            const cleanNombre = nombre.trim();
            const defaults = getDefaultCats();
            const all = [...defaults, ...getCustom()].map(c => c.toLowerCase());
            
            if (all.includes(cleanNombre.toLowerCase())) {
                const sel = document.getElementById('categoria');
                if (sel) [...sel.options].forEach(o => { if (o.text.toLowerCase() === cleanNombre.toLowerCase()) sel.value = o.text; });
                const selInv = document.getElementById('nuevo-categoria-inv');
                if (selInv) [...selInv.options].forEach(o => { if (o.text.toLowerCase() === cleanNombre.toLowerCase()) selInv.value = o.text; });
                return;
            }

            const custom = getCustom();
            custom.push(cleanNombre);
            saveCustom(custom);
            cargarEnSelect();

            const sel = document.getElementById('categoria');
            if (sel) sel.value = cleanNombre;
            const selInv = document.getElementById('nuevo-categoria-inv');
            if (selInv) selInv.value = cleanNombre;

            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: '✅ Categoría "' + cleanNombre + '" añadida',
                    duration: 2500, gravity: 'bottom', position: 'right',
                    style: { background: 'linear-gradient(135deg,#10B981,#059669)', borderRadius: '10px', fontWeight: '600' }
                }).showToast();
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            cargarEnSelect();
        });

        return { agregar, cargarEnSelect };
    })();
    