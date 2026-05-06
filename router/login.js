 const express = require('express');
  const router = express.Router();

  const AUTH_USERS = [
    { usuario: 'franciscomurga', password: 'francisco2025', perfilId: 'francisco_murga', nombre: 'Francisco Murga' },
    { usuario: 'alejandrolachea', password: 'alejandro2025', perfilId: 'alejandro_olachea', nombre: 'Alejandro Olachea'
  },
    { usuario: 'raymundoibarra', password: 'raymundo2025', perfilId: 'raymundo_ibarra', nombre: 'Raymundo Ibarra' },
    { usuario: 'karlaacevedo', password: 'karla2025', perfilId: 'karla_acevedo', nombre: 'Karla Acevedo' },
    { usuario: 'pepe', password: '7373', perfilId: 'pepe', nombre: 'Pepe' },
    { usuario: 'jose', password: '7373', perfilId: 'jose', nombre: 'Jose' },
    { usuario: 'labnl', password: 'labnl2025', perfilId: 'labnl', nombre: 'LABNL' },
    { usuario: 'francisco', password: '7421', perfilId: 'francisco', nombre: 'Francisco' },
    { usuario: 'planeacion', password: 'planeacion2026', perfilId: 'planeacion', nombre: 'Planeacion' }
  ];

  router.post('/login', (req, res) => {
    const { emailOrUsuario, password } = req.body;
    if (!emailOrUsuario || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
    }
    const match = AUTH_USERS.find(
      u => u.usuario === emailOrUsuario.trim() && u.password === password.trim()
    );
    if (!match) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    return res.json({
      token: match.usuario + '-token',
      usuario: match.usuario,
      perfilId: match.perfilId,
      nombre: match.nombre
    });
  });

  module.exports = router;