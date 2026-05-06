const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar modelos y base de datos
const models = require('./models');
const db = require('./db');
const configureRoutes = require('./router');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://culturallaccess.com','https://www.culturallaccess.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Accept', 'Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// ─── Middleware: bloquear tarjetas dadas de baja en redenciones ───
app.use(['/api/controlacceso', '/api/control-acceso'], async (req, res, next) => {
  if (req.method !== 'POST') return next();
  try {
    const numero_tarjeta = req.body?.numero_tarjeta;
    if (!numero_tarjeta) return next();
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT id FROM tarjetas_baja WHERE numero_tarjeta = ?',
        [numero_tarjeta]
      );
      if (rows.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Esta tarjeta ha sido dada de baja y no puede ser utilizada.'
        });
      }
    } finally {
      connection.release();
    }
  } catch (_) {}
  next();
});

// ─── Rutas: tarjetas dadas de baja ───
app.get('/api/tarjetas-baja', async (req, res) => {
  try {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM tarjetas_baja ORDER BY fecha_baja DESC');
      res.json(rows);
    } finally { connection.release(); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tarjetas-baja/:numero', async (req, res) => {
  try {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT * FROM tarjetas_baja WHERE numero_tarjeta = ?',
        [req.params.numero]
      );
      res.json(rows.length > 0 ? { baja: true, ...rows[0] } : { baja: false });
    } finally { connection.release(); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tarjetas-baja', async (req, res) => {
  const { numero_tarjeta, motivo } = req.body;
  if (!numero_tarjeta) return res.status(400).json({ error: 'numero_tarjeta es requerido' });
  try {
    const connection = await db.getConnection();
    try {
      await connection.query(
        'INSERT INTO tarjetas_baja (numero_tarjeta, motivo) VALUES (?, ?) ON DUPLICATE KEY UPDATE motivo = VALUES(motivo), fecha_baja = CURRENT_TIMESTAMP',
        [numero_tarjeta, motivo || 'Baja por administrador']
      );
      res.json({ success: true, message: 'Tarjeta dada de baja correctamente' });
    } finally { connection.release(); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/tarjetas-baja/:numero', async (req, res) => {
  try {
    const connection = await db.getConnection();
    try {
      await connection.query('DELETE FROM tarjetas_baja WHERE numero_tarjeta = ?', [req.params.numero]);
      res.json({ success: true, message: 'Tarjeta reactivada correctamente' });
    } finally { connection.release(); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Configurar rutas principales
configureRoutes(app);

// Importar controladores
const ControlAcceso = require('./models/ControlAcceso');
const Usuario = require('./models/Usuario');


// ========== INICIO: Rutas de configuración (textos promociones) ==========
const CLAVE_TEXTOS = 'textos_promociones';
const DEFAULTS_TEXTOS = { titulo: 'PROMOCIONES VIGENTES - FEBRERO', subtitulo: 'Presentando tarjeta y sujetas a disponibilidad' };

app.get('/api/config/textos-promociones', async (req, res) => {
  try {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.query('SELECT valor FROM config WHERE clave = ? LIMIT 1', [CLAVE_TEXTOS]);
      if (!rows || rows.length === 0) {
        return res.json(DEFAULTS_TEXTOS);
      }
      const valor = rows[0].valor;
      let data = DEFAULTS_TEXTOS;
      if (typeof valor === 'string') {
        try {
          data = JSON.parse(valor);
        } catch (e) {}
      } else if (valor && typeof valor === 'object') {
        data = valor;
      }
      res.json({
        titulo: typeof data.titulo === 'string' ? data.titulo : DEFAULTS_TEXTOS.titulo,
        subtitulo: typeof data.subtitulo === 'string' ? data.subtitulo : DEFAULTS_TEXTOS.subtitulo
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('GET textos-promociones:', error);
    res.status(500).json({ error: 'Error al obtener la configuración' });
  }
});

app.put('/api/config/textos-promociones', async (req, res) => {
  try {
    const { titulo, subtitulo } = req.body || {};
    const out = {
      titulo: typeof titulo === 'string' ? titulo : DEFAULTS_TEXTOS.titulo,
      subtitulo: typeof subtitulo === 'string' ? subtitulo : DEFAULTS_TEXTOS.subtitulo
    };
    const valor = JSON.stringify(out);
    const connection = await db.getConnection();
    try {
      await connection.query(
        'INSERT INTO config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_en = CURRENT_TIMESTAMP',
        [CLAVE_TEXTOS, valor]
      );
      res.json(out);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('PUT textos-promociones:', error);
    res.status(500).json({ error: 'Error al guardar la configuración' });
  }
});

// Rutas de Control de Acceso
app.get('/api/control-acceso', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const result = await ControlAcceso.getAll(limit, offset);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener registros de acceso: ' + error.message });
  }
});

app.post('/api/control-acceso', async (req, res) => {
  try {
    const { institucion, numero_tarjeta, fecha, estado } = req.body;

    if (!institucion || !numero_tarjeta) {
      return res.status(400).json({ success: false, error: 'Institución y número de tarjeta son obligatorios' });
    }

    const accesoData = { institucion, numero_tarjeta, fecha, estado };
    const result = await ControlAcceso.create(accesoData);

    res.json({ success: true, message: 'Registro de acceso creado exitosamente', id: result.id });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al crear registro de acceso: ' + error.message });
  }
});

// Rutas de diagnóstico y salud
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor en funcionamiento',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', async (req, res) => {
  try {
    const connection = await db.getConnection();
    connection.release();

    const promociones = await models.Promocion.getAllActive();
    const usuarios = await models.Usuario.getAll();

    res.json({
      success: true,
      message: 'API funcionando correctamente',
      database: 'Conectado',
      estadisticas: {
        promociones: promociones.count || 0,
        usuarios: usuarios.data.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error: ' + error.message,
      database: 'Desconectado'
    });
  }
});

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API de Sistema de Gestión',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      promociones: '/api/promociones',
      usuario: '/api/usuario',
      control_acceso: '/api/control-acceso'
    }
  });
});

// Manejo de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🔻 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado exitosamente');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
