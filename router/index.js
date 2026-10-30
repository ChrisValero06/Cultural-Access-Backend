// routes/index.js
  const usuariosRouter = require('./usuario');
  const promocionesRouter = require('./promociones');
  const controlAccesoRouter = require('./controlacceso');
  const institucionesRouter = require('./instituciones');
  const tiposPromocionRouter = require('./tipos-promocion');
  const authRouter = require('./login');

  let newsletterRouter = null;
  try {
      newsletterRouter = require('./newsletter');
  } catch (error) {
      console.error('Newsletter no se cargó. El resto de la API sigue activo:', error.message);
  }

  module.exports = (app) => {
      app.use('/api/usuario', usuariosRouter);
      app.use('/api/promociones', promocionesRouter);
      app.use('/api/controlacceso', controlAccesoRouter);
      // Alias con guion (legado); mismo router con check de límite
      app.use('/api/control-acceso', controlAccesoRouter);
      app.use('/api/instituciones', institucionesRouter);
      app.use('/api/tipos-promocion', tiposPromocionRouter);
      app.use('/api/auth', authRouter);
      if (newsletterRouter) {
          app.use('/api/newsletter', newsletterRouter);
      }
  };
