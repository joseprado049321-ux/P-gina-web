
    $(document).ready(function () {

        // ── BOTÓN CONSULTAR DNI ──────────────────────────────────────
        // Paso 1: El usuario escribe 8 dígitos en #dniInput
        // Paso 2: Hace clic en #btnConsultarDNI
        // Paso 3: Se llama a la API MiAPI Cloud con fetch()
        // Paso 4: Si hay respuesta exitosa, se rellena #cliente
        // Paso 5: Se muestra una alerta de éxito con SweetAlert2
        // ─────────────────────────────────────────────────────────────
        $('#btnConsultarDNI').on('click', function () {
            var dni   = $('#dniInput').val().toString().trim();
            var token = 'f4616d3f-dd18-4e08-89dc-ebc2fad3c9ba';

            // Validar que sean exactamente 8 dígitos
            if (!/^\d{8}$/.test(dni)) {
                Swal.fire({
                    icon: 'warning',
                    title: 'DNI inválido',
                    text: 'Por favor ingresa exactamente 8 dígitos numéricos.',
                    confirmButtonColor: '#4472C4'
                });
                return;
            }

            // Deshabilitar el botón mientras busca (evita doble clic)
            var $btn = $(this);
            $btn.html('⏳ Buscando...').prop('disabled', true);

            // ── Llamada a la API ─────────────────────────────────────
            // URL: https://api.miapi.cloud/v1/dni/{DNI}?token={TOKEN}
            // La API devuelve: { success: true, data: { nombres, apellidoPaterno, apellidoMaterno } }
            fetch('https://miapi.cloud/v1/dni/' + dni, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                })
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    console.log('Respuesta API DNI:', JSON.stringify(data));

                    // Formato real de miapi.cloud:
                    // { success: true, datos: { nombres, ape_paterno, ape_materno, ... } }
                    var d = data.datos || data.data || {};
                    var nombres   = d.nombres      || '';
                    var apPaterno = d.ape_paterno  || d.apellidoPaterno || '';
                    var apMaterno = d.ape_materno  || d.apellidoMaterno || '';
                    var nombreCompleto = (nombres + ' ' + apPaterno + ' ' + apMaterno).trim();

                    if (nombreCompleto.length > 2) {
                        $('#cliente').val(nombreCompleto);
                        // Ocultar campos manuales si estaban visibles
                        $('#campos-manuales-dni').slideUp(200);
                        Swal.fire({
                            icon: 'success',
                            title: '✅ Cliente encontrado',
                            text: nombreCompleto,
                            timer: 2500,
                            showConfirmButton: false
                        });
                    } else {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Respuesta inesperada',
                            html: '<p>La API respondió con un formato distinto.</p>'
                                + '<pre style="font-size:11px;text-align:left;background:#f0f0f0;padding:8px;border-radius:6px;overflow:auto;max-height:120px;">'
                                + JSON.stringify(data, null, 2) + '</pre>',
                            confirmButtonColor: '#4472C4'
                        });
                    }
                })
                .catch(function (error) {
                    console.error('Error API DNI:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error de conexión',
                        text: 'No se pudo conectar con la API. Revisa tu internet.',
                        confirmButtonColor: '#4472C4'
                    });
                })
                .finally(function () {
                    // Restaurar el botón siempre, haya error o éxito
                    $btn.html('🔍 Consultar').prop('disabled', false);
                });
        });

        // También activar la consulta al presionar ENTER dentro del campo DNI
        $('#dniInput').on('keypress', function (e) {
            if (e.which === 13) {
                e.preventDefault();
                $('#btnConsultarDNI').trigger('click');
            }
        });

        // ── INGRESO MANUAL DE NOMBRE ─────────────────────────────────
        // Mostrar / ocultar el panel al hacer clic en el enlace
        $('#btnIngresarManual').on('click', function (e) {
            e.preventDefault();
            $('#campos-manuales-dni').slideToggle(200);
        });

        // Botón "Aplicar nombre" — une los 3 campos y los coloca en #cliente
        $('#btnAplicarManual').on('click', function () {
            var nombres    = $('#manual-nombres').val().trim().toUpperCase();
            var apPaterno  = $('#manual-ap-paterno').val().trim().toUpperCase();
            var apMaterno  = $('#manual-ap-materno').val().trim().toUpperCase();

            if (!nombres && !apPaterno) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Campos vacíos',
                    text: 'Ingresa al menos el nombre y el apellido paterno.',
                    confirmButtonColor: '#4472C4'
                });
                return;
            }

            var nombreCompleto = (nombres + ' ' + apPaterno + ' ' + apMaterno).trim();
            $('#cliente').val(nombreCompleto);

            // Limpiar y ocultar el panel
            $('#manual-nombres, #manual-ap-paterno, #manual-ap-materno').val('');
            $('#campos-manuales-dni').slideUp(200);

            Toastify({
                text: '✅ Nombre aplicado: ' + nombreCompleto,
                duration: 2500,
                gravity: 'top',
                position: 'right',
                style: { background: 'linear-gradient(135deg,#10B981,#059669)', borderRadius: '10px', fontWeight: '600' }
            }).showToast();
        });

    }); // fin $(document).ready
    