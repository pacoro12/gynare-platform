const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/pacientes — lista con búsqueda
router.get('/', (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let rows, total;

  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(`
      SELECT id, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, edad, telefono, email, created_at
      FROM pacientes WHERE activo = 1
        AND (nombre LIKE ? OR apellido_paterno LIKE ? OR apellido_materno LIKE ? OR telefono LIKE ? OR email LIKE ?)
      ORDER BY apellido_paterno, nombre
      LIMIT ? OFFSET ?
    `).all(like, like, like, like, like, Number(limit), offset);
    total = db.prepare(`
      SELECT COUNT(*) as c FROM pacientes WHERE activo = 1
        AND (nombre LIKE ? OR apellido_paterno LIKE ? OR apellido_materno LIKE ? OR telefono LIKE ? OR email LIKE ?)
    `).get(like, like, like, like, like).c;
  } else {
    rows = db.prepare(`
      SELECT id, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, edad, telefono, email, created_at
      FROM pacientes WHERE activo = 1
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(Number(limit), offset);
    total = db.prepare('SELECT COUNT(*) as c FROM pacientes WHERE activo = 1').get().c;
  }

  res.json({ pacientes: rows, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/pacientes/stats
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM pacientes WHERE activo = 1').get().c;
  const mes = db.prepare(`SELECT COUNT(*) as c FROM pacientes WHERE activo = 1 AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`).get().c;
  const citasHoy = db.prepare(`SELECT COUNT(*) as c FROM citas WHERE fecha = date('now') AND estado != 'cancelada'`).get().c;
  const citasSemana = db.prepare(`SELECT COUNT(*) as c FROM citas WHERE fecha BETWEEN date('now') AND date('now','+7 days') AND estado != 'cancelada'`).get().c;
  const solicitudesWeb = db.prepare(`SELECT COUNT(*) as c FROM citas WHERE origen = 'web' AND estado = 'pendiente'`).get().c;
  const embarazosActivos = db.prepare(`SELECT COUNT(*) as c FROM embarazos WHERE estado = 'activo'`).get().c;
  const recordatoriosVencidos = db.prepare(`SELECT COUNT(*) as c FROM recordatorios WHERE estado = 'pendiente' AND fecha_programada < date('now')`).get().c;

  res.json({ total, mes, citasHoy, citasSemana, solicitudesWeb, embarazosActivos, recordatoriosVencidos });
});

// GET /api/pacientes/:id
router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM pacientes WHERE id = ? AND activo = 1').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });

  // Últimas consultas
  const consultas = db.prepare(`
    SELECT id, fecha, motivo_consulta, diagnostico_principal, created_at
    FROM consultas WHERE paciente_id = ? ORDER BY fecha DESC LIMIT 10
  `).all(req.params.id);

  // Próximas citas
  const citas = db.prepare(`
    SELECT * FROM citas WHERE paciente_id = ? AND fecha >= date('now') AND estado != 'cancelada'
    ORDER BY fecha, hora LIMIT 5
  `).all(req.params.id);

  // Recetas recientes
  const recetas = db.prepare(`
    SELECT id, fecha, diagnostico, created_at FROM recetas WHERE paciente_id = ? ORDER BY fecha DESC LIMIT 5
  `).all(req.params.id);

  res.json({ ...p, consultas, citas, recetas });
});

// POST /api/pacientes
router.post('/', (req, res) => {
  const {
    nombre, apellido_paterno, apellido_materno, fecha_nacimiento, edad, telefono, email,
    ocupacion, estado_civil, direccion, ciudad, estado, alergias, tipo_sangre,
    antecedentes_heredofamiliares, antecedentes_personales_patologicos,
    antecedentes_personales_no_patologicos, antecedentes_quirurgicos,
    menarca, ritmo_menstrual, dismenorrea, fum, gestas, partos, cesareas, abortos, vivos,
    metodo_anticonceptivo, inicio_vida_sexual, num_parejas_sexuales,
    ultima_colposcopia, resultado_colposcopia, ultimo_papanicolau, resultado_papanicolau,
    vacuna_vph, notas_adicionales, como_nos_conocio
  } = req.body;

  if (!nombre || !apellido_paterno) return res.status(400).json({ error: 'Nombre y apellido requeridos' });

  const stmt = db.prepare(`
    INSERT INTO pacientes (
      nombre, apellido_paterno, apellido_materno, fecha_nacimiento, edad, telefono, email,
      ocupacion, estado_civil, direccion, ciudad, estado, alergias, tipo_sangre,
      antecedentes_heredofamiliares, antecedentes_personales_patologicos,
      antecedentes_personales_no_patologicos, antecedentes_quirurgicos,
      menarca, ritmo_menstrual, dismenorrea, fum, gestas, partos, cesareas, abortos, vivos,
      metodo_anticonceptivo, inicio_vida_sexual, num_parejas_sexuales,
      ultima_colposcopia, resultado_colposcopia, ultimo_papanicolau, resultado_papanicolau,
      vacuna_vph, notas_adicionales, como_nos_conocio
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const result = stmt.run(
    nombre, apellido_paterno, apellido_materno||null, fecha_nacimiento||null, edad||null,
    telefono||null, email||null, ocupacion||null, estado_civil||null, direccion||null,
    ciudad||'Guadalajara', estado||'Jalisco', alergias||null, tipo_sangre||null,
    antecedentes_heredofamiliares||null, antecedentes_personales_patologicos||null,
    antecedentes_personales_no_patologicos||null, antecedentes_quirurgicos||null,
    menarca||null, ritmo_menstrual||null, dismenorrea||0, fum||null,
    gestas||0, partos||0, cesareas||0, abortos||0, vivos||0,
    metodo_anticonceptivo||null, inicio_vida_sexual||null, num_parejas_sexuales||null,
    ultima_colposcopia||null, resultado_colposcopia||null,
    ultimo_papanicolau||null, resultado_papanicolau||null,
    vacuna_vph||0, notas_adicionales||null, como_nos_conocio||null
  );

  res.status(201).json({ id: result.lastInsertRowid, mensaje: 'Paciente registrado' });
});

// PUT /api/pacientes/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM pacientes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Paciente no encontrado' });

  const fields = Object.keys(req.body).filter(k => k !== 'id');
  if (!fields.length) return res.status(400).json({ error: 'Sin datos para actualizar' });

  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => req.body[f]);
  db.prepare(`UPDATE pacientes SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);

  res.json({ mensaje: 'Paciente actualizado' });
});

// DELETE /api/pacientes/:id (soft delete)
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE pacientes SET activo = 0 WHERE id = ?').run(req.params.id);
  res.json({ mensaje: 'Paciente eliminado' });
});

module.exports = router;
