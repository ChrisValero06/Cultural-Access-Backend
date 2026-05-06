require('dotenv').config();

const express = require('express');
const router = express.Router();
const Promocion = require('../models/Promocion');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const cors = require('cors');

// ⭐⭐ VERIFICAR QUE EL PATH SEA CORRECTO - AJUSTA SEGÚN TU ESTRUCTURA
const { sendPromocionEmail } = require('../utils/emailSender-promocion');

// Habilitar CORS en todo el router
router.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://culturallaccess.residente.mx'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

router.options('*', cors());

// Middleware CORS manual
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// Configuración de rutas de imágenes
const UPLOADS_DIR = path.join(__dirname, '../httpdocs/images/uploads');

// Configuración de multer para recibir archivos en memoria
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});

// POST crear nueva promoción - VERSIÓN CORREGIDA CON EMAIL
router.post('/', upload.fields([
    { name: 'imagen_principal', maxCount: 1 },
    { name: 'imagen_secundaria', maxCount: 1 }
]), async (req, res) => {
    try {
        const body = req.body || {};
        const files = req.files || {};

        const ineflucion = body.ineflucion || body.institucion || body.institucion?.toString();
        const tipo_premedio = body.tipo_premedio || body.tipo_promocion || body.tipoPromocion;
        const disciplina = body.disciplina;
        const beneficios = body.beneficios;
        const comentarios_restrictiones = body.comentarios_restrictiones || body.comentarios_restricciones || body.comentariosRestricciones;
        const fecha_inicio = body.fecha_inicio || body.fechaInicio;
        const fecha_fin = body.fecha_fin || body.fechaFin;
        const estado = body.estado || 'activa';

        // Validación
        if (!ineflucion || !tipo_premedio) {
            return res.status(400).json({
                success: false,
                error: 'Institución y tipo de promoción son obligatorios'
            });
        }

        let imagenPrincipalPath = null;
        let imagenSecundariaPath = null;

        if (files.imagen_principal && files.imagen_principal[0]) {
            const imagenPrincipalFile = files.imagen_principal[0];
            const timestamp = Date.now();
            const nombreWebp = `principal_${timestamp}.webp`;
            const rutaCompleta = path.join(UPLOADS_DIR, nombreWebp);
            await sharp(imagenPrincipalFile.buffer)
                .resize(855, 334, {
                    fit: 'cover',
                    withoutEnlargement: true
                })
                .webp({ quality: 80 })
                .toFile(rutaCompleta);
            imagenPrincipalPath = `/images/uploads/${nombreWebp}`;
        }

        if (files.imagen_secundaria && files.imagen_secundaria[0]) {
            const imagenSecundariaFile = files.imagen_secundaria[0];
            const timestamp = Date.now();
            const nombreWebp = `secundaria_${timestamp}.webp`;
            const rutaCompleta = path.join(UPLOADS_DIR, nombreWebp);
            await sharp(imagenSecundariaFile.buffer)
                .resize(855, 334, {
                    fit: 'cover',
                    withoutEnlargement: true
                })
                .webp({ quality: 80 })
                .toFile(rutaCompleta);
            imagenSecundariaPath = `/images/uploads/${nombreWebp}`;
        }

        // Crear promoción en la base de datos
        const promocionData = {
            institucion: ineflucion,
            tipo_promocion: tipo_premedio,
            disciplina,
            beneficios,
            comentarios_restricciones: comentarios_restrictiones,
            fecha_inicio,
            fecha_fin,
            imagen_principal: imagenPrincipalPath,
            imagen_secundaria: imagenSecundariaPath,
            estado,
            limite_uso: body.limite_uso || null
        };

        const promocionDataSanitizada = Object.fromEntries(
            Object.entries(promocionData).map(([k, v]) => [k, v === undefined ? null : v])
        );

        const result = await Promocion.create(promocionDataSanitizada);

        // ⭐⭐⭐ CORRECCIÓN: ENVIAR EMAIL CON .then().catch() (NO BLOQUEA LA RESPUESTA)
        console.log('📧 ===== INICIANDO ENVÍO DE EMAIL DE PROMOCIÓN =====');
        
        // Mostrar destinatarios desde .env
        const destinatariosEmail = process.env.EMAIL_TO_PROMOCIONES || 'NO CONFIGURADO';
        const destinatariosArray = destinatariosEmail.includes(',') 
            ? destinatariosEmail.split(',').map(email => email.trim())
            : [destinatariosEmail.trim()];
        
        console.log('📧 CORREOS DESTINATARIOS CONFIGURADOS EN .ENV:');
        console.log('   EMAIL_TO_PROMOCIONES:', destinatariosEmail);
        console.log('   Destinatarios (array):', JSON.stringify(destinatariosArray, null, 2));
        console.log('   Total destinatarios:', destinatariosArray.length);
        
        // Construir URL completa de la imagen si existe
        const imagenUrlCompleta = imagenPrincipalPath 
            ? `https://culturallaccess.com${imagenPrincipalPath}` 
            : (imagenSecundariaPath ? `https://culturallaccess.com${imagenSecundariaPath}` : null);

        sendPromocionEmail({
            id: result.id,
            institucion: promocionDataSanitizada.institucion,
            tipo_promocion: promocionDataSanitizada.tipo_promocion,
            disciplina: promocionDataSanitizada.disciplina || null,
            beneficios: promocionDataSanitizada.beneficios || 'N/A',
            comentarios_restricciones: promocionDataSanitizada.comentarios_restricciones || null,
            fecha_inicio: promocionDataSanitizada.fecha_inicio || null,
            fecha_fin: promocionDataSanitizada.fecha_fin || null,
            estado: promocionDataSanitizada.estado || 'activa',
            imagen_url: imagenUrlCompleta
        })
            .then(info => {
                console.log('✅ Correo de promoción enviado correctamente:', info.messageId);
                console.log('📧 Correos aceptados por el servidor:', info.accepted);
                console.log('📧 Correos rechazados por el servidor:', info.rejected);
            })
            .catch(emailError => {
                console.error('❌ Error enviando correo de promoción (no crítico):', emailError.message);
            });

        // ⭐⭐ CAMBIO 1: Agregar email_info en la respuesta
        res.json({
            success: true,
            message: 'Promoción creada exitosamente',
            id: result.id,
            imagen_principal: imagenPrincipalPath,
            imagen_secundaria: imagenSecundariaPath,
            email_info: {
                destinatarios: destinatariosArray,
                total_destinatarios: destinatariosArray.length,
                mensaje: `El correo se está enviando a ${destinatariosArray.length} destinatario(s)`
            }
        });

    } catch (error) {
        console.error('Error creando promoción:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor: ' + error.message
        });
    }
});

// POST crear promoción SIN imagen - VERSIÓN CORREGIDA CON EMAIL
router.post('/crear-sin-imagen', async (req, res) => {
    try {
        const body = req.body || {};
        
        const institucion = body.institucion || body.institucion?.toString();
        const tipo_promocion = body.tipo_promocion || body.tipoPromocion;
        const disciplina = body.disciplina;
        const beneficios = body.beneficios;
        const comentarios_restricciones = body.comentarios_restricciones || body.comentariosRestricciones;
        const fecha_inicio = body.fecha_inicio || body.fechaInicio;
        const fecha_fin = body.fecha_fin || body.fechaFin;
        const estado = body.estado || 'activa';

        // Validación
        if (!institucion || !tipo_promocion) {
            return res.status(400).json({
                success: false,
                error: 'Institución y tipo de promoción son obligatorios'
            });
        }

        // Crear promoción SIN imágenes
        const promocionData = {
            institucion,
            tipo_promocion,
            disciplina,
            beneficios,
            comentarios_restricciones,
            fecha_inicio,
            fecha_fin,
            imagen_principal: null,
            imagen_secundaria: null,
            estado
        };

        const promocionDataSanitizada = Object.fromEntries(
            Object.entries(promocionData).map(([k, v]) => [k, v === undefined ? null : v])
        );

        const result = await Promocion.create(promocionDataSanitizada);

        // ⭐⭐⭐ CORRECCIÓN: ENVIAR EMAIL CON .then().catch() (NO BLOQUEA LA RESPUESTA)
        console.log('📧 ===== INICIANDO ENVÍO DE EMAIL DE PROMOCIÓN =====');
        
        // Mostrar destinatarios desde .env
        const destinatariosEmail = process.env.EMAIL_TO_PROMOCIONES || 'NO CONFIGURADO';
        const destinatariosArray = destinatariosEmail.includes(',') 
            ? destinatariosEmail.split(',').map(email => email.trim())
            : [destinatariosEmail.trim()];
        
        console.log('📧 CORREOS DESTINATARIOS CONFIGURADOS EN .ENV:');
        console.log('   EMAIL_TO_PROMOCIONES:', destinatariosEmail);
        console.log('   Destinatarios (array):', JSON.stringify(destinatariosArray, null, 2));
        console.log('   Total destinatarios:', destinatariosArray.length);

        sendPromocionEmail({
            id: result.id,
            institucion: promocionDataSanitizada.institucion,
            tipo_promocion: promocionDataSanitizada.tipo_promocion,
            disciplina: promocionDataSanitizada.disciplina || null,
            beneficios: promocionDataSanitizada.beneficios || 'N/A',
            comentarios_restricciones: promocionDataSanitizada.comentarios_restricciones || null,
            fecha_inicio: promocionDataSanitizada.fecha_inicio || null,
            fecha_fin: promocionDataSanitizada.fecha_fin || null,
            estado: promocionDataSanitizada.estado || 'activa',
            imagen_url: null
        })
            .then(info => {
                console.log('✅ Correo de promoción enviado correctamente:', info.messageId);
                console.log('📧 Correos aceptados por el servidor:', info.accepted);
                console.log('📧 Correos rechazados por el servidor:', info.rejected);
            })
            .catch(emailError => {
                console.error('❌ Error enviando correo de promoción (no crítico):', emailError.message);
            });

        // ⭐⭐ CAMBIO 2: Agregar email_info en la respuesta
        res.json({
            success: true,
            message: 'Promoción creada exitosamente',
            id: result.id,
            email_info: {
                destinatarios: destinatariosArray,
                total_destinatarios: destinatariosArray.length,
                mensaje: `El correo se está enviando a ${destinatariosArray.length} destinatario(s)`
            }
        });

    } catch (error) {
        console.error('Error creando promoción:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor: ' + error.message
        });
    }
});

// GET todas las promociones
router.get('/', async (req, res) => {
    try {
        const { all } = req.query;
        if (all === '1' || all === 'true') {
            const [rows] = await require('../db').execute(
                'SELECT * FROM promociones ORDER BY fecha_creacion DESC'
            );
            return res.json({ success: true, data: rows, count: rows.length });
        }

        const result = await Promocion.getAllActive();
        return res.json(result);
    } catch (error) {
        console.error('Error en GET /api/promociones:', error);
        res.status(500).json({ success: false, error: 'Error al obtener promociones' });
    }
});

// GET promociones para carrusel
router.get('/carrusel', async (req, res) => {
    try {
        const result = await Promocion.getForCarousel();
        const carruseles = result.data.map(row => ({
            id: row.id,
            institucion: row.institucion,
            tipo_promocion: row.tipo_promocion,
            imagenes: [row.imagen_principal, row.imagen_secundaria].filter(Boolean),
            estado: row.estado,
            fecha_inicio: row.fecha_inicio,
            fecha_fin: row.fecha_fin 
        }));
        res.json({ 
            estado: 'exito', 
            carruseles: carruseles
        });
    } catch (error) {
        console.error('Error en promociones-carrusel:', error);
        res.json({ 
            estado: 'exito', 
            carruseles: [] 
        });
    }
});

// GET promoción por ID
router.get('/:id', async (req, res) => {
    try {
        const result = await Promocion.getById(req.params.id);
        if (!result.data) {
            return res.status(404).json({
                success: false,
                error: 'Promoción no encontrada'
            });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al obtener promoción'
        });
    }
});

// PUT actualizar promoción CON soporte para archivos
router.put('/:id', upload.fields([
    { name: 'imagen_principal', maxCount: 1 },
    { name: 'imagen_secundaria', maxCount: 1 }
]), async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};
        const files = req.files || {};

        console.log('🔄 PUT /promociones/:id - ID:', id);

        // Obtener promoción existente
        const existingPromo = await Promocion.getById(id);

        if (!existingPromo || !existingPromo.data) {
            return res.status(404).json({
                success: false,
                error: 'Promoción no encontrada'
            });
        }

        // Extraer datos del body (mantener valores existentes si no vienen)
        const updateData = {
            institucion: body.ineflucion || body.institucion || existingPromo.data.institucion,
            tipo_promocion: body.tipo_premedio || body.tipo_promocion || body.tipoPromocion || existingPromo.data.tipo_promocion,
            disciplina: body.disciplina !== undefined ? body.disciplina : existingPromo.data.disciplina,
            beneficios: body.beneficios !== undefined ? body.beneficios : existingPromo.data.beneficios,
            comentarios_restricciones: body.comentarios_restrictiones || body.comentarios_restricciones || body.comentariosRestricciones !== undefined 
                ? (body.comentarios_restrictiones || body.comentarios_restricciones || body.comentariosRestricciones) 
                : existingPromo.data.comentarios_restricciones,
            fecha_inicio: body.fecha_inicio || body.fechaInicio !== undefined 
                ? (body.fecha_inicio || body.fechaInicio) 
                : existingPromo.data.fecha_inicio,
            fecha_fin: body.fecha_fin || body.fechaFin !== undefined 
                ? (body.fecha_fin || body.fechaFin) 
                : existingPromo.data.fecha_fin,
          estado: body.estado !== undefined ? body.estado : existingPromo.data.estado,
          limite_uso: body.limite_uso !== undefined ? (body.limite_uso || null) : (existingPromo.data.limite_uso || null)
        };

        // ⭐⭐ MANEJAR ELIMINACIÓN DE IMÁGENES (string vacío o null)
        // Si se envía un string vacío o null explícitamente, eliminar la imagen
        if (body.imagen_principal !== undefined) {
            if (body.imagen_principal === '' || body.imagen_principal === null) {
                updateData.imagen_principal = null;
                console.log('🗑️ Eliminando imagen principal');
            } else {
                updateData.imagen_principal = body.imagen_principal;
            }
        } else {
            updateData.imagen_principal = existingPromo.data.imagen_principal || null;
        }

        if (body.imagen_secundaria !== undefined) {
            if (body.imagen_secundaria === '' || body.imagen_secundaria === null) {
                updateData.imagen_secundaria = null;
                console.log('🗑️ Eliminando imagen secundaria');
            } else {
                updateData.imagen_secundaria = body.imagen_secundaria;
            }
        } else {
            updateData.imagen_secundaria = existingPromo.data.imagen_secundaria || null;
        }

        // ⭐⭐ PROCESAR NUEVAS IMÁGENES SI SE ENVIARON (sobrescribe la eliminación si hay archivo nuevo)
        if (files.imagen_principal && files.imagen_principal[0]) {
            try {
                const imagenPrincipalFile = files.imagen_principal[0];
                const timestamp = Date.now();
                const nombreWebp = `principal_${timestamp}.webp`;
                const rutaCompleta = path.join(UPLOADS_DIR, nombreWebp);

                // Asegurar que el directorio existe
                await fs.mkdir(UPLOADS_DIR, { recursive: true });

                await sharp(imagenPrincipalFile.buffer)
                    .resize(855, 334, {
                        fit: 'cover',
                        withoutEnlargement: true
                    })
                    .webp({ quality: 80 })
                    .toFile(rutaCompleta);

                updateData.imagen_principal = `/images/uploads/${nombreWebp}`;
                console.log('✅ Imagen principal guardada:', updateData.imagen_principal);
            } catch (imgError) {
                console.error('❌ Error procesando imagen principal:', imgError.message);
                // Mantener la imagen existente si hay error
            }
        }

        if (files.imagen_secundaria && files.imagen_secundaria[0]) {
            try {
                const imagenSecundariaFile = files.imagen_secundaria[0];
                const timestamp = Date.now();
                const nombreWebp = `secundaria_${timestamp}.webp`;
                const rutaCompleta = path.join(UPLOADS_DIR, nombreWebp);

                // Asegurar que el directorio existe
                await fs.mkdir(UPLOADS_DIR, { recursive: true });

                await sharp(imagenSecundariaFile.buffer)
                    .resize(855, 334, {
                        fit: 'cover',
                        withoutEnlargement: true
                    })
                    .webp({ quality: 80 })
                    .toFile(rutaCompleta);

                updateData.imagen_secundaria = `/images/uploads/${nombreWebp}`;
                console.log('✅ Imagen secundaria guardada:', updateData.imagen_secundaria);
            } catch (imgError) {
                console.error('❌ Error procesando imagen secundaria:', imgError.message);
                // Mantener la imagen existente si hay error
            }
        }

        // Filtrar campos, pero incluir null explícitamente para eliminar imágenes
        const updateDataSanitizada = {};
        Object.keys(updateData).forEach(key => {
            // Incluir null para imágenes (permite eliminarlas)
            if (key === 'imagen_principal' || key === 'imagen_secundaria') {
                updateDataSanitizada[key] = updateData[key];
            } else if (updateData[key] !== undefined && updateData[key] !== null) {
                updateDataSanitizada[key] = updateData[key];
            }
        });

        // Actualizar en la base de datos
        const result = await Promocion.update(id, updateDataSanitizada);

		 sendPromocionEmail({
              id: parseInt(id),
              institucion: updateDataSanitizada.institucion,
              tipo_promocion: updateDataSanitizada.tipo_promocion,
              disciplina: updateDataSanitizada.disciplina || null,
              beneficios: updateDataSanitizada.beneficios || 'N/A',
              comentarios_restricciones: updateDataSanitizada.comentarios_restricciones || null,
              fecha_inicio: updateDataSanitizada.fecha_inicio || null,
              fecha_fin: updateDataSanitizada.fecha_fin || null,
              estado: updateDataSanitizada.estado || 'activa',
              imagen_url: updateData.imagen_principal ? `https://culturallaccess.com${updateData.imagen_principal}` :
 			 null
          }).then(info => {
              console.log('✅ Correo PUT enviado:', info.messageId);
          }).catch(err => {
              console.error('❌ Error correo PUT:', err.message);
          });

		
        // Respuesta exitosa
        res.json({
            success: true,
            estado: 'exito',
            message: 'Promoción actualizada exitosamente',
            affectedRows: result.affectedRows,
            promocion: {
                id: parseInt(id),
                imagen_principal: updateData.imagen_principal,
                imagen_secundaria: updateData.imagen_secundaria,
                ...updateDataSanitizada
            },
            data: {
                id: parseInt(id),
                ...updateDataSanitizada
            }
        });

    } catch (error) {
        console.error('❌ Error en PUT /promociones/:id:', error);
        console.error('❌ Mensaje:', error.message);
        console.error('❌ Stack:', error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Error al actualizar promoción: ' + error.message
        });
    }
});



// PUT actualizar promoción
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};

        const existingPromo = await Promocion.getById(id);
        if (!existingPromo.data) {
            return res.status(404).json({
                success: false,
                error: 'Promoción no encontrada'
            });
        }

        const ineflucion = body.ineflucion || body.institucion || body.institucion?.toString();
        const tipo_premedio = body.tipo_premedio || body.tipo_promocion || body.tipoPromocion;
        const disciplina = body.disciplina;
        const beneficios = body.beneficios;
        const comentarios_restrictiones = body.comentarios_restrictiones || body.comentarios_restricciones || body.comentariosRestricciones;
        const fecha_inicio = body.fecha_inicio || body.fechaInicio;
        const fecha_fin = body.fecha_fin || body.fechaFin;
        const estado = body.estado;

        const updateData = {
            institucion: ineflucion !== undefined ? ineflucion : existingPromo.data.institucion,
            tipo_promocion: tipo_premedio !== undefined ? tipo_premedio : existingPromo.data.tipo_promocion,
            disciplina: disciplina !== undefined ? disciplina : existingPromo.data.disciplina,
            beneficios: beneficios !== undefined ? beneficios : existingPromo.data.beneficios,
            comentarios_restricciones: comentarios_restrictiones !== undefined ? comentarios_restrictiones : existingPromo.data.comentarios_restricciones,
            fecha_inicio: fecha_inicio !== undefined ? fecha_inicio : existingPromo.data.fecha_inicio,
            fecha_fin: fecha_fin !== undefined ? fecha_fin : existingPromo.data.fecha_fin,
            estado: estado !== undefined ? estado : existingPromo.data.estado
        };

        const updateDataSanitizada = Object.fromEntries(
            Object.entries(updateData).filter(([_, v]) => v !== undefined)
        );

        const result = await Promocion.update(id, updateDataSanitizada);
        res.json({
            success: true,
            message: 'Promoción actualizada exitosamente',
            affectedRows: result.affectedRows,
            data: {
                ...updateDataSanitizada,
                id: parseInt(id)
            }
        });
    } catch (error) {
        console.error('Error actualizando promoción:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar promoción: ' + error.message
        });
    }
});

// PUT cambiar estado
router.put('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevoEstado } = req.body;
        if (!nuevoEstado) {
            return res.status(400).json({ success: false, error: 'nuevoEstado es requerido' });
        }
        if (!['activa', 'inactiva'].includes(nuevoEstado)) {
            return res.status(400).json({ success: false, error: 'Estado inválido. Usa "activa" o "inactiva".' });
        }
        const result = await Promocion.update(id, { estado: nuevoEstado });
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Promoción no encontrada' });
        }
        res.json({ success: true, id, estado: nuevoEstado });
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar estado' });
    }
});




// DELETE eliminar promoción
router.delete('/:id', async (req, res) => {
    try {
        const result = await Promocion.delete(req.params.id);
        res.json({
            success: true,
            message: 'Promoción eliminada exitosamente',
            affectedRows: result.affectedRows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al eliminar promoción'
        });
    }
});

module.exports = router;

