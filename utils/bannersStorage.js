const fs = require('fs');
const path = require('path');

/** Prefijo público (Plesk) para banners de promociones */
const BANNERS_PUBLIC_PREFIX = '/images/banners';

/**
 * Carpeta física donde se guardan los banners.
 * En Plesk la app vive en backend/httpdocs → siempre preferir ./images/banners
 * (junto a ./images/uploads), que es lo que sirve Apache en /images/banners.
 */
function resolveBannersDir() {
  const appRoot = path.join(__dirname, '..');
  const pleskBanners = path.join(appRoot, 'images', 'banners');
  const pleskImages = path.join(appRoot, 'images');

  // Si existe la carpeta pública images/ (caso Plesk real), USARLA SIEMPRE.
  // Evita el bug de PROMOCIONES_UPLOADS_DIR=./httpdocs/images/banners
  // que crea .../httpdocs/httpdocs/images/banners (no visible en la web).
  if (fs.existsSync(pleskImages)) {
    fs.mkdirSync(pleskBanners, { recursive: true });
    return pleskBanners;
  }

  if (process.env.PROMOCIONES_UPLOADS_DIR) {
    const raw = process.env.PROMOCIONES_UPLOADS_DIR.trim();
    let dir = path.isAbsolute(raw) ? raw : path.resolve(appRoot, raw);
    // Sanear doble httpdocs
    dir = dir.replace(
      `${path.sep}httpdocs${path.sep}httpdocs${path.sep}`,
      `${path.sep}httpdocs${path.sep}`
    );
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  const localFallback = path.join(appRoot, 'httpdocs', 'images', 'banners');
  fs.mkdirSync(localFallback, { recursive: true });
  return localFallback;
}

function publicUrlFor(filename) {
  return `${BANNERS_PUBLIC_PREFIX}/${filename}`;
}

module.exports = {
  BANNERS_PUBLIC_PREFIX,
  resolveBannersDir,
  publicUrlFor,
};
