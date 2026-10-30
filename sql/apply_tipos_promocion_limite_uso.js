/**
 * Aplica columnas limite_uso / limitar_uso en tipos_promocion.
 * Uso: node sql/apply_tipos_promocion_limite_uso.js
 *
 * Lee backend/.env (DB_*). Si falla, prueba XAMPP local root / cultrual_access.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

async function apply(conn) {
  const [cols] = await conn.execute("SHOW COLUMNS FROM tipos_promocion LIKE 'limite_uso'");
  if (!cols.length) {
    await conn.execute(
      "ALTER TABLE tipos_promocion ADD COLUMN limite_uso VARCHAR(20) NULL DEFAULT NULL COMMENT 'una_vez | mensual | NULL=ilimitado' AFTER activo"
    );
    console.log('Added limite_uso');
  } else {
    console.log('limite_uso already exists');
  }

  const [cols2] = await conn.execute("SHOW COLUMNS FROM tipos_promocion LIKE 'limitar_uso'");
  if (!cols2.length) {
    await conn.execute(
      "ALTER TABLE tipos_promocion ADD COLUMN limitar_uso TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=hay limite, 0=ilimitado' AFTER limite_uso"
    );
    console.log('Added limitar_uso');
  } else {
    console.log('limitar_uso already exists');
  }

  const [final] = await conn.execute('SHOW COLUMNS FROM tipos_promocion');
  console.log(final.map((r) => `${r.Field}:${r.Type}`).join(', '));
}

async function tryConnect(cfg) {
  const conn = await mysql.createConnection(cfg);
  console.log(`Connected ${cfg.user}@${cfg.host}/${cfg.database}`);
  await apply(conn);
  await conn.end();
}

async function main() {
  const env = loadEnv(path.join(__dirname, '../.env'));
  const candidates = [
    {
      host: env.DB_HOST || '127.0.0.1',
      user: env.DB_USER,
      password: env.DB_PASS || '',
      database: env.DB_NAME,
      port: Number(env.DB_PORT || 3306),
    },
    { host: '127.0.0.1', user: 'root', password: '', database: 'cultrual_access', port: 3306 },
    { host: '127.0.0.1', user: 'root', password: '', database: 'cultural_Acces', port: 3306 },
  ].filter((c) => c.user && c.database);

  let lastErr;
  for (const cfg of candidates) {
    try {
      await tryConnect(cfg);
      return;
    } catch (e) {
      lastErr = e;
      console.warn(`Skip ${cfg.user}@${cfg.host}/${cfg.database}: ${e.message}`);
    }
  }
  throw lastErr || new Error('No DB connection succeeded');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
