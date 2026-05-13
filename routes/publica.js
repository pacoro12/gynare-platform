// Rutas públicas — sin autenticación
const express = require('express');
const router = express.Router();
const db = require('../database/init');
const nodemailer = require('nodemailer');

// Configuración de correo (Outlook/Hotmail)
// Para activar: agrega EMAIL_PASS en las variables de entorno de Railway
function getMailer() {
  if (!process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: 'lucero.vaca@hotmail.com',
      pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
  });
}

async function enviarNotificacion(cita) {
  const mailer = getMailer();
  if (!mailer) return; // Sin credenciales, no enviar

  const asunto = `🌸 Nueva solicitud de cita — ${cita.nombre}`;
  const texto = `
Nueva solicitud de cita desde el sitio web GYNARE:

Paciente: ${cita.nombre}
Teléfono: ${cita.telefono}
Email: ${cita.email || 'No proporcionado'}
Fecha solicitada: ${cita.fecha}
Hora solicitada: ${cita.hora}
Primera vez: ${cita.es_primera_vez ? 'Sí' : 'No'}
Motivo: ${cita.motivo || 'Sin especificar'}

Por favor confirma la cita comunicándote con el/la paciente.
`;

  try {
    await mailer.sendMail({
      from: 'lucero.vaca@hotmail.com',
      to: 'lucero.vaca@hotmail.com',
      subject: asunto,
      text: texto,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
          <div style="background: #4B1040; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; font-size: 24px; letter-spacing: 0.1em; margin: 0;">GYNARE</h2>
            <p style="color: #C4A0B8; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 4px 0 0;">Nueva solicitud de cita</p>
          </div>
          <div style="background: #F9F2F7; padding: 28px; border: 1px solid #F0E4EC; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; font-size: 15px; color: #4A3545;">
              <tr><td style="padding: 8px 0; color: #9E8898; width: 130px;">Paciente</td><td style="padding: 8px 0; font-weight: 600;">${cita.nombre}</td></tr>
              <tr><td style="padding: 8px 0; color: #9E8898;">Teléfono</td><td style="padding: 8px 0;"><a href="https://wa.me/52${cita.telefono.replace(/\D/g,'')}" style="color: #4B1040;">${cita.telefono}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #9E8898;">Email</td><td style="padding: 8px 0;">${cita.email || '—'}</td></tr>
              <tr><td style="padding: 8px 0; color: #9E8898;">Fecha</td><td style="padding: 8px 0; font-weight: 600;">${cita.fecha}</td></tr>
              <tr><td style="padding: 8px 0; color: #9E8898;">Hora</td><td style="padding: 8px 0; font-weight: 600;">${cita.hora}</td></tr>
              <tr><td style="padding: 8px 0; color: #9E8898;">Primera vez</td><td style="padding: 8px 0;">${cita.es_primera_vez ? 'Sí' : 'No'}</td></tr>
              ${cita.motivo ? `<tr><td style="padding: 8px 0; color: #9E8898;">Motivo</td><td style="padding: 8px 0; font-style: italic;">"${cita.motivo}"</td></tr>` : ''}
            </table>
            <div style="margin-top: 24px; text-align: center;">
              <p style="font-size: 13px; color: #9E8898;">Accede a la plataforma GYNARE para gestionar esta solicitud.</p>
            </div>
          </div>
        </div>
      `
    });
    console.log('📧 Notificación enviada a lucero.vaca@hotmail.com');
  } catch(e) {
    console.error('⚠ Error enviando correo:', e.message);
  }
}

// POST /api/publica/agendar — desde la landing page
router.post('/agendar', async (req, res) => {
  const { nombre, email, telefono, fecha, hora, motivo, es_primera_vez } = req.body;

  if (!nombre || !telefono || !fecha || !hora) {
    return res.status(400).json({ error: 'Nombre, teléfono, fecha y hora son requeridos' });
  }

  const hoy = new Date().toISOString().split('T')[0];
  if (fecha < hoy) return res.status(400).json({ error: 'La fecha no puede ser en el pasado' });

  const ocupada = db.prepare(`SELECT id FROM citas WHERE fecha = ? AND hora = ? AND estado != 'cancelada'`).get(fecha, hora);
  if (ocupada) return res.status(409).json({ error: 'El horario seleccionado ya no está disponible. Por favor elige otro.' });

  const result = db.prepare(`
    INSERT INTO citas (web_nombre, web_email, web_telefono, web_motivo, web_es_primera_vez, fecha, hora, tipo, motivo, origen, estado)
    VALUES (?,?,?,?,?,?,?,?,?,'web','pendiente')
  `).run(nombre, email||null, telefono, motivo||null, es_primera_vez ? 1 : 0, fecha, hora, es_primera_vez ? 'primera_vez' : 'seguimiento', motivo||null);

  // Enviar notificación por correo (asíncrono, no bloquea la respuesta)
  enviarNotificacion({ nombre, email, telefono, fecha, hora, motivo, es_primera_vez }).catch(() => {});

  res.status(201).json({
    mensaje: '¡Tu solicitud fue recibida! Te contactaremos para confirmar tu cita.',
    id: result.lastInsertRowid
  });
});

// GET /api/publica/disponibilidad?fecha=YYYY-MM-DD
router.get('/disponibilidad', (req, res) => {
  const { fecha } = req.query;
  if (!fecha) return res.status(400).json({ error: 'fecha requerida' });

  const ocupados = db.prepare(`SELECT hora FROM citas WHERE fecha = ? AND estado != 'cancelada'`).all(fecha).map(c => c.hora);

  const fecha_obj = new Date(fecha + 'T12:00:00');
  const dia = fecha_obj.getDay();

  let slots = [];
  if (dia === 0) {
    slots = [];
  } else if (dia === 6) {
    slots = ['10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30'];
  } else {
    slots = ['10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30',
             '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'];
  }

  const disponibles = slots.filter(s => !ocupados.includes(s));
  res.json({ fecha, disponibles, ocupados });
});

module.exports = router;
