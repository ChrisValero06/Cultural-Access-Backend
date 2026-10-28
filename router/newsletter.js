// routes/newsletter.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const multer = require('multer');
const router = express.Router();
const CampanaNewsletter = require('../models/CampanaNewsletter');
const SuscripcionNewsletter = require('../models/SuscripcionNewsletter');
const { renderNewsletter } = require('../services/newsletterTemplate');
const mailchimp = require('../services/mailchimpService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Mismo esquema de token que devuelve /api/auth/login ("<usuario>-token"); solo Pepe y Francisco administran
const TOKENS_ADMIN = ['pepe-token', 'francisco-token'];

function soloAdmin(req, res, next) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!TOKENS_ADMIN.includes(token)) {
        return res.status(401).json({ success: false, error: 'No autorizado' });
    }
    next();
}

function mensajeError(error) {
    return error?.response?.body?.detail || error?.message || 'Error desconocido';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// HTML final para Mailchimp: imágenes en su CDN y merge tags de baja
async function htmlParaMailchimp(campana) {
    const conCdn = await mailchimp.reemplazarImagenesConMailchimp(campana);
    return renderNewsletter(conCdn);
}

// Reutiliza la campaña de Mailchimp si existe; si ya no se puede editar (enviada o borrada), crea otra
async function obtenerOCrearMailchimpId(campana, html) {
    const opts = { asunto: campana.asunto, from_name: campana.from_name, html };

    if (!campana.mailchimp_id) {
        const id = await mailchimp.crearCampana(opts);
        await CampanaNewsletter.setMailchimpId(campana.id, id);
        return id;
    }

    try {
        await mailchimp.actualizarCampana(campana.mailchimp_id, opts);
        return campana.mailchimp_id;
    } catch (err) {
        const detail = err?.response?.body?.detail || err?.message || '';
        const status = err?.response?.body?.status;
        if (status === 404 || detail.includes('Can only set content')) {
            const id = await mailchimp.crearCampana(opts);
            await CampanaNewsletter.setMailchimpId(campana.id, id);
            return id;
        }
        throw err;
    }
}

// Una campaña programada no acepta cambios en Mailchimp y se enviaría con el contenido viejo
async function cancelarProgramacion(campana) {
    if (campana.estado !== 'programada') return;
    if (campana.mailchimp_id) await mailchimp.desprogramarCampana(campana.mailchimp_id);
    await CampanaNewsletter.marcarBorrador(campana.id);
}

// ═══════════════ Suscriptores ═══════════════

// POST /suscriptores — público (formulario del sitio)
router.post('/suscriptores', async (req, res) => {
    try {
        const correo = String(req.body?.correo_electronico || '').toLowerCase().trim();
        if (!EMAIL_REGEX.test(correo)) {
            return res.status(400).json({ success: false, error: 'Ingresa un correo válido' });
        }

        const { suscripcion, creada } = await SuscripcionNewsletter.findOrCreate(correo);

        // Aunque ya exista en la BD se sincroniza: pudo haberse dado de baja desde el link del correo
        try {
            await mailchimp.agregarSuscriptor(correo);
        } catch (mcErr) {
            console.warn('[Newsletter] No se pudo sincronizar con Mailchimp:', mensajeError(mcErr));
        }

        res.status(creada ? 201 : 200).json({ success: true, suscripcion });
    } catch (error) {
        console.error('Error en POST /newsletter/suscriptores:', error);
        res.status(500).json({ success: false, error: 'Error al registrar la suscripción' });
    }
});

router.get('/suscriptores', soloAdmin, async (req, res) => {
    try {
        const suscriptores = await SuscripcionNewsletter.getAll();
        res.json({ total: suscriptores.length, suscriptores });
    } catch (error) {
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

router.delete('/suscriptores/:id', soloAdmin, async (req, res) => {
    try {
        const suscripcion = await SuscripcionNewsletter.getById(req.params.id);
        if (!suscripcion) return res.status(404).json({ success: false, error: 'Suscriptor no encontrado' });

        try {
            await mailchimp.darDeBaja(suscripcion.correo_electronico);
        } catch (mcErr) {
            console.warn('[Newsletter] No se pudo dar de baja en Mailchimp:', mensajeError(mcErr));
        }

        await SuscripcionNewsletter.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

// Total de contactos en el audience de Mailchimp (incluye los importados fuera del sitio)
router.get('/audiencia', soloAdmin, async (req, res) => {
    const total = await mailchimp.obtenerConteoAudiencia();
    res.json({ total });
});

// ═══════════════ Imágenes ═══════════════

// La app puede vivir en /backend o en /backend/httpdocs. Se usa la carpeta que ya existe.
function directorioUploads() {
    const opciones = [
        path.join(__dirname, '../images/uploads'),
        path.join(__dirname, '../httpdocs/images/uploads'),
    ];
    return opciones.find((dir) => fs.existsSync(dir)) || opciones[0];
}

// POST /imagenes — guarda la imagen en el sitio. Mailchimp la toma al enviar la campaña.
router.post('/imagenes', soloAdmin, (req, res, next) => {
    upload.single('imagen')(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: 'La imagen es pesada. Máximo 10 MB (mejor menos de 2 MB).',
            });
        }
        if (err) {
            return res.status(400).json({ success: false, error: err.message || 'Error al recibir la imagen' });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No se recibió ninguna imagen' });
        const dir = directorioUploads();
        await fs.promises.mkdir(dir, { recursive: true });

        const esGif = (req.file.originalname || '').toLowerCase().endsWith('.gif');
        const base = (req.file.originalname || 'imagen').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_');
        const nombre = esGif ? `${base}.${Date.now()}.gif` : `${base}.${Date.now()}.png`;
        const buffer = esGif
            ? req.file.buffer
            : await sharp(req.file.buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();

        await fs.promises.writeFile(path.join(dir, nombre), buffer);
        // URL absoluta para que preview y correos muestren la imagen siempre
        res.json({ success: true, url: `https://culturallaccess.com/images/uploads/${nombre}` });
    } catch (error) {
        console.error('Error subiendo imagen del newsletter:', mensajeError(error));
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

// ═══════════════ Campañas ═══════════════

// POST /preview — renderiza sin guardar (vista previa en vivo del editor)
router.post('/preview', soloAdmin, (req, res) => {
    try {
        res.type('html').send(renderNewsletter(req.body || {}, { preview: true }));
    } catch (error) {
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

router.get('/campanas', soloAdmin, async (req, res) => {
    try {
        res.json(await CampanaNewsletter.getAll());
    } catch (error) {
        console.error('Error listando campañas:', error);
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

router.get('/campanas/:id', soloAdmin, async (req, res) => {
    try {
        const campana = await CampanaNewsletter.getById(req.params.id);
        if (!campana) return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
        res.json(campana);
    } catch (error) {
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

router.get('/campanas/:id/preview', soloAdmin, async (req, res) => {
    try {
        const campana = await CampanaNewsletter.getById(req.params.id);
        if (!campana) return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
        res.type('html').send(renderNewsletter(campana, { preview: true }));
    } catch (error) {
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

router.post('/campanas', soloAdmin, async (req, res) => {
    try {
        const { nombre, asunto } = req.body || {};
        if (!nombre?.trim() || !asunto?.trim()) {
            return res.status(400).json({ success: false, error: 'Nombre y asunto son obligatorios' });
        }
        const campana = await CampanaNewsletter.create(req.body);
        res.status(201).json(campana);
    } catch (error) {
        console.error('Error creando campaña:', error);
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

router.put('/campanas/:id', soloAdmin, async (req, res) => {
    try {
        const campana = await CampanaNewsletter.getById(req.params.id);
        if (!campana) return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
        if (campana.estado === 'enviada') {
            return res.status(400).json({ success: false, error: 'No se puede editar una campaña enviada' });
        }
        await cancelarProgramacion(campana);
        res.json(await CampanaNewsletter.update(req.params.id, req.body || {}));
    } catch (error) {
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

router.delete('/campanas/:id', soloAdmin, async (req, res) => {
    try {
        const campana = await CampanaNewsletter.getById(req.params.id);
        if (!campana) return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
        if (campana.estado === 'enviada') {
            return res.status(400).json({ success: false, error: 'No se puede eliminar una campaña enviada' });
        }
        await cancelarProgramacion(campana);
        await CampanaNewsletter.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

// POST /campanas/:id/test — envía una prueba a un correo
router.post('/campanas/:id/test', soloAdmin, async (req, res) => {
    try {
        const correo = String(req.body?.correo || '').trim();
        if (!EMAIL_REGEX.test(correo)) return res.status(400).json({ success: false, error: 'Correo de prueba inválido' });

        const campana = await CampanaNewsletter.getById(req.params.id);
        if (!campana) return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
        if (campana.estado !== 'borrador') {
            return res.status(400).json({ success: false, error: 'Solo se pueden enviar pruebas de campañas en borrador' });
        }

        const html = await htmlParaMailchimp(campana);
        const mailchimpId = await obtenerOCrearMailchimpId(campana, html);
        await mailchimp.enviarTest(mailchimpId, correo);

        console.log(`[Newsletter] Prueba de campaña #${campana.id} enviada a ${correo}`);
        res.json({ success: true, mailchimp_id: mailchimpId });
    } catch (error) {
        console.error('Error enviando prueba:', error?.response?.body || error.message);
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

// POST /campanas/:id/enviar — envía a todo el audience
router.post('/campanas/:id/enviar', soloAdmin, async (req, res) => {
    try {
        const campana = await CampanaNewsletter.getById(req.params.id);
        if (!campana) return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
        if (campana.estado === 'enviada') {
            return res.status(400).json({ success: false, error: 'Esta campaña ya fue enviada' });
        }
        await cancelarProgramacion(campana);

        const html = await htmlParaMailchimp(campana);
        const mailchimpId = await obtenerOCrearMailchimpId(campana, html);
        await mailchimp.enviarCampana(mailchimpId);
        await CampanaNewsletter.marcarEnviada(campana.id, mailchimpId);

        console.log(`[Newsletter] Campaña #${campana.id} enviada al audience`);
        res.json({ success: true, mailchimp_id: mailchimpId });
    } catch (error) {
        console.error('Error enviando campaña:', error?.response?.body || error.message);
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

// POST /campanas/:id/programar — body: { fecha: ISO 8601 UTC, minutos en múltiplo de 15 }
router.post('/campanas/:id/programar', soloAdmin, async (req, res) => {
    try {
        const fecha = new Date(req.body?.fecha);
        if (isNaN(fecha)) return res.status(400).json({ success: false, error: 'Fecha de programación inválida' });
        if (fecha <= new Date()) return res.status(400).json({ success: false, error: 'La fecha debe ser futura' });
        if (fecha.getUTCMinutes() % 15 !== 0) {
            return res.status(400).json({ success: false, error: 'Mailchimp solo permite programar en intervalos de 15 minutos' });
        }

        const campana = await CampanaNewsletter.getById(req.params.id);
        if (!campana) return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
        if (campana.estado === 'enviada') {
            return res.status(400).json({ success: false, error: 'Esta campaña ya fue enviada' });
        }
        await cancelarProgramacion(campana);

        const html = await htmlParaMailchimp(campana);
        const mailchimpId = await obtenerOCrearMailchimpId(campana, html);
        await mailchimp.programarCampana(mailchimpId, fecha.toISOString());
        await CampanaNewsletter.marcarProgramada(campana.id, mailchimpId, fecha);

        console.log(`[Newsletter] Campaña #${campana.id} programada para ${fecha.toISOString()}`);
        res.json({ success: true, mailchimp_id: mailchimpId, programada_para: fecha.toISOString() });
    } catch (error) {
        console.error('Error programando campaña:', error?.response?.body || error.message);
        res.status(500).json({ success: false, error: mensajeError(error) });
    }
});

module.exports = router;
