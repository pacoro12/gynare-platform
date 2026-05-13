const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/recordatorios — lista con filtros
router.get('/', (req, res) => {
  const { estado, tipo, paciente_id } = req.query;
  let q = `
    SELECT r.*, p.nombre, p.apellido_paterno, p.apellido_materno, p.telefono, p.email
    FROM recordatorios r JOIN pacientes p ON r.paciente_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { q += ` AND r.estado = ?`; params.push(estado); }
  if (tipo) { q += ` AND r.tipo = ?`; params.push(tipo); }
  if (paciente_id) { q += ` AND r.paciente_id = ?`; params.push(paciente_id); }
  q += ` ORDER BY r.fecha_programada ASC LIMIT 200`;
  res.json(db.prepare(q).all(...params));
});

// GET /api/recordatorios/count — para badge en sidebar
router.get('/count', (req, res) => {
  const hoy = new Date().toISOString().split('T')[0];
  const pendientes = db.prepare(`
    SELECT COUNT(*) as c FROM recordatorios
    WHERE estado = 'pendiente' AND fecha_programada <= date('now', '+30 days')
  `).get().c;
  const vencidos = db.prepare(`
    SELECT COUNT(*) as c FROM recordatorios
    WHERE estado = 'pendiente' AND fecha_programada < ?
  `).get(hoy).c;
  res.json({ pendientes, vencidos });
});

// POST /api/recordatorios — crear recordatorio
router.post('/', (req, res) => {
  const { paciente_id, tipo, descripcion, fecha_programada, notas } = req.body;
  if (!paciente_id || !tipo || !fecha_programada) {
    return res.status(400).json({ error: 'paciente_id, tipo y fecha_programada requeridos' });
  }
  const r = db.prepare(`
    INSERT INTO recordatorios (paciente_id, tipo, descripcion, fecha_programada, notas)
    VALUES (?,?,?,?,?)
  `).run(paciente_id, tipo, descripcion||null, fecha_programada, notas||null);
  res.status(201).json({ id: r.lastInsertRowid, mensaje: 'Recordatorio creado' });
});

// PUT /api/recordatorios/:id
router.put('/:id', (req, res) => {
  const fields = Object.keys(req.body).filter(k => k !== 'id');
  if (!fields.length) return res.status(400).json({ error: 'Sin datos' });
  const sets = fields.map(f => `${f} = ?`).join(', ');
  db.prepare(`UPDATE recordatorios SET ${sets} WHERE id = ?`)
    .run(...fields.map(f => req.body[f]), req.params.id);
  res.json({ mensaje: 'Actualizado' });
});

// POST /api/recordatorios/auto — generar recordatorios automáticos desde pacientes
// Lee todas las pacientes con PAP/colpo vencidos y crea recordatorios si no existen
router.post('/auto', (req, res) => {
  const hoy = new Date().toISOString().split('T')[0];
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - 1);
  const hace1Year = limite.toISOString().split('T')[0];

  let creados = 0;

  // PAP vencido (>1 año) o nunca hecho
  const sinPap = db.prepare(`
    SELECT id, nombre, apellido_paterno, ultimo_papanicolau FROM pacientes
    WHERE activo = 1
    AND (ultimo_papanicolau IS NULL OR ultimo_papanicolau < ?)
    AND NOT EXISTS (
      SELECT 1 FROM recordatorios WHERE paciente_id = pacientes.id
      AND tipo = 'pap' AND estado = 'pendiente'
    )
  `).all(hace1Year);

  for (const p of sinPap) {
    const fechaRec = new Date();
    fechaRec.setDate(fechaRec.getDate() + 7);
    db.prepare(`
      INSERT INTO recordatorios (paciente_id, tipo, descripcion, fecha_programada)
      VALUES (?,?,?,?)
    `).run(p.id, 'pap',
      p.ultimo_papanicolau
        ? `Último Pap: ${p.ultimo_papanicolau} — requiere actualización`
        : 'Sin Papanicolaou registrado — programar',
      fechaRec.toISOString().split('T')[0]
    );
    creados++;
  }

  // Colposcopia vencida (>1 año)
  const sinColpo = db.prepare(`
    SELECT id, nombre, apellido_paterno, ultima_colposcopia FROM pacientes
    WHERE activo = 1
    AND ultima_colposcopia IS NOT NULL AND ultima_colposcopia < ?
    AND NOT EXISTS (
      SELECT 1 FROM recordatorios WHERE paciente_id = pacientes.id
      AND tipo = 'colposcopia' AND estado = 'pendiente'
    )
  `).all(hace1Year);

  for (const p of sinColpo) {
    const fechaRec = new Date();
    fechaRec.setDate(fechaRec.getDate() + 7);
    db.prepare(`
      INSERT INTO recordatorios (paciente_id, tipo, descripcion, fecha_programada)
      VALUES (?,?,?,?)
    `).run(p.id, 'colposcopia',
      `Última colposcopía: ${p.ultima_colposcopia} — requiere actualización`,
      fechaRec.toISOString().split('T')[0]
    );
    creados++;
  }

  res.json({ creados, mensaje: `${creados} recordatorios generados` });
});

module.exports = router;
