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
  // Hermano: .../images/banners → .../images/uploads
  const sibling = path.join(path.dirname(bannersDir), 'uploads');
  if (fs.existsSync(sibling)) return sibling;

  const fallbacks = [
    path.join(__dirname, '../images/uploads'),
    path.join(__dirname, '../httpdocs/images/uploads'),
  ];
  return fallbacks.find((d) => fs.existsSync(d)) || sibling;
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
  fs.mkdirSync(bannersDir, { recursive: true });

  console.log('📁 uploads:', uploadsDir);
  console.log('📁 banners:', bannersDir);

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

      const origen = path.join(uploadsDir, nombre);
      const destino = path.join(bannersDir, nombre);
      const nuevaRuta = publicUrlFor(nombre);

      if (fs.existsSync(origen)) {
        if (!fs.existsSync(destino)) {
          fs.copyFileSync(origen, destino);
          copiados += 1;
          console.log(`✅ Copiado id=${row.id} ${campo}: ${nombre}`);
        }
        updates[campo] = nuevaRuta;
      } else if (fs.existsSync(destino)) {
        // Ya estaba en banners pero BD seguía con /uploads/
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
