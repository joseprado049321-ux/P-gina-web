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

exports.procesarVenta = functions.https.onCall(async (data, context) => {
    // 1. Verificar si el usuario está autenticado
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión para procesar una venta.');
    }

    const { sku, cantidad, cliente, metodoPago, tenantId } = data;
    
    if (!sku || !cantidad || !tenantId) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros requeridos.');
    }

    try {
        // 2. Verificar que el usuario pertenece al tenantId o es SuperAdmin
        const isSuperAdmin = context.auth.token.email === "joseprado049321@gmail.com";
        
        if (!isSuperAdmin) {
            const userDoc = await db.collection('usuarios_acceso').doc(context.auth.uid).get();
            if (!userDoc.exists) {
                throw new functions.https.HttpsError('permission-denied', 'Tu cuenta no está registrada correctamente.');
            }
            const userData = userDoc.data();
            if (userData.tenantId !== tenantId) {
                throw new functions.https.HttpsError('permission-denied', 'No tienes permisos para realizar ventas en esta tienda.');
            }
        }

        // 3. Ejecutar la venta en una transacción para asegurar atomicidad
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
                cliente: cliente || 'Anónimo',
                metodoPago: metodoPago || 'efectivo',
                fecha: admin.firestore.FieldValue.serverTimestamp(),
                estado: 'completada'
            });
        });

        return { success: true, message: 'Venta registrada exitosamente' };
    } catch (error) {
        console.error('Error procesando venta:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Ocurrió un error al procesar la venta.');
    }
});
