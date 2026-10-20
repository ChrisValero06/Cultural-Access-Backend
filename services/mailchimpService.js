// services/mailchimpService.js
const fs = require('fs');
const path = require('path');

// Plesk a veces no inyecta las variables nuevas al proceso. Se leen directo del .env.
function cargarEnvNewsletter() {
  for (const clave of Object.keys(process.env)) {
    const limpia = clave.trim();
    if (limpia.startsWith('MAILCHIMP_') && limpia !== clave && process.env[clave] && !process.env[limpia]) {
      process.env[limpia] = String(process.env[clave]).trim();
    }
  }
  const candidatos = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ];
  for (const archivo of candidatos) {
    if (!fs.existsSync(archivo)) continue;
    const texto = fs.readFileSync(archivo, 'utf8').replace(/^\uFEFF/, '');
    for (const linea of texto.split(/\r?\n/)) {
      const coincidencia = linea.match(/^\s*(MAILCHIMP_[A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!coincidencia) continue;
      let valor = coincidencia[2].trim();
      if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
        valor = valor.slice(1, -1);
      }
      if (valor) process.env[coincidencia[1]] = valor;
    }
  }
}

cargarEnvNewsletter();
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
cargarEnvNewsletter();

const mailchimp = require('@mailchimp/mailchimp_marketing');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const sharp = require('sharp');

function aplicarConfiguracionMailchimp() {
  mailchimp.setConfig({
    apiKey: process.env.MAILCHIMP_API_KEY,
    server: process.env.MAILCHIMP_SERVER_PREFIX, // ej: us21 (lo que va después del guion en la API key)
  });
}

aplicarConfiguracionMailchimp();

const SITE_URL = 'https://culturallaccess.com';
const FROM_NAME = process.env.MAILCHIMP_FROM_NAME || 'CulturAll Access';
const REPLY_TO = process.env.MAILCHIMP_REPLY_TO || 'culturallaccess@nuevoleon.gob.mx';
const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID || null;

function verificarConfiguracion() {
  aplicarConfiguracionMailchimp();
  if (!process.env.MAILCHIMP_API_KEY || !process.env.MAILCHIMP_SERVER_PREFIX) {
    throw new Error('Mailchimp no está configurado: faltan MAILCHIMP_API_KEY o MAILCHIMP_SERVER_PREFIX en el .env');
  }
}

// Obligatorio: la cuenta es compartida con Residente y sin esto se enviaría a su audiencia
async function getAudienceId() {
  verificarConfiguracion();
  if (!AUDIENCE_ID) {
    throw new Error('Falta MAILCHIMP_AUDIENCE_ID en el .env (ID del audience de CulturAll Access)');
  }
  return AUDIENCE_ID;
}

async function obtenerConteoAudiencia() {
  try {
    const listId = await getAudienceId();
    const lista = await mailchimp.lists.getList(listId);
    return lista?.stats?.member_count ?? null;
  } catch (err) {
    console.error('[Newsletter] obtenerConteoAudiencia:', err.message);
    return null;
  }
}

async function crearCampana({ asunto, from_name, html }) {
  const listId = await getAudienceId();
  const campaign = await mailchimp.campaigns.create({
    type: 'regular',
    recipients: { list_id: listId },
    settings: {
      subject_line: asunto,
      from_name: from_name || FROM_NAME,
      reply_to: REPLY_TO,
    },
  });
  await mailchimp.campaigns.setContent(campaign.id, { html });
  return campaign.id;
}

async function actualizarCampana(mailchimpId, { asunto, from_name, html }) {
  verificarConfiguracion();
  await mailchimp.campaigns.update(mailchimpId, {
    settings: {
      subject_line: asunto,
      from_name: from_name || FROM_NAME,
      reply_to: REPLY_TO,
    },
  });
  await mailchimp.campaigns.setContent(mailchimpId, { html });
}

async function enviarCampana(mailchimpId) {
  verificarConfiguracion();
  await mailchimp.campaigns.send(mailchimpId);
}

// scheduleTime: ISO 8601 UTC. Mailchimp solo acepta minutos múltiplos de 15.
async function programarCampana(mailchimpId, scheduleTime) {
  verificarConfiguracion();
  await mailchimp.campaigns.schedule(mailchimpId, { schedule_time: scheduleTime });
}

async function desprogramarCampana(mailchimpId) {
  verificarConfiguracion();
  await mailchimp.campaigns.unschedule(mailchimpId);
}

async function enviarTest(mailchimpId, correo) {
  verificarConfiguracion();
  await mailchimp.campaigns.sendTestEmail(mailchimpId, {
    test_emails: [correo],
    send_type: 'html',
  });
}

// Alta o re-alta. Mailchimp no permite volver a 'subscribed' por API a quien se dio de baja
// desde el correo; en ese caso se usa 'pending' y Mailchimp le envía un correo de confirmación.
async function agregarSuscriptor(correo) {
  const listId = await getAudienceId();
  const hash = crypto.createHash('md5').update(correo.toLowerCase()).digest('hex');
  try {
    await mailchimp.lists.setListMember(listId, hash, {
      email_address: correo,
      status_if_new: 'subscribed',
      status: 'subscribed',
    });
  } catch (err) {
    if (err?.response?.body?.title !== 'Member In Compliance State') throw err;
    await mailchimp.lists.setListMember(listId, hash, {
      email_address: correo,
      status_if_new: 'pending',
      status: 'pending',
    });
  }
}

async function darDeBaja(correo) {
  const listId = await getAudienceId();
  const hash = crypto.createHash('md5').update(correo.toLowerCase()).digest('hex');
  await mailchimp.lists.updateListMember(listId, hash, { status: 'unsubscribed' });
}

// ─── Imágenes ───
// Las imágenes del sitio son .webp, que Outlook y varios clientes no muestran.
// Se convierten a PNG y se suben al File Manager de Mailchimp.

const _imgCache = new Map();

function urlAbsoluta(img) {
  if (!img) return img;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('/')) return `${SITE_URL}${img}`;
  return `${SITE_URL}/images/uploads/${img}`;
}

function descargarImagen(url) {
  return new Promise((resolve, reject) => {
    const protocolo = url.startsWith('https') ? https : http;
    protocolo.get(url, (res) => {
      if (res.statusCode === 404) { resolve(null); return; }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Sube un buffer de imagen al CDN de Mailchimp. Devuelve la URL pública.
async function subirBufferAMailchimp(buffer, nombreOriginal, anchoMax = 1200) {
  verificarConfiguracion();
  const esGif = (nombreOriginal || '').toLowerCase().endsWith('.gif');
  const base = (nombreOriginal || 'imagen').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_');

  let fileBuffer;
  let nombre;
  if (esGif) {
    // GIF sin procesar para conservar la animación
    fileBuffer = buffer;
    nombre = `${base}.${Date.now()}.gif`;
  } else {
    fileBuffer = await sharp(buffer)
      .resize(anchoMax, anchoMax, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    nombre = `${base}.${Date.now()}.png`;
  }

  const result = await mailchimp.fileManager.upload({
    name: nombre,
    file_data: fileBuffer.toString('base64'),
  });
  return result.full_size_url;
}

// Descarga una imagen del sitio y la sube a Mailchimp. Si falla, devuelve la URL original.
async function subirImagenAMailchimp(img, anchoMax) {
  if (!img) return img;
  const original = urlAbsoluta(img);
  if (original.includes('mcusercontent.com')) return original;
  if (_imgCache.has(original)) return _imgCache.get(original);

  try {
    const buffer = await descargarImagen(original);
    if (!buffer) return original;
    const nombre = decodeURIComponent(original.split('/').pop() || 'imagen');
    const url = await subirBufferAMailchimp(buffer, nombre, anchoMax);
    _imgCache.set(original, url);
    return url;
  } catch (err) {
    const detail = err?.response?.body || err.message;
    console.error(`[Newsletter] Error subiendo imagen a Mailchimp (${original}):`, JSON.stringify(detail));
    return original;
  }
}

// Devuelve una copia de la campaña con todas las imágenes de los bloques en el CDN de Mailchimp
async function reemplazarImagenesConMailchimp(campana) {
  const bloques = await Promise.all((campana.bloques || []).map(async (bloque) => {
    const b = { ...bloque };
    if ((b.tipo === 'portada' || b.tipo === 'imagen') && b.url) {
      b.url = await subirImagenAMailchimp(b.url);
    }
    if (b.tipo === 'promociones' && Array.isArray(b.items)) {
      b.items = await Promise.all(b.items.map(async (p) => ({
        ...p,
        imagen: p.imagen ? await subirImagenAMailchimp(p.imagen, 600) : p.imagen,
      })));
    }
    return b;
  }));
  return { ...campana, bloques };
}

module.exports = {
  crearCampana,
  actualizarCampana,
  enviarCampana,
  programarCampana,
  desprogramarCampana,
  enviarTest,
  agregarSuscriptor,
  darDeBaja,
  obtenerConteoAudiencia,
  subirBufferAMailchimp,
  reemplazarImagenesConMailchimp,
  urlAbsoluta,
};
