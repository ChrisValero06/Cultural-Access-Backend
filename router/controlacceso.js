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

  const normalizarTarjeta = (numero) => String(numero || '').replace(/\D/g, '').padStart(5, '0');

  // GET redenciones por número de tarjeta
  router.get('/tarjeta/:numero', async (req, res) => {
      try {
          const numeroRaw = req.params.numero.trim();
          const numeroNorm = normalizarTarjeta(numeroRaw);
          const db = require('../db');
          // Incluye variantes con/sin ceros a la izquierda (registros legacy)
          const [rows] = await db.execute(
              `SELECT * FROM control_acceso
               WHERE numero_tarjeta = ?
                  OR numero_tarjeta = ?
                  OR LPAD(TRIM(numero_tarjeta), 5, '0') = ?
               ORDER BY fecha DESC`,
              [numeroRaw, numeroNorm, numeroNorm]
          );
          res.json(rows);
      } catch (error) {
          res.status(500).json({ success: false, error: 'Error al buscar tarjeta: ' + error.message });
      }
  });

  async function verificarLimitePromocion({ institucion, numero_tarjeta, tipo_promocion }) {
      if (!tipo_promocion) return { ok: true };

      const db = require('../db');
      // Límite: leer config aunque la promo esté inactiva/vencida.
      // Preferir filas con límite configurado (limite_uso o limitar_uso=1).
      const [promos] = await db.execute(
          `SELECT limite_uso, limitar_uso, estado, fecha_fin FROM promociones
           WHERE LOWER(TRIM(institucion)) = LOWER(TRIM(?))
             AND LOWER(TRIM(tipo_promocion)) = LOWER(TRIM(?))
           ORDER BY
             CASE
               WHEN limite_uso IN ('una_vez', 'mensual') THEN 0
               WHEN limitar_uso = 1 THEN 1
               ELSE 2
             END,
             fecha_creacion DESC
           LIMIT 1`,
          [institucion, tipo_promocion]
      );

      if (!promos.length) {
          // Tipo en catálogo sin fila en promociones ⇒ no hay tope configurado
          log('⚠️ Sin promo en BD para límite: ' + JSON.stringify({ institucion, tipo_promocion }));
          return { ok: true };
      }

      const promo = promos[0];
      const limiteUso = (promo.limite_uso || '').toString().toLowerCase().trim();
      const tieneLimiteUnaVez = limiteUso === 'una_vez';
      const tieneLimiteMensual =
          limiteUso === 'mensual' ||
          (!limiteUso && (promo.limitar_uso == 1 || promo.limitar_uso === true || promo.limitar_uso === '1'));

      if (!tieneLimiteUnaVez && !tieneLimiteMensual) {
          log('⚠️ Promo sin límite (limite_uso/limitar_uso vacíos): ' + JSON.stringify({ institucion, tipo_promocion, limite_uso: promo.limite_uso, limitar_uso: promo.limitar_uso }));
          return { ok: true };
      }

      const numeroNorm = normalizarTarjeta(numero_tarjeta);
      const [registros] = await db.execute(
          `SELECT fecha, tipo_promocion, institucion FROM control_acceso
           WHERE (numero_tarjeta = ? OR numero_tarjeta = ? OR LPAD(TRIM(numero_tarjeta), 5, '0') = ?)
             AND LOWER(TRIM(institucion)) = LOWER(TRIM(?))
             AND LOWER(TRIM(COALESCE(tipo_promocion, ''))) = LOWER(TRIM(?))
           ORDER BY fecha DESC`,
          [numero_tarjeta, numeroNorm, numeroNorm, institucion, tipo_promocion]
      );

      if (tieneLimiteUnaVez && registros.length > 0) {
          return {
              ok: false,
              status: 409,
              message: 'Esta tarjeta ya fue utilizada en esta promoción. Solo se permite una redención por tarjeta.'
          };
      }

      if (tieneLimiteMensual) {
          const [mensuales] = await db.execute(
              `SELECT id_institucion FROM control_acceso
               WHERE (numero_tarjeta = ? OR numero_tarjeta = ? OR LPAD(TRIM(numero_tarjeta), 5, '0') = ?)
                 AND LOWER(TRIM(institucion)) = LOWER(TRIM(?))
                 AND LOWER(TRIM(COALESCE(tipo_promocion, ''))) = LOWER(TRIM(?))
                 AND YEAR(fecha) = YEAR(CURDATE())
                 AND MONTH(fecha) = MONTH(CURDATE())
               LIMIT 1`,
              [numero_tarjeta, numeroNorm, numeroNorm, institucion, tipo_promocion]
          );
          if (mensuales.length > 0) {
              return {
                  ok: false,
                  status: 409,
                  message: 'Esta tarjeta ya fue utilizada en esta promoción este mes.'
              };
          }
      }

      return { ok: true };
  }

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

          const numeroNorm = normalizarTarjeta(numero_tarjeta);

          const limiteCheck = await verificarLimitePromocion({
              institucion: institucion.trim(),
              numero_tarjeta: numeroNorm,
              tipo_promocion: tipo_promocion || null
          });
          if (!limiteCheck.ok) {
              log('⛔ Límite de promoción: ' + limiteCheck.message);
              return res.status(limiteCheck.status || 409).json({
                  success: false,
                  message: limiteCheck.message
              });
          }

			const accesoData = {
			  institucion: institucion.trim(),
			  numero_tarjeta: numeroNorm,
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
              // El registro ya se guardó: no tratar el fallo de correo como error de creación
              log('⚠️ Registro OK pero error enviando correo: ' + error.message);

              return res.status(201).json({
                  success: true,
                  warning: true,
                  message: "Registro creado; no se pudo enviar el correo",
                  email_error: error.message
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