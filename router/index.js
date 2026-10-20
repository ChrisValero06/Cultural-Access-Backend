// routes/index.js
  const usuariosRouter = require('./usuario');
  const promocionesRouter = require('./promociones');
  const controlAccesoRouter = require('./controlacceso');
  const institucionesRouter = require('./instituciones');
  const tiposPromocionRouter = require('./tipos-promocion');
  const authRouter = require('./login');
  const newsletterRouter = require('./newsletter');

  module.exports = (app) => {
      app.use('/api/usuario', usuariosRouter);
      app.use('/api/promociones', promocionesRouter);
      app.use('/api/controlacceso', controlAccesoRouter);
      app.use('/api/instituciones', institucionesRouter);
      app.use('/api/tipos-promocion', tiposPromocionRouter);
      app.use('/api/auth', authRouter);
      app.use('/api/newsletter', newsletterRouter);
  };
