 // routes/tipos-promocion.js
  const express = require('express');
  const router = express.Router();
  const TipoPromocion = require('../models/TipoPromocion');

  // GET - Obtener todos los tipos de promoción
  router.get('/', async (req, res) => {
      try {
          const tipos = await TipoPromocion.getAll();
          res.json(tipos);
      } catch (error) {
          console.error('Error en GET /tipos-promocion:', error);
          res.status(500).json({ success: false, error: 'Error al obtener tipos de promoción' });
      }
  });

  // GET - Obtener tipo por ID
  router.get('/:id', async (req, res) => {
      try {
          const tipo = await TipoPromocion.getById(req.params.id);
          if (!tipo) {
              return res.status(404).json({ success: false, error: 'Tipo de promoción no encontrado' });
          }
          res.json(tipo);
      } catch (error) {
          res.status(500).json({ success: false, error: 'Error al obtener tipo de promoción' });
      }
  });

  // POST - Crear nuevo tipo de promoción
  router.post('/', async (req, res) => {
      try {
          const { nombre, instituciones, activo } = req.body;
          if (!nombre || !nombre.trim()) {
              return res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
          }
          const result = await TipoPromocion.create(nombre.trim(), instituciones || [], activo !== false);
          res.json({ success: true, message: 'Tipo de promoción creado exitosamente', data: result });
      } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ success: false, error: 'Este tipo de promoción ya existe' });
          }
          console.error('Error en POST /tipos-promocion:', error);
          res.status(500).json({ success: false, error: 'Error al crear tipo de promoción' });
      }
  });

  // PUT - Actualizar tipo de promoción
  router.put('/:id', async (req, res) => {
      try {
          const { nombre, instituciones, activo } = req.body;
          if (!nombre || !nombre.trim()) {
              return res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
          }
          const result = await TipoPromocion.update(req.params.id, nombre.trim(), instituciones || [], activo !== false);
          if (result.affectedRows === 0) {
              return res.status(404).json({ success: false, error: 'Tipo de promoción no encontrado' });
          }
          res.json({ success: true, message: 'Tipo de promoción actualizado exitosamente' });
      } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ success: false, error: 'Ya existe otro tipo con ese nombre' });
          }
          console.error('Error en PUT /tipos-promocion:', error);
          res.status(500).json({ success: false, error: 'Error al actualizar tipo de promoción' });
      }
  });

  // DELETE - Eliminar tipo de promoción
  router.delete('/:id', async (req, res) => {
      try {
          const result = await TipoPromocion.delete(req.params.id);
          if (result.affectedRows === 0) {
              return res.status(404).json({ success: false, error: 'Tipo de promoción no encontrado' });
          }
          res.json({ success: true, message: 'Tipo de promoción eliminado exitosamente' });
      } catch (error) {
          console.error('Error en DELETE /tipos-promocion:', error);
          res.status(500).json({ success: false, error: 'Error al eliminar tipo de promoción' });
      }
  });

  module.exports = router;