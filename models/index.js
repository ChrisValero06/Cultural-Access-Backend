// models/index.js

// Importamos los modelos
const Usuario = require('./Usuario');
const Promocion = require('./Promocion');
const ControlAcceso = require('./ControlAcceso');
const Instituciones = require('./Instituciones');
 const TipoPromocion = require('./TipoPromocion');
//const Login = require('./Login');

// Exportamos todos los modelos
const models = {
	Usuario,
	Promocion,
	ControlAcceso,
	Instituciones,
	TipoPromocion,
	//Login
};

module.exports = models;
