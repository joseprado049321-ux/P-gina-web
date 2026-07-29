const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require('cors')({origin: true});

admin.initializeApp();
const db = admin.firestore();

// Variable de entorno / Secreto para el token de la API externa
const API_TOKEN = functions.config().miapi ? functions.config().miapi.token : 'f4616d3f-dd18-4e08-89dc-ebc2fad3c9ba';

exports.consultarDNI = functions.https.onCall(async (data, context) => {
    // 1. Validar autenticación
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado para consultar DNI.');
    }

    const dni = data.dni;
    if (!dni || dni.length !== 8) {
        throw new functions.https.HttpsError('invalid-argument', 'DNI inválido.');
    }

    try {
        const apiResponse = await fetch(`https://miapi.cloud/v1/dni/${dni}`, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        });
        
        if (!apiResponse.ok) {
            throw new Error(`API Error: ${apiResponse.statusText}`);
        }
        
        const resultData = await apiResponse.json();
        return resultData;
    } catch (error) {
        console.error('Error fetching DNI:', error);
        throw new functions.https.HttpsError('internal', 'Error interno al consultar el DNI.');
    }
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
        const isSuperAdmin = context.auth.token.email === "joseprado049321@gmail.com" || context.auth.token.admin === true;
        
        if (!isSuperAdmin) {
            if (!context.auth.token.tenantId || context.auth.token.tenantId !== tenantId) {
                throw new functions.https.HttpsError('permission-denied', 'No tienes permisos para realizar ventas en esta tienda. Por favor cierra sesión y vuelve a entrar para actualizar tus permisos.');
            }
        }

        // 3. Ejecutar la venta en una transacción para asegurar atomicidad
        const resultId = await db.runTransaction(async (transaction) => {
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

            let ventaId;
            // Registrar venta
            const ventaRef = db.collection('empresas').doc(tenantId).collection('ventas').doc();
            ventaId = ventaRef.id;
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
            return ventaId;
        });

        return { success: true, message: 'Venta registrada exitosamente', ventaId: resultId };
    } catch (error) {
        console.error('Error procesando venta:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Ocurrió un error al procesar la venta.');
    }
});

// Trigger para asignar Custom Claims cuando se crea un usuario en usuarios_acceso
exports.onUserAccessCreated = functions.firestore
    .document('usuarios_acceso/{userId}')
    .onCreate(async (snap, context) => {
        const userId = context.params.userId;
        const data = snap.data();
        
        try {
            const claims = {
                tenantId: data.tenantId,
                rol: data.rol,
                admin: data.rol === 'admin' || data.rol === 'superadmin'
            };
            await admin.auth().setCustomUserClaims(userId, claims);
            console.log(`Custom claims assigned to new user ${userId}:`, claims);
        } catch (error) {
            console.error(`Error setting custom claims for new user ${userId}:`, error);
        }
    });

// Trigger para actualizar Custom Claims si cambia el rol o tenant de un usuario
exports.onUserAccessUpdated = functions.firestore
    .document('usuarios_acceso/{userId}')
    .onUpdate(async (change, context) => {
        const userId = context.params.userId;
        const newData = change.after.data();
        
        try {
            const claims = {
                tenantId: newData.tenantId,
                rol: newData.rol,
                admin: newData.rol === 'admin' || newData.rol === 'superadmin'
            };
            await admin.auth().setCustomUserClaims(userId, claims);
            console.log(`Custom claims updated for user ${userId}:`, claims);
        } catch (error) {
            console.error(`Error updating custom claims for user ${userId}:`, error);
        }
    });
