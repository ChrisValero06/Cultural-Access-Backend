 const express = require('express');

  const router = express.Router();

  const Usuario = require('../models/Usuario');

  const { sendRegistrationEmail } = require('../utils/emailSender');

  // POST registrar nuevo usuario
  router.post('/', async (req, res) => {
      try {
          let {
              nombre,
              apellido_paterno,
              apellido_materno,
              genero,
              email,
              telefono,
              calle_numero,
              municipio,
              estado,
              colonia,
              codigo_postal,
              edad,
              estudios,
              curp,
              estado_nacimiento,
              fecha_nacimiento,
              numero_tarjeta,
              acepta_info,
              estado_civil,
              registrado_por
          } = req.body;

          // 🔹 Convertir a mayúsculas los campos de texto
          nombre = nombre.toUpperCase();
          apellido_paterno = apellido_paterno.toUpperCase();
          apellido_materno = apellido_materno ? apellido_materno.toUpperCase() : null;
          genero = genero ? genero.toUpperCase() : null;
          email = email.toUpperCase();
          calle_numero = calle_numero.toUpperCase();
          municipio = municipio.toUpperCase();
          estado = estado.toUpperCase();
          colonia = colonia.toUpperCase();
          estado_nacimiento = estado_nacimiento.toUpperCase();
          estado_civil = estado_civil ? estado_civil.toUpperCase() : null;
          estudios = estudios ? estudios.toUpperCase() : null;
          curp = curp ? curp.toUpperCase() : null;
          // ⚠️ NO convertir registrado_por a mayúsculas - es un ID de perfil

          // Validación básica
          if (!nombre || !apellido_paterno || !email) {
              return res.status(400).json({
                  success: false,
                  error: 'Nombre, apellido paterno y email son obligatorios'
              });
          }

          // Crear usuario en la base de datos
          const usuarioData = {
              nombre,
              apellido_paterno,
              apellido_materno,
              genero,
              email,
              telefono,
              calle_numero,
              municipio,
              estado,
              colonia,
              codigo_postal,
              edad,
              estudios,
              curp,
              estado_nacimiento,
              fecha_nacimiento,
              numero_tarjeta,
              acepta_info: acepta_info ? 1 : 0,
              estado_civil,
              registrado_por: registrado_por || null
          };

          const result = await Usuario.create(usuarioData);

          // 📧 Intentar enviar el correo de confirmación después de crear el usuario
          console.log('📧 Enviando correo de confirmación...');
          sendRegistrationEmail({
              nombre: result.nombre || nombre,
              apellido_paterno: result.apellido_paterno || apellido_paterno,
              apellido_materno: result.apellido_materno || apellido_materno,
              email: result.email || email,
              numero_tarjeta: result.numero_tarjeta || numero_tarjeta
          })
              .then(info => {
                  console.log('✅ Correo enviado correctamente:', info.messageId);
              })
              .catch(emailError => {
                  console.error('❌ Error enviando correo (no crítico):', emailError.message);
              });

          res.json({
              success: true,
              message: 'Usuario registrado exitosamente',
              id: result.id
          });

      } catch (error) {
          console.error('Error registrando usuario:', error);

          if (error.code === 'ER_DUP_ENTRY') {
              return res.status(500).json({
                  success: false,
                  error: 'Error al registrar usuario. Si el email ya existe, verifica la restricción única en la base de datos.'
              });
          }

          res.status(500).json({
              success: false,
              error: 'Error interno del servidor: ' + error.message
          });
      }
  });

  // GET verificar disponibilidad de tarjeta
  router.get('/verificar-tarjeta/:numero', async (req, res) => {
      try {
          const { numero } = req.params;

          console.log('🔍 Verificando disponibilidad de tarjeta:', numero);

          const usuarioExistente = await Usuario.getByNumeroTarjeta(numero);

          if (usuarioExistente.data) {
              console.log('❌ Tarjeta ya registrada:', numero);
              res.json({
                  success: true,
                  disponible: false,
                  message: 'Esta tarjeta ya está registrada'
              });
          } else {
              console.log('✅ Tarjeta disponible:', numero);
              res.json({
                  success: true,
                  disponible: true,
                  message: 'Tarjeta disponible'
              });
          }
      } catch (error) {
          console.error('💥 Error verificando tarjeta:', error);
          res.status(500).json({
              success: false,
              disponible: false,
              message: 'Error interno del servidor'
          });
      }
  });

  // GET todos los usuarios
  router.get('/', async (req, res) => {
      try {
          const result = await Usuario.getAll();
          console.log('GET /usuario - Total registros:', result.data.length);
          res.json(result);
      } catch (error) {
          console.error('Error al obtener usuarios:', error);
          res.status(500).json({
              success: false,
              error: 'Error al obtener usuarios'
          });
      }
  });

  // GET usuario por email
  router.get('/email/:email', async (req, res) => {
      try {
          const result = await Usuario.getByEmail(req.params.email);
          if (!result.data) {
              return res.status(404).json({
                  success: false,
                  error: 'Usuario no encontrado'
              });
          }
          res.json(result);
      } catch (error) {
          res.status(500).json({
              success: false,
              error: 'Error al obtener usuario'
          });
      }
  });

  // PUT actualizar usuario
  router.put('/:id', async (req, res) => {
      try {
          const result = await Usuario.update(req.params.id, req.body);
          res.json({
              success: true,
              message: 'Usuario actualizado exitosamente',
              affectedRows: result.affectedRows
          });
      } catch (error) {
          res.status(500).json({
              success: false,
              error: 'Error al actualizar usuario'
          });
      }
  });

  // DELETE eliminar usuario
  router.delete('/:id', async (req, res) => {
      try {
          const result = await Usuario.delete(req.params.id);
          res.json({
              success: true,
              message: 'Usuario eliminado exitosamente',
              affectedRows: result.affectedRows
          });
      } catch (error) {
          res.status(500).json({
              success: false,
              error: 'Error al eliminar usuario'
          });
      }
  });

  module.exports = router;


