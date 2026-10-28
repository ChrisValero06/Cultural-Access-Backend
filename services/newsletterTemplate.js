// services/newsletterTemplate.js
// Convierte una campaña (encabezado + bloques) en el HTML del correo.
// Solo tablas y estilos inline: Gmail y Outlook ignoran CSS externo y flexbox.

const SITE_URL = 'https://culturallaccess.com';
const LOGO_URL = `${SITE_URL}/images/culturaaaaaaaaaalaccesssssslogo-04.png`;
const LOGO_FOOTER_URL = `${SITE_URL}/images/logo%20footer.png`;
const COLOR_DEFAULT = '#F97316'; // Naranja vivo del proyecto (evita el look “triste”)
const BEIGE = '#F8EDE3';
const BEIGE_FUERTE = '#F0DCC8';
const TEXTO_OSCURO = '#2C2420';
const TEXTO_SUAVE = '#6B5E54';
const FUENTE = "'Montserrat','Helvetica Neue',Helvetica,Arial,sans-serif";
const FUENTE_SERIF = "Georgia,'Times New Roman',Times,serif";

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
  return `<a href="${esc(href)}" target="_blank" style="background-color:${color};color:#ffffff;text-decoration:none;padding:12px 26px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;display:inline-block;border-radius:0;font-family:${FUENTE};">${esc(texto)}</a>`;
}

function botonEditorial(texto, href, color) {
  return `<a href="${esc(href || SITE_URL)}" target="_blank" style="background-color:${color};color:#ffffff;text-decoration:none;padding:13px 28px;font-size:13px;font-weight:700;display:inline-block;border-radius:0;font-family:${FUENTE};box-shadow:5px 5px 0 rgba(44,36,32,0.18);letter-spacing:0.3px;">${esc(texto || 'Leer más')}</a>`;
}

function hojaDecorativa(color) {
  return `<div style="font-size:22px;line-height:1;color:${color};text-align:center;">✦</div>`;
}

function cuadroAcento(color, alinear = 'left') {
  return `<div style="width:22px;height:22px;background-color:${color};font-size:0;line-height:0;${alinear === 'right' ? 'margin-left:auto;' : ''}">&nbsp;</div>`;
}

/** Imagen con alto fijo para que el collage se vea lleno (como el mockup) */
function imgCover(src, ancho, alto, alt = '') {
  if (!src) {
    return `<div style="width:100%;max-width:${ancho}px;height:${alto}px;background:linear-gradient(145deg,${BEIGE_FUERTE},${BEIGE});font-family:${FUENTE};font-size:12px;color:${COLOR_DEFAULT};text-align:center;line-height:${alto}px;font-weight:700;">Sube esta imagen</div>`;
  }
  return `<img src="${esc(urlImagen(src))}" width="${ancho}" height="${alto}" alt="${esc(alt)}" style="border:0;display:block;width:100%;max-width:${ancho}px;height:${alto}px;object-fit:cover;">`;
}

function fila(contenido, padding = '0 30px 26px 30px') {
  return `<tr><td class="nl-pad" style="padding:${padding};">${contenido}</td></tr>`;
}

function imgTag(src, ancho, alt = '', extraStyle = '') {
  if (!src) {
    return `<div style="width:100%;max-width:${ancho}px;min-height:120px;background-color:${BEIGE};font-family:${FUENTE};font-size:12px;color:#c2410c;text-align:center;padding:40px 8px;">Sin imagen</div>`;
  }
  return `<img src="${esc(urlImagen(src))}" width="${ancho}" alt="${esc(alt)}" style="border:0;display:block;width:100%;max-width:100%;height:auto;${extraStyle}">`;
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

/**
 * Diseño editorial vivo (mockup + naranja del proyecto):
 * más color, imágenes con alto fijo, paneles crema y collage.
 */
function renderEditorial(b, campana, color) {
  const acento = colorValido(color);
  const titulo = b.titulo || campana.titulo || 'Inspirational Blog';
  const subtitulo = b.subtitulo || '';
  const intro = b.intro_caja || campana.intro_texto || '';
  const cta1 = b.cta1_texto || 'Leer más';
  const cta1Link = conUtm(b.cta1_link || SITE_URL, campana);
  const etiquetaDia = (b.etiqueta_dia || 'SÁBADO').toUpperCase();
  const metaLabel = (b.meta_label || 'NEWSLETTER').toUpperCase();
  const fecha = b.fecha_display || '';
  const sec2Titulo = b.seccion2_titulo || 'New day';
  const sec2Texto = b.seccion2_texto || '';
  const cta2 = b.cta2_texto || 'Leer más';
  const cta2Link = conUtm(b.cta2_link || SITE_URL, campana);
  const galeriaTitulo = (b.galeria_titulo || 'SOMETHING SPECIAL TODAY').toUpperCase();
  const cierreTitulo = (b.cierre_titulo || 'LET YOURSELF BE HAPPY').toUpperCase();
  const cierreTexto = b.cierre_texto || '';
  const follow = (b.follow_texto || 'FOLLOW US').toUpperCase();

  const socialIcon = (href, label) => {
    if (!href) return '';
    return `<a href="${esc(href)}" target="_blank" style="display:inline-block;margin-left:14px;color:#ffffff;font-family:${FUENTE};font-size:13px;font-weight:700;text-decoration:none;letter-spacing:1px;">${esc(label)}</a>`;
  };

  const galeriaCelda = (src, alt, conAcentoIzq, conAcentoDer, fondo) => `
    <td class="nl-col" width="180" valign="top" style="width:180px;padding:5px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${conAcentoIzq ? `<tr><td style="padding:0 0 6px 0;">${cuadroAcento(acento, 'left')}</td></tr>` : '<tr><td style="height:28px;font-size:0;">&nbsp;</td></tr>'}
        <tr>
          <td style="background-color:${fondo};padding:10px;line-height:0;">
            ${imgCover(src, 160, 210, alt)}
          </td>
        </tr>
        ${conAcentoDer ? `<tr><td style="padding:6px 0 0 0;">${cuadroAcento(acento, 'right')}</td></tr>` : '<tr><td style="height:28px;font-size:0;">&nbsp;</td></tr>'}
      </table>
    </td>`;

  return `
  <!-- Franja superior de color (presencia) -->
  <tr><td style="background-color:${acento};height:8px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- ═══ Zona 1 ═══ -->
  <tr>
    <td style="padding:32px 24px 12px 24px;background-color:#ffffff;">
      <table width="552" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:552px;">
        <tr>
          <td class="nl-col" width="300" valign="top" style="width:300px;padding-right:10px;">
            <h1 style="font-family:${FUENTE_SERIF};font-weight:700;margin:0 0 6px 0;font-size:38px;line-height:1.05;color:${TEXTO_OSCURO};">${esc(titulo)}</h1>
            ${subtitulo ? `<p style="font-family:${FUENTE_SERIF};font-style:italic;margin:0 0 18px 0;font-size:15px;color:${acento};">${esc(subtitulo)}</p>` : `<div style="height:14px;"></div>`}
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BEIGE};border-left:4px solid ${acento};">
              <tr>
                <td style="padding:20px 18px;">
                  ${parrafos(intro, `font-family:${FUENTE};font-size:14px;line-height:1.65;color:${TEXTO_OSCURO};`)}
                  <div style="margin-top:18px;">${botonEditorial(cta1, cta1Link, acento)}</div>
                </td>
              </tr>
            </table>
          </td>
          <td class="nl-col-hide" width="22" valign="middle" style="width:22px;">${hojaDecorativa(acento)}</td>
          <td class="nl-col" width="230" valign="top" style="width:230px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${acento};">
              <tr>
                <td style="color:#ffffff;font-family:${FUENTE};font-size:12px;font-weight:700;letter-spacing:3px;text-align:center;padding:12px 8px;">
                  ${esc(etiquetaDia)}
                </td>
              </tr>
              <tr>
                <td style="padding:0 10px 10px 10px;line-height:0;background-color:${acento};">
                  ${imgCover(b.imagen_1, 210, 230, 'Imagen 1')}
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:14px 0 0 0;">
                  <p style="font-family:${FUENTE_SERIF};margin:0 0 8px 0;font-size:16px;letter-spacing:2px;color:${TEXTO_OSCURO};font-weight:700;">${esc(metaLabel)}</p>
                  ${fecha ? `<span style="background-color:${BEIGE_FUERTE};font-family:${FUENTE};font-size:13px;font-weight:600;color:${TEXTO_OSCURO};padding:8px 16px;display:inline-block;">${esc(fecha)}</span>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ═══ Zona 2 ═══ -->
  <tr>
    <td style="padding:28px 24px 12px 24px;background-color:${BEIGE};">
      <table width="552" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:552px;">
        <tr>
          <td class="nl-col" width="320" valign="middle" style="width:320px;padding-right:16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:#ffffff;padding:10px;line-height:0;">
                  ${imgCover(b.imagen_2, 300, 200, 'Imagen 2')}
                </td>
              </tr>
            </table>
          </td>
          <td class="nl-col" width="216" valign="middle" style="width:216px;">
            ${sec2Titulo ? `<h2 style="font-family:${FUENTE_SERIF};font-weight:700;margin:0 0 12px 0;font-size:30px;line-height:1.1;color:${TEXTO_OSCURO};">${esc(sec2Titulo)}</h2>` : ''}
            ${parrafos(sec2Texto, `font-family:${FUENTE};font-size:14px;line-height:1.65;color:${TEXTO_OSCURO};`)}
            <div style="margin-top:18px;">${botonEditorial(cta2, cta2Link, acento)}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ═══ Zona 3: galería ═══ -->
  <tr>
    <td style="padding:36px 24px 8px 24px;background-color:#ffffff;text-align:center;">
      <p style="font-family:${FUENTE_SERIF};margin:0 0 8px 0;font-size:15px;letter-spacing:4px;color:${acento};font-weight:700;">${esc(galeriaTitulo)}</p>
      <div style="width:48px;height:3px;background-color:${acento};margin:0 auto 22px auto;font-size:0;">&nbsp;</div>
      <table width="552" cellpadding="0" cellspacing="0" border="0" align="center" style="width:100%;max-width:552px;">
        <tr>
          ${galeriaCelda(b.imagen_3, 'Imagen 3', true, false, BEIGE)}
          ${galeriaCelda(b.imagen_4, 'Imagen 4', false, false, acento)}
          ${galeriaCelda(b.imagen_5, 'Imagen 5', false, true, BEIGE)}
        </tr>
      </table>
    </td>
  </tr>

  <!-- ═══ Zona 4: cierre ═══ -->
  <tr>
    <td style="padding:40px 40px 32px 40px;background-color:${BEIGE};text-align:center;">
      ${cierreTitulo ? `<h2 style="font-family:${FUENTE_SERIF};font-weight:700;margin:0 0 12px 0;font-size:22px;letter-spacing:3px;color:${TEXTO_OSCURO};">${esc(cierreTitulo)}</h2>` : ''}
      ${parrafos(cierreTexto, `font-family:${FUENTE};font-size:14px;line-height:1.7;color:${TEXTO_SUAVE};text-align:center;`)}
    </td>
  </tr>

  <!-- ═══ FOLLOW US ═══ -->
  <tr>
    <td style="background-color:${acento};padding:20px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="left" style="font-family:${FUENTE};font-size:13px;letter-spacing:3px;color:#ffffff;font-weight:800;">${esc(follow)}</td>
          <td align="right" style="white-space:nowrap;">
            ${socialIcon(b.social_facebook || 'https://www.facebook.com', 'Facebook')}
            ${socialIcon(b.social_x || 'https://x.com', 'X')}
            ${socialIcon(b.social_instagram || 'https://www.instagram.com', 'Instagram')}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderBloque(b, campana, color) {
  switch (b?.tipo) {
    case 'editorial': return renderEditorial(b, campana, color);
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
  const tieneEditorial = bloques.some((b) => b?.tipo === 'editorial');
  const portadas = bloques.filter((b) => b?.tipo === 'portada').map(renderPortada).join('');
  const contenido = bloques
    .filter((b) => b?.tipo !== 'portada')
    .map((b) => renderBloque(b, campana, color))
    .join('');

  const titulo = (!tieneEditorial && campana.titulo)
    ? fila(`<h1 class="nl-t1" style="font-family:${FUENTE};font-weight:900;margin:0;font-size:30px;line-height:1.15;color:#1f2937;text-align:center;">${esc(campana.titulo)}</h1>`, '0 30px 18px 30px')
    : '';
  const intro = (!tieneEditorial && campana.intro_texto)
    ? fila(parrafos(campana.intro_texto, `font-family:${FUENTE};font-size:16px;line-height:1.6;color:#374151;text-align:center;`))
    : '';
  const footerTexto = campana.footer_texto
    ? parrafos(campana.footer_texto, `font-family:${FUENTE};font-size:13px;line-height:1.6;color:#ffffff;text-align:center;`)
    : '';

  const linkBaja = opciones.preview ? '#' : '*|UNSUB|*';
  const direccion = opciones.preview ? '' : '*|HTML:LIST_ADDRESS_HTML|*';
  const bgBody = tieneEditorial ? '#F3EBE3' : '#f3f4f6';
  const footerInstitucional = tieneEditorial
    ? `<tr>
    <td align="center" style="background-color:#ffffff;padding:18px 28px 24px 28px;">
      <p style="font-family:${FUENTE};margin:0;font-size:11px;line-height:1.5;color:#9ca3af;">
        Recibes este correo porque te suscribiste al newsletter de CulturAll Access.<br>
        <a href="${linkBaja}" style="color:#9ca3af;text-decoration:underline;">Darme de baja</a>
      </p>
      <div style="font-family:${FUENTE};font-size:10px;color:#d1d5db;margin-top:6px;">${direccion}</div>
    </td>
  </tr>`
    : `<tr>
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
  </tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(campana.asunto || 'CulturAll Access')}</title>
  <style type="text/css">
    @media screen and (max-width: 480px) {
      .nl-outer { width: 100% !important; }
      .nl-pad { padding-left: 18px !important; padding-right: 18px !important; }
      .nl-t1 { font-size: 24px !important; }
      .nl-t2 { font-size: 19px !important; }
      .nl-promo-img { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
      .nl-promo-img img { width: 100% !important; }
      .nl-stack, .nl-col { display: block !important; width: 100% !important; max-width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; padding-bottom: 16px !important; }
      .nl-col-hide { display: none !important; width: 0 !important; height: 0 !important; overflow: hidden !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${bgBody};font-family:${FUENTE};-webkit-font-smoothing:antialiased;">
<center style="width:100%;background-color:${bgBody};padding:20px 0;">
<!--[if mso]><table width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table class="nl-outer" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;margin:0 auto;width:100%;max-width:600px;border-spacing:0;">

  ${tieneEditorial ? '' : `<tr><td style="background-color:${color};height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr>
    <td align="center" style="padding:26px 30px 22px 30px;">
      <a href="${SITE_URL}" target="_blank"><img src="${LOGO_URL}" width="260" alt="CulturAll Access" style="border:0;display:block;width:260px;max-width:100%;height:auto;"></a>
    </td>
  </tr>`}

  ${portadas}
  ${titulo}
  ${intro}
  ${contenido}

  ${footerInstitucional}

</table>
<!--[if mso]></td></tr></table><![endif]-->
</center>
</body>
</html>`;
}

module.exports = { renderNewsletter };
