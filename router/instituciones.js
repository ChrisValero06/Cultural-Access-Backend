const express = require('express');
const router = express.Router();
const Institucion = require('../models/Instituciones');



// POST crear nueva institución
router.post('/', async (req, res) => {
    try {
        let { nombre } = req.body;

        // Validación básica
        if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'El nombre de la institución es obligatorio'
            });
        }

        // Crear institución en la base de datos
        const result = await Institucion.create(nombre);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Error al crear la institución'
            });
        }

        res.json({
            success: true,
            message: 'Institución creada exitosamente',
            id: result.id
        });

    } catch (error) {
        console.error('Error creando institución:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                error: 'La institución ya existe'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor: ' + error.message
        });
    }
});

// GET todas las instituciones
router.get('/', async (req, res) => {
    try {
        const result = await Institucion.getAll();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al obtener instituciones'
        });
    }
});

// GET buscar instituciones por término
router.get('/buscar', async (req, res) => {
    try {
        const { termino } = req.query;
        
        if (!termino || termino.trim() === '') {
            return res.json({
                success: true,
                data: []
            });
        }
        
        const result = await Institucion.buscar(termino);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al buscar instituciones'
        });
    }
});

// GET institución por ID
router.get('/:id', async (req, res) => {
    try {
        const result = await Institucion.getById(req.params.id);
        if (!result.data) {
            return res.status(404).json({
                success: false,
                error: 'Institución no encontrada'
            });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al obtener institución'
        });
    }
});

// PUT actualizar institución
router.put('/:id', async (req, res) => {
    try {
        const { nombre } = req.body;

        // Validación básica
        if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'El nombre de la institución es obligatorio'
            });
        }

        const result = await Institucion.update(req.params.id, nombre);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Error al actualizar la institución'
            });
        }

        res.json({
            success: true,
            message: 'Institución actualizada exitosamente',
            affectedRows: result.affectedRows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al actualizar institución'
        });
    }
});

// DELETE eliminar institución
router.delete('/:id', async (req, res) => {
    try {
        const result = await Institucion.delete(req.params.id);
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: result.error || 'Institución no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Institución eliminada exitosamente',
            affectedRows: result.affectedRows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al eliminar institución'
        });
    }
});

module.exports = router;
