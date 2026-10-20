// services/newsletterTemplate.js
// Convierte una campaña (encabezado + bloques) en el HTML del correo.
// Solo tablas y estilos inline: Gmail y Outlook ignoran CSS externo y flexbox.

const SITE_URL = 'https://culturallaccess.com';
const LOGO_URL = `${SITE_URL}/images/culturaaaaaaaaaalaccesssssslogo-04.png`;
const LOGO_FOOTER_URL = `${SITE_URL}/images/logo%20footer.png`;
const COLOR_DEFAULT = '#F97316';
const FUENTE = "'Montserrat','Helvetica Neue',Helvetica,Arial,sans-serif";

function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Texto plano → párrafos (doble salto) y <br> (salto simple)
function parrafos(texto, estilo) {
  return String(texto || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px 0;${estilo}">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function truncar(texto, max) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  return limpio.length > max ? `${limpio.slice(0, max).trimEnd()}...` : limpio;
}

function colorValido(color) {
  return /^#[0-9a-f]{6}$/i.test(color || '') ? color : COLOR_DEFAULT;
}

// Agrega UTMs solo a links del propio sitio
function conUtm(url, campana) {
  if (!url) return SITE_URL;
  if (!url.startsWith(SITE_URL)) return url;
  const slug = String(campana.nombre || 'newsletter')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const utms = `utm_source=newsletter&utm_medium=email&utm_campaign=${slug}`;
  return `${url}${url.includes('?') ? '&' : '?'}${utms}`;
}

function urlImagen(img) {
  if (!img) return '';
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('/')) return `${SITE_URL}${img}`;
  return `${SITE_URL}/images/uploads/${img}`;
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function boton(texto, href, color) {
  return `<a href="${esc(href)}" target="_blank" style="background-color:${color};color:#ffffff;text-decoration:none;padding:12px 26px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;display:inline-block;border-radius:6px;font-family:${FUENTE};">${esc(texto)}</a>`;
}

function fila(contenido, padding = '0 30px 26px 30px') {
  return `<tr><td class="nl-pad" style="padding:${padding};">${contenido}</td></tr>`;
}

// ── Bloques ──

function renderPortada(b) {
  if (!b.url) return '';
  const img = `<img src="${esc(urlImagen(b.url))}" width="600" alt="" style="border:0;display:block;width:100%;max-width:600px;height:auto;">`;
  const contenido = b.link ? `<a href="${esc(b.link)}" target="_blank" style="display:block;">${img}</a>` : img;
  return `<tr><td style="padding:0 0 26px 0;line-height:0;">${contenido}</td></tr>`;
}

function renderTexto(b) {
  if (!b.texto) return '';
  const align = ['izquierda', 'centro', 'derecha'].includes(b.alineacion) ? b.alineacion : 'izquierda';
  const textAlign = { izquierda: 'left', centro: 'center', derecha: 'right' }[align];
  const titulo = b.titulo
    ? `<h2 class="nl-t2" style="font-family:${FUENTE};font-weight:800;margin:0 0 12px 0;font-size:22px;line-height:1.2;color:#1f2937;text-align:${textAlign};">${esc(b.titulo)}</h2>`
    : '';
  return fila(`${titulo}${parrafos(b.texto, `font-family:${FUENTE};font-size:15px;line-height:1.6;color:#374151;text-align:${textAlign};`)}`);
}

function renderPromocion(p, color) {
  const img = urlImagen(p.imagen);
  const meta = [p.tipo_promocion, p.disciplina].filter(Boolean).map(esc).join(' · ');
  const vigencia = formatearFecha(p.fecha_fin);

  const imagenHtml = img
    ? `<td class="nl-promo-img" width="140" valign="top" style="width:140px;padding-right:16px;">
        <img src="${esc(img)}" width="140" alt="${esc(p.institucion)}" style="border:0;display:block;width:140px;height:auto;border-radius:8px;">
      </td>`
    : '';

  return `
  <tr>
    <td style="padding:0 0 18px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #f3f4f6;border-radius:10px;">
        <tr>
          <td style="padding:14px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${imagenHtml}
                <td class="nl-stack" valign="top" style="font-family:${FUENTE};">
                  <p style="margin:0 0 4px 0;font-size:17px;font-weight:800;line-height:1.25;color:#1f2937;">${esc(p.institucion)}</p>
                  ${meta ? `<p style="margin:0 0 8px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:${color};">${meta}</p>` : ''}
                  ${p.beneficios ? `<p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;color:#374151;">${esc(truncar(p.beneficios, 220))}</p>` : ''}
                  ${vigencia ? `<p style="margin:0;font-size:12px;color:#6b7280;">Vigente hasta el ${esc(vigencia)}</p>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderPromociones(b, campana, color) {
  const items = Array.isArray(b.items) ? b.items : [];
  if (items.length === 0) return '';
  const titulo = b.titulo
    ? `<h2 class="nl-t2" style="font-family:${FUENTE};font-weight:800;margin:0 0 16px 0;font-size:22px;line-height:1.2;color:#1f2937;">${esc(b.titulo)}</h2>`
    : '';
  const cta = b.cta_texto
    ? `<tr><td align="center" style="padding-top:6px;">${boton(b.cta_texto, conUtm(b.cta_link || SITE_URL, campana), color)}</td></tr>`
    : '';
  return fila(`
    ${titulo}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      ${items.map((p) => renderPromocion(p, color)).join('')}
      ${cta}
    </table>`);
}

function renderImagen(b) {
  if (!b.url) return '';
  const img = `<img src="${esc(urlImagen(b.url))}" width="540" alt="${esc(b.caption)}" style="border:0;display:block;width:100%;max-width:540px;height:auto;border-radius:8px;">`;
  const contenido = b.link ? `<a href="${esc(b.link)}" target="_blank" style="display:block;">${img}</a>` : img;
  const caption = b.caption
    ? `<p style="font-family:${FUENTE};margin:8px 0 0 0;font-size:12px;color:#6b7280;text-align:center;">${esc(b.caption)}</p>`
    : '';
  return fila(`${contenido}${caption}`);
}

function renderBoton(b, campana, color) {
  if (!b.texto || !b.url) return '';
  return fila(`<div style="text-align:center;">${boton(b.texto, conUtm(b.url, campana), color)}</div>`);
}

function renderSeparador() {
  return fila('<div style="border-top:1px solid #e5e7eb;font-size:0;line-height:0;">&nbsp;</div>');
}

function renderBloque(b, campana, color) {
  switch (b?.tipo) {
    case 'texto': return renderTexto(b);
    case 'promociones': return renderPromociones(b, campana, color);
    case 'imagen': return renderImagen(b);
    case 'boton': return renderBoton(b, campana, color);
    case 'separador': return renderSeparador();
    default: return '';
  }
}

// opciones.preview: reemplaza los merge tags de Mailchimp (*|UNSUB|*, etc.) para la vista previa
function renderNewsletter(campana, opciones = {}) {
  const color = colorValido(campana.color_primario);
  const bloques = Array.isArray(campana.bloques) ? campana.bloques : [];
  const portadas = bloques.filter((b) => b?.tipo === 'portada').map(renderPortada).join('');
  const contenido = bloques.filter((b) => b?.tipo !== 'portada').map((b) => renderBloque(b, campana, color)).join('');

  const titulo = campana.titulo
    ? fila(`<h1 class="nl-t1" style="font-family:${FUENTE};font-weight:900;margin:0;font-size:30px;line-height:1.15;color:#1f2937;text-align:center;">${esc(campana.titulo)}</h1>`, '0 30px 18px 30px')
    : '';
  const intro = campana.intro_texto
    ? fila(parrafos(campana.intro_texto, `font-family:${FUENTE};font-size:16px;line-height:1.6;color:#374151;text-align:center;`))
    : '';
  const footerTexto = campana.footer_texto
    ? parrafos(campana.footer_texto, `font-family:${FUENTE};font-size:13px;line-height:1.6;color:#ffffff;text-align:center;`)
    : '';

  const linkBaja = opciones.preview ? '#' : '*|UNSUB|*';
  const direccion = opciones.preview ? '' : '*|HTML:LIST_ADDRESS_HTML|*';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(campana.asunto || 'CulturAll Access')}</title>
  <style type="text/css">
    @media screen and (max-width: 600px) {
      .nl-outer { width: 100% !important; }
      .nl-pad { padding-left: 18px !important; padding-right: 18px !important; }
      .nl-t1 { font-size: 24px !important; }
      .nl-t2 { font-size: 19px !important; }
      .nl-promo-img { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
      .nl-promo-img img { width: 100% !important; }
      .nl-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:${FUENTE};-webkit-font-smoothing:antialiased;">
<center style="width:100%;background-color:#f3f4f6;padding:20px 0;">
<!--[if mso]><table width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table class="nl-outer" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;margin:0 auto;width:100%;max-width:600px;border-spacing:0;">

  <tr><td style="background-color:${color};height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <tr>
    <td align="center" style="padding:26px 30px 22px 30px;">
      <a href="${SITE_URL}" target="_blank"><img src="${LOGO_URL}" width="260" alt="CulturAll Access" style="border:0;display:block;width:260px;max-width:100%;height:auto;"></a>
    </td>
  </tr>

  ${portadas}
  ${titulo}
  ${intro}
  ${contenido}

  <tr>
    <td align="center" style="background-color:${color};padding:28px 30px;">
      <img src="${LOGO_FOOTER_URL}" width="200" alt="Gobierno de Nuevo León" style="border:0;display:block;width:200px;max-width:100%;height:auto;margin:0 auto 14px auto;">
      ${footerTexto}
      <p style="font-family:${FUENTE};margin:10px 0 0 0;font-size:13px;font-weight:700;">
        <a href="${SITE_URL}" target="_blank" style="color:#ffffff;text-decoration:none;">culturallaccess.com</a>
      </p>
      <p style="font-family:${FUENTE};margin:14px 0 0 0;font-size:11px;line-height:1.5;color:#ffffff;">
        Recibes este correo porque te suscribiste al newsletter de CulturAll Access.<br>
        <a href="${linkBaja}" style="color:#ffffff;text-decoration:underline;">Darme de baja</a>
      </p>
      <div style="font-family:${FUENTE};font-size:10px;color:#ffffff;margin-top:8px;">${direccion}</div>
    </td>
  </tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</center>
</body>
</html>`;
}

module.exports = { renderNewsletter };
