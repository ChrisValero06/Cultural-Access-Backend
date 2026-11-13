const fs = require('fs');
const path = require('path');

/** Prefijo público (Plesk httpdocs) para banners de promociones */
const BANNERS_PUBLIC_PREFIX = '/images/banners';

/**
 * Carpeta física donde se guardan los banners.
 * Prioridad: PROMOCIONES_UPLOADS_DIR en .env, luego httpdocs/images/banners (Plesk).
 * Siempre crea la carpeta si no existe.
 */
function resolveBannersDir() {
  // En local: .../backend ; en Plesk a menudo la app vive en .../backend/httpdocs
  const backendRoot = path.join(__dirname, '..');

  if (process.env.PROMOCIONES_UPLOADS_DIR) {
    const raw = process.env.PROMOCIONES_UPLOADS_DIR.trim();
    // Rutas relativas se resuelven desde la carpeta de la app (no desde cwd)
    const dir = path.isAbsolute(raw) ? raw : path.resolve(backendRoot, raw);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  // 1) App dentro de httpdocs (Plesk): ./images/banners
  // 2) App en /backend con estáticos en ./httpdocs/images/banners (local)
  const candidates = [
    path.join(backendRoot, 'images', 'banners'),
    path.join(backendRoot, 'httpdocs', 'images', 'banners'),
  ];
  const preferred =
    candidates.find((dir) => fs.existsSync(path.dirname(dir))) || candidates[0];
  fs.mkdirSync(preferred, { recursive: true });
  return preferred;
}

function publicUrlFor(filename) {
  return `${BANNERS_PUBLIC_PREFIX}/${filename}`;
}

module.exports = {
  BANNERS_PUBLIC_PREFIX,
  resolveBannersDir,
  publicUrlFor,
};
