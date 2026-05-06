/**
 * Rutas para /api/config/textos-promociones
 * En tu backend (culturallaccess.com), este archivo debe estar en: routes/configRoutes.js
 * y registrarse en app.js con: app.use('/api/config', configRoutes(configModel));
 */

const express = require('express');

function configRoutes(configModel) {
  const router = express.Router();

  // GET /api/config/textos-promociones
  router.get('/textos-promociones', async (req, res) => {
    try {
      const data = await configModel.getTextosPromociones();
      res.json(data);
    } catch (err) {
      console.error('GET textos-promociones:', err);
      res.status(500).json({ error: 'Error al obtener la configuración' });
    }
  });

  // PUT /api/config/textos-promociones
  router.put('/textos-promociones', async (req, res) => {
    try {
      const { titulo, subtitulo } = req.body || {};
      const data = await configModel.updateTextosPromociones({ titulo, subtitulo });
      res.json(data);
    } catch (err) {
      console.error('PUT textos-promociones:', err);
      res.status(500).json({ error: 'Error al guardar la configuración' });
    }
  });

  return router;
}

module.exports = configRoutes;
