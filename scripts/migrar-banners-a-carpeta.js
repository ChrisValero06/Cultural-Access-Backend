/**
 * Migración de una sola vez:
 * - Copia archivos existentes de images/uploads → images/banners
 * - Actualiza en BD /images/uploads/... → /images/banners/...
 *
 * Uso en el servidor (desde la carpeta de la app Node):
 *   node scripts/migrar-banners-a-carpeta.js
 *
 * Lo que no exista en disco se reporta: hay que volver a subir esas imágenes con Editar.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Cargar .env desde ubicaciones habituales (local y Plesk)
const envCandidates = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  path.join(process.cwd(), '.env'),
];
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('📄 .env:', envPath);
    break;
  }
}

const { resolveBannersDir, publicUrlFor } = require('../utils/bannersStorage');

function resolveUploadsDir(bannersDir) {
  const appRoot = path.join(__dirname, '..');
  // Priorizar la carpeta real de Plesk: <app>/images/uploads
  const candidates = [
    path.join(appRoot, 'images', 'uploads'),
    path.join(path.dirname(bannersDir), 'uploads'), // hermano de banners
    path.join(appRoot, 'httpdocs', 'images', 'uploads'),
  ];
  return candidates.find((d) => fs.existsSync(d)) || candidates[0];
}

function resolveImagesRoot(uploadsDir) {
  return path.dirname(uploadsDir); // .../images
}

function basenameFromDbPath(dbPath) {
  if (!dbPath || typeof dbPath !== 'string') return null;
  const cleaned = dbPath.trim().replace(/\\/g, '/');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || null;
}

async function main() {
  const bannersDir = resolveBannersDir();
  const uploadsDir = resolveUploadsDir(bannersDir);
  const imagesRoot = resolveImagesRoot(uploadsDir);
  fs.mkdirSync(bannersDir, { recursive: true });

  console.log('📁 uploads:', uploadsDir, fs.existsSync(uploadsDir) ? '(ok)' : '(NO EXISTE)');
  console.log('📁 banners:', bannersDir);
  console.log('📁 images :', imagesRoot);
  if (bannersDir.includes(`${path.sep}httpdocs${path.sep}httpdocs${path.sep}`)) {
    console.error('❌ Ruta banners duplicó httpdocs. En .env usa: PROMOCIONES_UPLOADS_DIR=./images/banners');
    process.exit(1);
  }

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  const [rows] = await pool.query(
    `SELECT id, imagen_principal, imagen_secundaria
     FROM promociones
     WHERE imagen_principal IS NOT NULL OR imagen_secundaria IS NOT NULL`
  );

  let copiados = 0;
  let actualizados = 0;
  let faltantes = 0;

  for (const row of rows) {
    const updates = {};

    for (const campo of ['imagen_principal', 'imagen_secundaria']) {
      const valor = row[campo];
      if (!valor) continue;

      // Ya está en banners
      if (String(valor).includes('/images/banners/')) continue;

      const nombre = basenameFromDbPath(valor);
      if (!nombre) continue;

      // Buscar en uploads, en images/ raíz, o ya en banners
      const candidatosOrigen = [
        path.join(uploadsDir, nombre),
        path.join(imagesRoot, nombre),
        path.join(bannersDir, nombre),
      ];
      const origen = candidatosOrigen.find((p) => fs.existsSync(p));
      const destino = path.join(bannersDir, nombre);
      const nuevaRuta = publicUrlFor(nombre);

      if (origen) {
        if (origen !== destino && !fs.existsSync(destino)) {
          fs.copyFileSync(origen, destino);
          copiados += 1;
          console.log(`✅ Copiado id=${row.id} ${campo}: ${nombre}`);
        } else if (origen === destino || fs.existsSync(destino)) {
          console.log(`↪️  Ya en banners id=${row.id} ${campo}: ${nombre}`);
        }
        updates[campo] = nuevaRuta;
      } else {
        faltantes += 1;
        console.log(`⚠️  Falta archivo id=${row.id} ${campo}: ${valor}`);
      }
    }

    if (Object.keys(updates).length > 0) {
      const sets = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
      const values = [...Object.values(updates), row.id];
      await pool.execute(`UPDATE promociones SET ${sets} WHERE id = ?`, values);
      actualizados += 1;
      console.log(`🗄️  BD actualizada id=${row.id}`, updates);
    }
  }

  await pool.end();
  console.log('\n—— Resumen ——');
  console.log(`Archivos copiados: ${copiados}`);
  console.log(`Filas BD actualizadas: ${actualizados}`);
  console.log(`Sin archivo en disco (re-subir con Editar): ${faltantes}`);
}

main().catch((err) => {
  console.error('❌ Error en migración:', err.message);
  process.exit(1);
});
