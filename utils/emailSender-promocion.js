require('dotenv').config();

const nodemailer = require('nodemailer');

console.log('🔧 Configurando transporter SMTP...');

console.log('EMAIL_HOST:', process.env.EMAIL_HOST);

console.log('EMAIL_PORT:', process.env.EMAIL_PORT);

console.log('EMAIL_USER_PROMOCIONES:', process.env.EMAIL_USER_PROMOCIONES);

console.log('EMAIL_FROM_PROMOCIONES:', process.env.EMAIL_FROM_PROMOCIONES);

console.log('EMAIL_TO_PROMOCIONES:', process.env.EMAIL_TO_PROMOCIONES);

// ⭐⭐ SOPORTE PARA MÚLTIPLES CORREOS
const destinatarios = process.env.EMAIL_TO_PROMOCIONES && process.env.EMAIL_TO_PROMOCIONES.includes(',') 
	? process.env.EMAIL_TO_PROMOCIONES.split(',').map(email => email.trim())
	: (process.env.EMAIL_TO_PROMOCIONES || '').trim();

console.log('📧 Destinatarios:', destinatarios);

const transporter = nodemailer.createTransport({

	host: process.env.EMAIL_HOST,

	port: Number(process.env.EMAIL_PORT),

	secure: true,

	auth: {

		user: process.env.EMAIL_USER_PROMOCIONES,

		pass: process.env.EMAIL_PASS_PROMOCIONES

	},

	// // dkim: {

		// // domainName: "tudominio.com",

		// // keySelector: "default",

		//privateKey: process.env.DKIM_PRIVATE_KEY


});

// Verificación del transporte

transporter.verify((error, success) => {

	if (error) {

		console.error('❌ Error verificando conexión SMTP:', error);

	} else {

		console.log('✅ Conexión SMTP verificada correctamente');

	}

});

const sendPromocionEmail = async (data) => {

	console.log('📨 Preparando correo para:', data.institucion);
	console.log('📋 Datos completos recibidos:', JSON.stringify(data, null, 2));
	
	// ⭐⭐ JSON COMPLETO DE LO QUE SE ESTÁ ENVIANDO
	const datosCompletos = {
		institucion: data.institucion || 'N/A',
		tipo_promocion: data.tipo_promocion || 'N/A',
		disciplina: data.disciplina || 'N/A',
		beneficios: data.beneficios || 'N/A',
		comentarios_restricciones: data.comentarios_restricciones || 'N/A',
		fecha_inicio: data.fecha_inicio || 'N/A',
		fecha_fin: data.fecha_fin || 'N/A',
		estado: data.estado || 'N/A',
		id: data.id || 'N/A',
		imagen_url: data.imagen_url || 'N/A',
		imagen: data.imagen || 'N/A',
		fecha_registro: new Date().toLocaleString()
	};
	
	console.log('📧 JSON COMPLETO QUE SE ESTÁ ENVIANDO:');
	console.log(JSON.stringify(datosCompletos, null, 2));

	// ⭐⭐ CONSTRUIR EMAIL CON TODA LA INFORMACIÓN DE LA PROMOCIÓN
	const textVersion = `

═══════════════════════════════════════════════════════════
NUEVA PROMOCIÓN CARGADA EN CULTURAL ACCESS
═══════════════════════════════════════════════════════════

INFORMACIÓN DE LA PROMOCIÓN:

ID Promoción: ${data.id || 'N/A'}
Institución: ${data.institucion || 'N/A'}
Tipo de Promoción: ${data.tipo_promocion || 'N/A'}
Disciplina: ${data.disciplina || 'N/A'}
Beneficios: ${data.beneficios || 'N/A'}
Comentarios/Restricciones: ${data.comentarios_restricciones || 'N/A'}
Fecha Inicio: ${data.fecha_inicio || 'N/A'}
Fecha Fin: ${data.fecha_fin || 'N/A'}
Estado: ${data.estado || 'N/A'}
${data.imagen_url ? `Imagen: ${data.imagen_url}` : ''}
${data.imagen ? `Imagen (archivo): ${data.imagen}` : ''}

═══════════════════════════════════════════════════════════
INFORMACIÓN ADICIONAL
═══════════════════════════════════════════════════════════

Fecha de Registro: ${new Date().toLocaleString()}

`;

	// ⭐⭐ VERSIÓN HTML MEJORADA CON TODA LA INFORMACIÓN
	const htmlVersion = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF6B35; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .section { margin: 20px 0; padding: 15px; background-color: white; border-radius: 5px; border-left: 4px solid #FF6B35; }
        .section-title { font-size: 18px; font-weight: bold; color: #FF6B35; margin-bottom: 10px; border-bottom: 2px solid #FF6B35; padding-bottom: 5px; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; color: #555; display: inline-block; min-width: 200px; }
        .value { color: #333; }
        .beneficios { white-space: pre-wrap; }
        .imagen-container { margin-top: 10px; }
        .imagen-container img { max-width: 100%; height: auto; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1> Nueva Promoción - Cultural Access</h1>
        </div>
        <div class="content">
            <div class="section">
                <div class="section-title">📋 Información de la Promoción</div>
                ${data.id ? `
                <div class="field">
                    <span class="label">ID Promoción:</span>
                    <span class="value">${data.id}</span>
                </div>
                ` : ''}
                <div class="field">
                    <span class="label">Institución:</span>
                    <span class="value">${data.institucion || 'N/A'}</span>
                </div>
                <div class="field">
                    <span class="label">Tipo de Promoción:</span>
                    <span class="value">${data.tipo_promocion || 'N/A'}</span>
                </div>
                ${data.disciplina ? `
                <div class="field">
                    <span class="label">Disciplina:</span>
                    <span class="value">${data.disciplina}</span>
                </div>
                ` : ''}
                ${data.beneficios ? `
                <div class="field">
                    <span class="label">Beneficios:</span>
                    <span class="value beneficios">${data.beneficios}</span>
                </div>
                ` : ''}
                ${data.comentarios_restricciones ? `
                <div class="field">
                    <span class="label">Comentarios/Restricciones:</span>
                    <span class="value">${data.comentarios_restricciones}</span>
                </div>
                ` : ''}
                ${data.fecha_inicio ? `
                <div class="field">
                    <span class="label">Fecha Inicio:</span>
                    <span class="value">${data.fecha_inicio}</span>
                </div>
                ` : ''}
                ${data.fecha_fin ? `
                <div class="field">
                    <span class="label">Fecha Fin:</span>
                    <span class="value">${data.fecha_fin}</span>
                </div>
                ` : ''}
                ${data.estado ? `
                <div class="field">
                    <span class="label">Estado:</span>
                    <span class="value">${data.estado}</span>
                </div>
                ` : ''}
                ${data.imagen_url ? `
                <div class="field">
                    <span class="label">URL de Imagen:</span>
                    <span class="value"><a href="${data.imagen_url}" target="_blank">${data.imagen_url}</a></span>
                </div>
                <div class="imagen-container">
                    <img src="${data.imagen_url}" alt="Imagen de la promoción" />
                </div>
                ` : ''}
                ${data.imagen ? `
                <div class="field">
                    <span class="label">Imagen:</span>
                    <span class="value">${data.imagen}</span>
                </div>
                ` : ''}
            </div>

            <div class="section">
                <div class="section-title">ℹ️ Información Adicional</div>
                <div class="field">
                    <span class="label">Fecha de Registro:</span>
                    <span class="value">${new Date().toLocaleString()}</span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
`;

	const mailOptions = {

		from: `Cultural Access <${process.env.EMAIL_FROM_PROMOCIONES}>`,

		to: destinatarios,  // ⭐⭐ SOPORTA MÚLTIPLES CORREOS

		subject: `Nueva promoción - ${data.institucion || 'Cultural Access'}`,

		text: textVersion,

		html: htmlVersion,

		headers: {

			'X-Entity-Ref-ID': `${Date.now()}-${data.institucion || 'promocion'}`,

			'List-Unsubscribe': `<mailto:${process.env.EMAIL_FROM_PROMOCIONES}?subject=Unsubscribe>`

		}

	};

	try {

		console.log('🚀 Enviando correo...');
		console.log('═══════════════════════════════════════════════════════');
		console.log('📧 INFORMACIÓN DEL CORREO QUE SE ESTÁ ENVIANDO:');
		console.log('═══════════════════════════════════════════════════════');
		console.log('📤 DE (FROM):', mailOptions.from);
		console.log('📥 PARA (TO):', Array.isArray(mailOptions.to) ? mailOptions.to.join(', ') : mailOptions.to);
		console.log('📥 PARA (TO - Array):', JSON.stringify(Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to], null, 2));
		console.log('📋 ASUNTO (SUBJECT):', mailOptions.subject);
		console.log('═══════════════════════════════════════════════════════');
		console.log('📧 JSON COMPLETO DEL CORREO:');
		console.log(JSON.stringify({
			from: mailOptions.from,
			to: mailOptions.to,
			subject: mailOptions.subject,
			text_preview: mailOptions.text.substring(0, 200) + '...',
			html_preview: mailOptions.html.substring(0, 200) + '...',
			headers: mailOptions.headers
		}, null, 2));

		const info = await transporter.sendMail(mailOptions);

		console.log('═══════════════════════════════════════════════════════');
		console.log('✅ RESULTADO DEL ENVÍO:');
		console.log('═══════════════════════════════════════════════════════');
		console.log('✅ Correo enviado con éxito:', info.response);
		console.log('📧 Message ID:', info.messageId);
		console.log('📧 Correos ACEPTADOS por el servidor:', JSON.stringify(info.accepted, null, 2));
		console.log('📧 Correos RECHAZADOS por el servidor:', JSON.stringify(info.rejected, null, 2));
		console.log('═══════════════════════════════════════════════════════');

		return info;

	} catch (error) {

		console.error('❌ Error al enviar el correo:', error);

		throw error;

	}

};

module.exports = { sendPromocionEmail };

