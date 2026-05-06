const fs = require('fs');
  const path = require('path');

  const ControlAcceso = require('../models/ControlAcceso');

  const express = require('express');

  const router = express.Router();

  const { sendRedencionEmail } = require('../utils/emailSender-redencion');

  // ⭐⭐ LOGGING A ARCHIVO PARA DEBUGGING
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, `control-acceso-${new Date().toISOString().split('T')[0]}.log`);

  const log = (message) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      fs.appendFileSync(logFile, logMessage, 'utf8');
      console.log(message);
  };

  // GET todos los registros de acceso (con paginación)
  router.get('/', async (req, res) => {
      try {
          const limit = parseInt(req.query.limit) || 100;
          const offset = parseInt(req.query.offset) || 0;
          const result = await ControlAcceso.getAll(limit, offset);
          res.json(result);
      } catch (error) {
          res.status(500).json({ success: false, error: 'Error al obtener registros de acceso: ' + error.message });
      }
  });

  // GET redenciones por número de tarjeta
  router.get('/tarjeta/:numero', async (req, res) => {
      try {
          const numero = req.params.numero.trim();
          const db = require('../db');
          const [rows] = await db.execute(
              'SELECT * FROM control_acceso WHERE numero_tarjeta = ? ORDER BY fecha DESC',
              [numero]
          );
          res.json(rows);
      } catch (error) {
          res.status(500).json({ success: false, error: 'Error al buscar tarjeta: ' + error.message });
      }
  });

  router.post('/', async (req, res) => {
      try {
          const { institucion, numero_tarjeta, fecha, tipo_promocion } = req.body;

          log('📥 POST /control-acceso - Datos recibidos: ' + JSON.stringify({ institucion, numero_tarjeta, fecha,
  tipo_promocion }));

          if (!institucion || !numero_tarjeta || !fecha) {
              log('❌ Validación fallida: Faltan campos requeridos');
              return res.status(400).json({
                  success: false,
                  message: 'Faltan campos requeridos: institucion, numero_tarjeta, fecha'
              });
          }

          const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!fechaRegex.test(fecha)) {
              log('❌ Formato de fecha inválido');
              return res.status(400).json({
                  success: false,
                  message: 'El formato de la fecha debe ser YYYY-MM-DD'
              });
          }

			const accesoData = {
			  institucion: institucion.trim(),
			  numero_tarjeta: numero_tarjeta.trim(),
			  fecha,
			  tipo_promocion: tipo_promocion || null
		  };

          log('💾 Creando registro en BD...');
          const result = await ControlAcceso.create(accesoData);
          log('✅ Registro creado: ' + JSON.stringify(result));

          // ----- ENVÍO DE CORREO -----
          log('📧 ===== INICIANDO ENVÍO DE EMAIL =====');

          const emailData = {
              institucion: accesoData.institucion,
              numero_tarjeta: accesoData.numero_tarjeta,
              fecha: accesoData.fecha,
              tipo_promocion: tipo_promocion || ''
          };

          try {
              const info = await sendRedencionEmail(emailData);
              log('📧 Email enviado correctamente: ' + JSON.stringify(info));

              return res.status(201).json({
                  success: true,
                  message: "Acceso registrado y correo enviado correctamente",
                  email_info: info
              });

          } catch (error) {
              log('❌ Error enviando correo: ' + error.message);

              return res.status(500).json({
                  success: false,
                  message: "Acceso registrado pero ocurrió un error enviando el correo",
                  error: error.message
              });
          }

      } catch (error) {
          log('❌ ERROR GENERAL EN POST: ' + error.message);

          return res.status(500).json({
              success: false,
              error: 'Error al crear registro de acceso: ' + error.message
          });
      }
  });

  // DELETE eliminar registro de acceso
  router.delete('/:id', async (req, res) => {
      try {
          const result = await ControlAcceso.delete(req.params.id);
          res.json({ success: true, message: 'Registro eliminado exitosamente', affectedRows: result.affectedRows });
      } catch (error) {
          res.status(500).json({ success: false, error: 'Error al eliminar registro: ' + error.message });
      }
  });

  module.exports = router;