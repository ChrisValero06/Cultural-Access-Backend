// services/newsletterTemplate.js
// Convierte una campaña (encabezado + bloques) en el HTML del correo.
// Solo tablas y estilos inline: Gmail y Outlook ignoran CSS externo y flexbox.

const SITE_URL = 'https://culturallaccess.com';
const LOGO_URL = `${SITE_URL}/images/logo-culturall-access-white.png`;
const LOGO_FOOTER_URL = `${SITE_URL}/images/logo%20footer.png`;
const LOGO_CULTURA_NL = `${SITE_URL}/images/LogoIzquiero.png`;
const LOGO_NL_DERECHO = `${SITE_URL}/images/LogoDerecho.png`;
const COLOR_DEFAULT = '#F97316'; // Naranja CulturAll Access (sitio)
// Paleta editorial: siempre naranja de marca (no café del mockup viejo)
const MOCK_ACENTO = COLOR_DEFAULT; // botones + footer + acentos
const MOCK_TAUPE = COLOR_DEFAULT;  // barra día (mismo naranja)
const MOCK_CREMA = '#FFF7ED';      // cajas de texto (orange-50)
const MOCK_CREMA_2 = '#FFEDD5';    // capas detrás de fotos (orange-100)
const TEXTO_OSCURO = '#1C1917';
const TEXTO_SUAVE = '#78716C';
const CAFES_VIEJOS = new Set(['#8B6F5C', '#A89080', '#8D7361', '#8D7663']);

function colorMarca(color) {
  const c = colorValido(color);
  return CAFES_VIEJOS.has(c.toUpperCase()) ? COLOR_DEFAULT : c;
}
const FUENTE = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const FUENTE_SERIF = "Georgia,'Times New Roman',Times,serif";
// aliases usados por bloques clásicos
const BEIGE = MOCK_CREMA;
const BEIGE_FUERTE = MOCK_CREMA_2;

function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escapa HTML y reabre solo <strong>/<b> (negrita inline del editor) */
function escConFormato(texto) {
  return esc(texto)
    .replace(/&lt;strong&gt;/gi, '<strong>')
    .replace(/&lt;\/strong&gt;/gi, '</strong>')
    .replace(/&lt;b&gt;/gi, '<strong>')
    .replace(/&lt;\/b&gt;/gi, '</strong>');
}

// Texto (con <strong> opcional) → párrafos (doble salto) y <br> (salto simple)
function parrafos(texto, estilo) {
  return String(texto || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px 0;${estilo}">${escConFormato(p).replace(/\n/g, '<br>')}</p>`)
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

const FUENTE_MONTSERRAT = "'Montserrat','Helvetica Neue',Helvetica,Arial,sans-serif";
const FUENTE_POPPINS = "'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif";

/** family + peso base (solo Montserrat y Poppins en el editor) */
const MAPA_FUENTES = {
  'montserrat-thin': { family: FUENTE_MONTSERRAT, weight: 100 },
  'montserrat-extralight': { family: FUENTE_MONTSERRAT, weight: 200 },
  'montserrat-light': { family: FUENTE_MONTSERRAT, weight: 300 },
  montserrat: { family: FUENTE_MONTSERRAT, weight: 400 },
  'montserrat-medium': { family: FUENTE_MONTSERRAT, weight: 500 },
  'montserrat-semibold': { family: FUENTE_MONTSERRAT, weight: 600 },
  'montserrat-bold': { family: FUENTE_MONTSERRAT, weight: 700 },
  'montserrat-extrabold': { family: FUENTE_MONTSERRAT, weight: 800 },
  'montserrat-black': { family: FUENTE_MONTSERRAT, weight: 900 },
  'poppins-thin': { family: FUENTE_POPPINS, weight: 100 },
  'poppins-extralight': { family: FUENTE_POPPINS, weight: 200 },
  'poppins-light': { family: FUENTE_POPPINS, weight: 300 },
  poppins: { family: FUENTE_POPPINS, weight: 400 },
  'poppins-medium': { family: FUENTE_POPPINS, weight: 500 },
  'poppins-semibold': { family: FUENTE_POPPINS, weight: 600 },
  'poppins-bold': { family: FUENTE_POPPINS, weight: 700 },
  'poppins-extrabold': { family: FUENTE_POPPINS, weight: 800 },
  'poppins-black': { family: FUENTE_POPPINS, weight: 900 },
};

/** @font-face desde URLs estables /fonts (Montserrat + Poppins) */
function cssFontFaceNewsletter() {
  const pesos = [
    [100, 'Thin', 'ThinItalic'],
    [200, 'ExtraLight', 'ExtraLightItalic'],
    [300, 'Light', 'LightItalic'],
    [400, 'Regular', 'Italic'],
    [500, 'Medium', 'MediumItalic'],
    [600, 'SemiBold', 'SemiBoldItalic'],
    [700, 'Bold', 'BoldItalic'],
    [800, 'ExtraBold', 'ExtraBoldItalic'],
    [900, 'Black', 'BlackItalic'],
  ];
  const bloques = [];
  for (const [w, normal, italic] of pesos) {
    bloques.push(`@font-face{font-family:'Montserrat';src:url('${SITE_URL}/fonts/Montserrat-${normal}.otf') format('opentype');font-weight:${w};font-style:normal;font-display:swap;}`);
    bloques.push(`@font-face{font-family:'Montserrat';src:url('${SITE_URL}/fonts/Montserrat-${italic}.otf') format('opentype');font-weight:${w};font-style:italic;font-display:swap;}`);
    bloques.push(`@font-face{font-family:'Poppins';src:url('${SITE_URL}/fonts/Poppins-${normal}.otf') format('opentype');font-weight:${w};font-style:normal;font-display:swap;}`);
    bloques.push(`@font-face{font-family:'Poppins';src:url('${SITE_URL}/fonts/Poppins-${italic}.otf') format('opentype');font-weight:${w};font-style:italic;font-display:swap;}`);
  }
  return bloques.join('');
}

/** Estilos editables del bloque editorial (tipografía / tamaño / negrita / cursiva) */
function cssEstiloTexto(estilosBloque, clave, defaults = {}) {
  const e = { fuente: 'montserrat', tamano: 14, negrita: false, cursiva: false, color: '', ...defaults, ...(estilosBloque?.[clave] || {}) };
  const tamano = Math.min(48, Math.max(10, Number(e.tamano) || defaults.tamano || 14));
  const meta = MAPA_FUENTES[e.fuente] || MAPA_FUENTES.montserrat;
  const weight = e.negrita ? Math.max(meta.weight, 700) : meta.weight;
  const color = /^#[0-9a-f]{3,8}$/i.test(e.color || '') ? e.color : (defaults.color || TEXTO_OSCURO);
  return `font-family:${meta.family};font-size:${tamano}px;font-weight:${weight};font-style:${e.cursiva ? 'italic' : 'normal'};color:${color};`;
}

function boton(texto, href, color) {
  return `<a href="${esc(href)}" target="_blank" style="background-color:${color};color:#ffffff;text-decoration:none;padding:12px 26px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;display:inline-block;border-radius:0;font-family:${FUENTE};">${esc(texto)}</a>`;
}

/** Botón del mockup: rectángulo + sombra offset (email-safe) */
function botonEditorial(texto, href, color) {
  const sombra = '#5C4638';
  return `
  <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
    <tr>
      <td bgcolor="${sombra}" style="background-color:${sombra};padding:0;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td bgcolor="${color}" style="background-color:${color};padding:0 0 3px 0;">
              <a href="${esc(href || SITE_URL)}" target="_blank" style="background-color:${color};color:#ffffff;text-decoration:none;padding:12px 26px;font-size:12px;font-weight:600;display:inline-block;font-family:${FUENTE};letter-spacing:0.2px;border-radius:0;">${esc(texto || 'Leer más')}</a>
            </td>
            <td width="3" bgcolor="${sombra}" style="font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function hojaDecorativa(color) {
  // Tres hojas del mockup (carácter tipográfico, sin imagen externa)
  return `<div style="font-size:16px;line-height:1.2;color:${color};text-align:center;letter-spacing:-2px;">☘</div>`;
}

function cuadroAcento(color, alinear = 'left') {
  return `<div style="width:16px;height:16px;background-color:${color};font-size:0;line-height:0;${alinear === 'right' ? 'margin-left:auto;' : ''}">&nbsp;</div>`;
}

function imgCover(src, ancho, alto, alt = '') {
  if (!src) {
    return `<div style="width:100%;max-width:${ancho}px;height:${alto}px;background-color:${MOCK_CREMA_2};font-family:${FUENTE};font-size:11px;color:${TEXTO_SUAVE};text-align:center;line-height:${alto}px;">Imagen</div>`;
  }
  return `<img src="${esc(urlImagen(src))}" width="${ancho}" height="${alto}" alt="${esc(alt)}" style="border:0;display:block;width:100%;max-width:${ancho}px;height:${alto}px;object-fit:cover;">`;
}

/** Foto con rectángulo de color detrás, desplazado (collage del mockup) */
function fotoConCapa(src, ancho, alto, alt, colorCapa, offset = 10) {
  return `
  <table width="${ancho + offset}" cellpadding="0" cellspacing="0" border="0" style="width:${ancho + offset}px;max-width:100%;">
    <tr>
      <td bgcolor="${colorCapa}" style="background-color:${colorCapa};padding:${offset}px 0 0 ${offset}px;">
        ${imgCover(src, ancho, alto, alt)}
      </td>
    </tr>
  </table>`;
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
 * Réplica del mockup editorial con naranja CulturAll Access.
 * Botones / barra / cuadros de acento: siempre naranja de marca.
 */
function renderEditorial(b, campana) {
  const acento = colorMarca(campana.color_primario);
  const taupe = MOCK_TAUPE;
  const crema = MOCK_CREMA;
  const estilos = b.estilos || {};
  const st = (clave, defs) => cssEstiloTexto(estilos, clave, defs);
  const titulo = b.titulo || campana.titulo || 'Inspirational Blog';
  const subtitulo = b.subtitulo || 'Dreams, goals and desires';
  const intro = b.intro_caja || campana.intro_texto || '';
  const cta1 = b.cta1_texto || 'Leer más';
  const cta1Link = conUtm(b.cta1_link || SITE_URL, campana);
  const etiquetaDia = (b.etiqueta_dia || 'SATURDAY').toUpperCase();
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

  const socialIcon = (href, label) => `
    <a href="${esc(href)}" target="_blank" style="display:inline-block;margin:0 8px;color:#ffffff;font-family:${FUENTE};font-size:12px;text-decoration:none;letter-spacing:0.5px;">${esc(label)}</a>`;

  // Franja naranja: solo wordmark CulturAll Access en blanco, centrado
  const franjaGobierno = `
  <tr>
    <td bgcolor="${acento}" align="center" style="background-color:${acento};padding:18px 24px;text-align:center;">
      <a href="${SITE_URL}" target="_blank" style="text-decoration:none;">
        <img src="${LOGO_URL}" width="280" alt="CulturAll Access" style="border:0;display:inline-block;width:280px;max-width:100%;height:auto;">
      </a>
    </td>
  </tr>`;

  // Galería: capa detrás + foto + foto acento en esquina
  const galeriaCelda = (src, alt, capa, acentoIzq, acentoDer) => `
    <td class="nl-col" width="176" valign="top" style="width:176px;padding:8px 6px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:0 0 4px 0;">
            ${acentoIzq ? cuadroAcento(acento, 'left') : '<div style="height:16px;font-size:0;">&nbsp;</div>'}
          </td>
        </tr>
        <tr>
          <td bgcolor="${capa}" style="background-color:${capa};padding:12px 8px 8px 8px;line-height:0;">
            ${imgCover(src, 152, 220, alt)}
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0 0 0;">
            ${acentoDer ? cuadroAcento(acento, 'right') : '<div style="height:16px;font-size:0;">&nbsp;</div>'}
          </td>
        </tr>
      </table>
    </td>`;

  return `
  ${franjaGobierno}
  <!-- ═══ Zona 1: título + caja | SÁBADO + foto ═══ -->
  <tr>
    <td style="padding:40px 32px 10px 32px;background-color:#ffffff;">
      <table width="536" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:536px;">
        <tr>
          <td class="nl-col" width="290" valign="top" style="width:290px;">
            <h1 style="${st('titulo', { fuente: 'montserrat', tamano: 34, negrita: false, color: TEXTO_OSCURO })};margin:0 0 6px 0;line-height:1.15;">${escConFormato(titulo)}</h1>
            <p style="${st('subtitulo', { fuente: 'montserrat', tamano: 13, negrita: false, cursiva: true, color: TEXTO_SUAVE })};margin:0 0 22px 0;">${escConFormato(subtitulo)}</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${crema}" style="background-color:${crema};">
              <tr>
                <td style="padding:22px 20px;">
                  ${parrafos(intro, `${st('intro_caja', { fuente: 'montserrat', tamano: 13, color: TEXTO_OSCURO })};line-height:1.75;`)}
                  <div style="margin-top:18px;">${botonEditorial(cta1, cta1Link, acento)}</div>
                </td>
              </tr>
            </table>
          </td>
          <td class="nl-col-hide" width="28" valign="middle" align="center" style="width:28px;">
            ${hojaDecorativa(acento)}
          </td>
          <td class="nl-col" width="218" valign="top" style="width:218px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="${taupe}" style="background-color:${taupe};color:#ffffff;font-family:${FUENTE};font-size:11px;letter-spacing:3px;text-align:center;padding:11px 8px;">
                  ${esc(etiquetaDia)}
                </td>
              </tr>
              <tr>
                <td style="line-height:0;font-size:0;padding:0;">
                  ${imgCover(b.imagen_1, 218, 218, 'Imagen 1')}
                </td>
              </tr>
              <tr>
                <td style="padding:16px 0 0 0;">
                  <p style="font-family:${FUENTE_SERIF};margin:0 0 8px 0;font-size:14px;letter-spacing:2px;color:${TEXTO_OSCURO};">${esc(metaLabel)}</p>
                  ${fecha ? `<span style="background-color:${crema};font-family:${FUENTE};font-size:12px;color:${TEXTO_OSCURO};padding:7px 14px;display:inline-block;">${esc(fecha)}</span>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ═══ Zona 2: foto horizontal + New day ═══ -->
  <tr>
    <td style="padding:36px 32px 10px 32px;background-color:#ffffff;">
      <table width="536" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:536px;">
        <tr>
          <td class="nl-col" width="310" valign="middle" style="width:310px;padding-right:20px;">
            ${fotoConCapa(b.imagen_2, 290, 190, 'Imagen 2', MOCK_CREMA_2, 12)}
          </td>
          <td class="nl-col" width="206" valign="middle" style="width:206px;">
            <h2 style="${st('seccion2_titulo', { fuente: 'montserrat', tamano: 28, color: TEXTO_OSCURO })};margin:0 0 12px 0;line-height:1.15;">${escConFormato(sec2Titulo)}</h2>
            ${parrafos(sec2Texto, `${st('seccion2_texto', { fuente: 'montserrat', tamano: 13, color: TEXTO_OSCURO })};line-height:1.75;`)}
            <div style="margin-top:18px;">${botonEditorial(cta2, cta2Link, acento)}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ═══ Zona 3: galería ═══ -->
  <tr>
    <td style="padding:44px 24px 8px 24px;background-color:#ffffff;text-align:center;">
      <p style="${st('galeria_titulo', { fuente: 'montserrat', tamano: 13, color: TEXTO_OSCURO })};margin:0 0 28px 0;letter-spacing:4px;">${escConFormato(galeriaTitulo)}</p>
      <table width="536" cellpadding="0" cellspacing="0" border="0" align="center" style="width:100%;max-width:536px;">
        <tr>
          ${galeriaCelda(b.imagen_3, 'Imagen 3', MOCK_CREMA_2, true, false)}
          ${galeriaCelda(b.imagen_4, 'Imagen 4', taupe, false, false)}
          ${galeriaCelda(b.imagen_5, 'Imagen 5', MOCK_CREMA_2, false, true)}
        </tr>
      </table>
    </td>
  </tr>

  <!-- ═══ Zona 4: cierre ═══ -->
  <tr>
    <td style="padding:48px 56px 40px 56px;background-color:#ffffff;text-align:center;">
      <h2 style="${st('cierre_titulo', { fuente: 'montserrat', tamano: 18, color: TEXTO_OSCURO })};margin:0 0 14px 0;letter-spacing:3px;">${escConFormato(cierreTitulo)}</h2>
      ${parrafos(cierreTexto, `${st('cierre_texto', { fuente: 'montserrat', tamano: 12, color: TEXTO_SUAVE })};line-height:1.8;text-align:center;`)}
    </td>
  </tr>

  <!-- ═══ FOLLOW US + logos institucionales (misma franja naranja) ═══ -->
  <tr>
    <td bgcolor="${acento}" style="background-color:${acento};padding:18px 24px 22px 24px;text-align:center;">
      <p style="font-family:${FUENTE};margin:0 0 10px 0;font-size:12px;letter-spacing:3px;color:#ffffff;font-weight:600;">${esc(follow)}</p>
      <div>
        ${socialIcon(b.social_facebook || 'https://www.facebook.com', 'Facebook')}
        ${socialIcon(b.social_x || 'https://x.com', 'X')}
        ${socialIcon(b.social_instagram || 'https://www.instagram.com', 'Instagram')}
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:420px;margin:18px auto 0 auto;">
        <tr>
          <td align="left" valign="middle" width="70%" style="width:70%;padding:0 10px 0 0;">
            <img src="${LOGO_CULTURA_NL}" width="180" alt="Cultura Nuevo León" style="border:0;display:block;width:180px;max-width:100%;height:auto;">
          </td>
          <td align="right" valign="middle" width="30%" style="width:30%;padding:0 0 0 10px;">
            <img src="${LOGO_NL_DERECHO}" width="64" alt="Gobierno de Nuevo León" style="border:0;display:inline-block;width:64px;max-width:100%;height:auto;">
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderBloque(b, campana, color) {
  switch (b?.tipo) {
    case 'editorial': return renderEditorial(b, campana);
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
  const bloques = Array.isArray(campana.bloques) ? campana.bloques : [];
  const tieneEditorial = bloques.some((b) => b?.tipo === 'editorial');
  const color = tieneEditorial ? colorMarca(campana.color_primario) : colorValido(campana.color_primario);
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
  const bgBody = tieneEditorial ? '#FFF7ED' : '#f3f4f6';
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
    ${cssFontFaceNewsletter()}
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
