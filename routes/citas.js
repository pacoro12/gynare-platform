const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/citas — filtros: fecha, estado, origen
router.get('/', (req, res) => {
  const { fecha, semana, estado, origen } = req.query;
  let query = `
    SELECT c.*, p.nombre, p.apellido_paterno, p.apellido_materno, p.telefono as p_telefono
    FROM citas c
    LEFT JOIN pacientes p ON c.paciente_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (fecha) { query += ` AND c.fecha = ?`; params.push(fecha); }
  if (semana) {
    query += ` AND c.fecha BETWEEN ? AND date(?, '+6 days')`;
    params.push(semana, semana);
  }
  if (estado) { query += ` AND c.estado = ?`; params.push(estado); }
  if (origen) { query += ` AND c.origen = ?`; params.push(origen); }

  query += ` ORDER BY c.fecha, c.hora`;

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// GET /api/citas/solicitudes-web
router.get('/solicitudes-web', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM citas WHERE origen = 'web' AND estado = 'pendiente'
    ORDER BY created_at DESC
  `).all();
  res.json(rows);
});

// GET /api/citas/:id
router.get('/:id', (req, res) => {
  const cita = db.prepare(`
    SELECT c.*, p.nombre, p.apellido_paterno, p.apellido_materno, p.telefono as p_telefono, p.email as p_email
    FROM citas c LEFT JOIN pacientes p ON c.paciente_id = p.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
  res.json(cita);
});

// POST /api/citas
router.post('/', (req, res) => {
  const { paciente_id, fecha, hora, tipo, motivo, duracion_min, notas_internas, web_nombre, web_email, web_telefono } = req.body;
  if (!fecha || !hora) return res.status(400).json({ error: 'Fecha y hora requeridas' });

  // Verificar conflicto de horario
  const conflicto = db.prepare(`
    SELECT id FROM citas WHERE fecha = ? AND hora = ? AND estado != 'cancelada'
  `).get(fecha, hora);
  if (conflicto) return res.status(409).json({ error: 'Ya existe una cita en ese horario' });

  const result = db.prepare(`
    INSERT INTO citas (paciente_id, fecha, hora, tipo, motivo, duracion_min, notas_internas, origen, usuario_id, web_nombre, web_email, web_telefono)
    VALUES (?,?,?,?,?,?,?,'plataforma',?,?,?,?)
  `).run(paciente_id||null, fecha, hora, tipo||'primera_vez', motivo||null, duracion_min||30, notas_internas||null, req.user.id, web_nombre||null, web_email||null, web_telefono||null);

  res.status(201).json({ id: result.lastInsertRowid, mensaje: 'Cita creada' });
});

// PUT /api/citas/:id
router.put('/:id', (req, res) => {
  const cita = db.prepare('SELECT id FROM citas WHERE id = ?').get(req.params.id);
  if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });

  const fields = Object.keys(req.body).filter(k => k !== 'id');
  if (!fields.length) return res.status(400).json({ error: 'Sin datos' });

  const sets = fields.map(f => `${f} = ?`).join(', ');
  db.prepare(`UPDATE citas SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(...fields.map(f => req.body[f]), req.params.id);

  res.json({ mensaje: 'Cita actualizada' });
});

// POST /api/citas/:id/confirmar
router.post('/:id/confirmar', (req, res) => {
  const { paciente_id } = req.body;
  db.prepare(`UPDATE citas SET estado = 'confirmada', paciente_id = COALESCE(?, paciente_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(paciente_id||null, req.params.id);
  res.json({ mensaje: 'Cita confirmada' });
});

// POST /api/citas/:id/cancelar
router.post('/:id/cancelar', (req, res) => {
  db.prepare(`UPDATE citas SET estado = 'cancelada', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(req.params.id);
  res.json({ mensaje: 'Cita cancelada' });
});

module.exports = router;
