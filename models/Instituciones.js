const db = require('../db'); // Ajusta según tu estructura

const Instituciones = {
  /**
   * Obtener todas las instituciones
   * @returns {Promise<Object>} { success: boolean, data: Array }
   */
  async getAll() {
    try {
      const query = 'SELECT id, nombre, created_at, updated_at FROM instituciones ORDER BY nombre ASC';
      const [instituciones] = await db.execute(query);
      return {
        success: true,
        data: instituciones
      };
    } catch (error) {
      console.error('Error en getAll:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  },

  /**
   * Obtener una institución por ID
   * @param {number} id - ID de la institución
   * @returns {Promise<Object>} { success: boolean, data: Object|null }
   */
  async getById(id) {
    try {
      const [instituciones] = await db.execute(
        'SELECT id, nombre, created_at, updated_at FROM instituciones WHERE id = ?',
        [id]
      );
      return {
        success: true,
        data: instituciones.length > 0 ? instituciones[0] : null
      };
    } catch (error) {
      console.error('Error en getById:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  },

  /**
   * Obtener una institución por nombre
   * @param {string} nombre - Nombre de la institución
   * @returns {Promise<Object>} { success: boolean, data: Object|null }
   */
  async getByNombre(nombre) {
    try {
      const [instituciones] = await db.execute(
        'SELECT id, nombre, created_at, updated_at FROM instituciones WHERE nombre = ?',
        [nombre]
      );
      return {
        success: true,
        data: instituciones.length > 0 ? instituciones[0] : null
      };
    } catch (error) {
      console.error('Error en getByNombre:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  },

  /**
   * Buscar instituciones por término
   * @param {string} termino - Término de búsqueda
   * @returns {Promise<Object>} { success: boolean, data: Array }
   */
  async buscar(termino) {
    try {
      const terminoBusqueda = `%${termino.trim()}%`;
      const query = `
        SELECT id, nombre, created_at, updated_at 
        FROM instituciones 
        WHERE nombre LIKE ? 
        ORDER BY nombre ASC
      `;
      const [instituciones] = await db.execute(query, [terminoBusqueda]);
      return {
        success: true,
        data: instituciones
      };
    } catch (error) {
      console.error('Error en buscar:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  },

  /**
   * Crear una nueva institución
   * @param {string} nombre - Nombre de la institución
   * @returns {Promise<Object>} { success: boolean, id: number, data: Object|null }
   */
  async create(nombre) {
    try {
      const nombreLimpio = nombre.trim();
      
      // Verificar si ya existe
      const existente = await this.getByNombre(nombreLimpio);
      if (existente.data) {
        return {
          success: false,
          id: null,
          data: null,
          error: 'La institución ya existe'
        };
      }
      
      // Insertar nueva institución
      const [result] = await db.execute(
        'INSERT INTO instituciones (nombre) VALUES (?)',
        [nombreLimpio]
      );
      
      // Obtener la institución creada
      const creada = await this.getById(result.insertId);
      
      return {
        success: true,
        id: result.insertId,
        data: creada.data
      };
    } catch (error) {
      console.error('Error en create:', error);
      return {
        success: false,
        id: null,
        data: null,
        error: error.message
      };
    }
  },

  /**
   * Actualizar una institución
   * @param {number} id - ID de la institución
   * @param {string} nombre - Nuevo nombre
   * @returns {Promise<Object>} { success: boolean, affectedRows: number }
   */
  async update(id, nombre) {
    try {
      const nombreLimpio = nombre.trim();
      
      // Verificar que la institución existe
      const existente = await this.getById(id);
      if (!existente.data) {
        return {
          success: false,
          affectedRows: 0,
          error: 'Institución no encontrada'
        };
      }
      
      // Verificar si el nuevo nombre ya existe en otra institución
      const duplicado = await this.getByNombre(nombreLimpio);
      if (duplicado.data && duplicado.data.id !== id) {
        return {
          success: false,
          affectedRows: 0,
          error: 'Ya existe otra institución con ese nombre'
        };
      }
      
      // Actualizar
      const [result] = await db.execute(
        'UPDATE instituciones SET nombre = ? WHERE id = ?',
        [nombreLimpio, id]
      );
      
      return {
        success: true,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error('Error en update:', error);
      return {
        success: false,
        affectedRows: 0,
        error: error.message
      };
    }
  },

  /**
   * Eliminar una institución
   * @param {number} id - ID de la institución
   * @returns {Promise<Object>} { success: boolean, affectedRows: number }
   */
  async delete(id) {
    try {
      // Verificar que la institución existe
      const existente = await this.getById(id);
      if (!existente.data) {
        return {
          success: false,
          affectedRows: 0,
          error: 'Institución no encontrada'
        };
      }
      
      // Eliminar
      const [result] = await db.execute('DELETE FROM instituciones WHERE id = ?', [id]);
      
      return {
        success: true,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error('Error en delete:', error);
      return {
        success: false,
        affectedRows: 0,
        error: error.message
      };
    }
  },

  /**
   * Contar total de instituciones
   * @returns {Promise<Object>} { success: boolean, data: number }
   */
  async contar() {
    try {
      const [result] = await db.execute('SELECT COUNT(*) as total FROM instituciones');
      return {
        success: true,
        data: result[0].total
      };
    } catch (error) {
      console.error('Error en contar:', error);
      return {
        success: false,
        data: 0,
        error: error.message
      };
    }
  }
};

module.exports = Instituciones;

