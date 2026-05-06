require('dotenv').config();

const nodemailer = require('nodemailer');

console.log('🔧 Configurando transporter SMTP...');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('EMAIL_TO:', process.env.EMAIL_TO);

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST,
	port: Number(process.env.EMAIL_PORT),
	secure: true,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS
	},
	dkim: {
		domainName: "tudominio.com",
		keySelector: "default",
		privateKey: process.env.DKIM_PRIVATE_KEY
	}
});

// Verificación del transporte
transporter.verify((error, success) => {
	if (error) {
		console.error('❌ Error verificando conexión SMTP:', error);
	} else {
		console.log('✅ Conexión SMTP verificada correctamente');
	}
});

// Valores seguros: evita undefined/null y muestra texto legible en el correo
const safe = (v) => {
	if (v == null) return '—';
	const s = String(v).trim();
	return s === '' ? '—' : s;
};

const sendRegistrationEmail = async (data) => {
	console.log('📨 Preparando correo para:', data?.email);

	const d = data || {};
	const nombreCompleto = `${safe(d.nombre)} ${safe(d.apellido_paterno)} ${safe(d.apellido_materno)}`.trim() || '—';
	const aceptaInfoText = d.acepta_info === 1 || d.acepta_info === true || String(d.acepta_info) === '1' ? 'Sí' : 'No';

	// Versión TEXTO (para clientes que no muestran HTML)
	const textVersion = `
Se ha registrado un nuevo usuario:

Datos personales:
  Nombre: ${nombreCompleto}
  Email: ${safe(d.email)}
  Género: ${safe(d.genero)}
  Fecha de nacimiento: ${safe(d.fecha_nacimiento)}
  CURP: ${safe(d.curp)}

Dirección:
  Calle y número: ${safe(d.calle_numero)}
  Colonia: ${safe(d.colonia)}
  Municipio: ${safe(d.municipio)}
  Estado: ${safe(d.estado)}
  Código Postal: ${safe(d.codigo_postal)}

Información adicional:
  Edad: ${safe(d.edad)}
  Estudios: ${safe(d.estudios)}
  Estado de nacimiento: ${safe(d.estado_nacimiento)}
  Identificador: ${safe(d.numero_tarjeta)}
  Acepta información: ${aceptaInfoText}

---
Este es un correo automático. Si no reconoces esta actividad, por favor ignora este mensaje y/o contacta al administrador del sistema. Cultural Access - Estrellas de Nuevo León.
`.trim();

	// Versión HTML (misma información, para que siempre llegue completa)
	const htmlVersion = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; color: #333; line-height: 1.5;">
  <p><strong>Se ha registrado un nuevo usuario:</strong></p>

  <p style="margin-top: 1em;"><strong style="color: #ea580c;">Datos personales:</strong><br>
  <strong>Nombre:</strong> ${nombreCompleto}<br>
  <strong>Email:</strong> ${safe(d.email)}<br>
  <strong>Género:</strong> ${safe(d.genero)}<br>
  <strong>Fecha de nacimiento:</strong> ${safe(d.fecha_nacimiento)}<br>
  <strong>CURP:</strong> ${safe(d.curp)}</p>

  <p><strong style="color: #ea580c;">Dirección:</strong><br>
  <strong>Calle y número:</strong> ${safe(d.calle_numero)}<br>
  <strong>Colonia:</strong> ${safe(d.colonia)}<br>
  <strong>Municipio:</strong> ${safe(d.municipio)}<br>
  <strong>Estado:</strong> ${safe(d.estado)}<br>
  <strong>Código Postal:</strong> ${safe(d.codigo_postal)}</p>

  <p><strong style="color: #ea580c;">Información adicional:</strong><br>
  <strong>Edad:</strong> ${safe(d.edad)}<br>
  <strong>Estudios:</strong> ${safe(d.estudios)}<br>
  <strong>Estado de nacimiento:</strong> ${safe(d.estado_nacimiento)}<br>
  <strong>Identificador:</strong> ${safe(d.numero_tarjeta)}<br>
  <strong>Acepta información:</strong> ${aceptaInfoText}</p>

  <p style="margin-top: 1.5em; font-size: 0.9em; color: #666;">Este es un correo automático. Si no reconoces esta actividad, por favor ignora este mensaje y/o contacta al administrador del sistema. Cultural Access - Estrellas de Nuevo León.</p>
</body>
</html>
`.trim();

	const mailOptions = {
		from: `Cultural Access <${process.env.EMAIL_FROM}>`,
		to: process.env.EMAIL_TO,
		subject: `Nuevo registro - ${nombreCompleto}`,
		text: textVersion,
		html: htmlVersion,
		headers: {
			'X-Entity-Ref-ID': `${Date.now()}-${safe(d.numero_tarjeta)}`,
			'List-Unsubscribe': `<mailto:${process.env.EMAIL_FROM}?subject=Unsubscribe>`
		}
	};

	try {
		console.log('🚀 Enviando correo...');
		const info = await transporter.sendMail(mailOptions);
		console.log('✅ Correo enviado con éxito:', info.response);
		return info;
	} catch (error) {
		console.error('❌ Error al enviar el correo:', error);
		throw error;
	}
};

module.exports = { sendRegistrationEmail };
