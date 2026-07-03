const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require('cors')({origin: true});

admin.initializeApp();
const db = admin.firestore();

// Variable de entorno / Secreto para el token de la API externa
const API_TOKEN = functions.config().miapi ? functions.config().miapi.token : 'f4616d3f-dd18-4e08-89dc-ebc2fad3c9ba';

exports.consultarDNI = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
        
        const dni = req.body.dni;
        if (!dni || dni.length !== 8) {
            return res.status(400).json({ error: 'DNI inválido' });
        }

        try {
            const apiResponse = await fetch(`https://miapi.cloud/v1/dni/${dni}`, {
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`
                }
            });
            const data = await apiResponse.json();
            return res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching DNI:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
});

exports.procesarVenta = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

        const { sku, cantidad, cliente, metodoPago, tenantId } = req.body;
        
        if (!sku || !cantidad || !tenantId) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos' });
        }

        try {
            // Ejecutar la venta en una transacción para asegurar atomicidad
            await db.runTransaction(async (transaction) => {
                const inventarioRef = db.collection('empresas').doc(tenantId).collection('inventario').doc(sku);
                const doc = await transaction.get(inventarioRef);

                if (!doc.exists) {
                    throw new Error('Producto no encontrado en inventario');
                }

                const producto = doc.data();
                
                // Verificar stock (si maneja stock)
                if (producto.stock !== undefined && producto.stock < cantidad) {
                    throw new Error('Stock insuficiente');
                }

                // Obtener precio
                const precio = producto.precioVenta || 0;
                const total = precio * cantidad;

                // Descontar stock
                if (producto.stock !== undefined) {
                    transaction.update(inventarioRef, {
                        stock: admin.firestore.FieldValue.increment(-cantidad)
                    });
                }

                // Registrar venta
                const ventaRef = db.collection('empresas').doc(tenantId).collection('ventas').doc();
                transaction.set(ventaRef, {
                    sku,
                    producto: producto.nombre || sku,
                    cantidad,
                    precioUnitario: precio,
                    total,
                    cliente,
                    metodoPago,
                    fecha: admin.firestore.FieldValue.serverTimestamp(),
                    estado: 'completada'
                });
            });

            return res.status(200).json({ success: true, message: 'Venta registrada exitosamente' });
        } catch (error) {
            console.error('Error procesando venta:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    });
});
