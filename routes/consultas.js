const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/consultas?paciente_id=X
router.get('/', (req, res) => {
  const { paciente_id } = req.query;
  if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });

  const rows = db.prepare(`
    SELECT c.*, u.nombre as medico
    FROM consultas c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    WHERE c.paciente_id = ?
    ORDER BY c.fecha DESC
  `).all(paciente_id);

  res.json(rows);
});

// GET /api/consultas/:id
router.get('/:id', (req, res) => {
  const c = db.prepare(`
    SELECT c.*, u.nombre as medico, p.nombre as p_nombre, p.apellido_paterno
    FROM consultas c
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    LEFT JOIN pacientes p ON c.paciente_id = p.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Consulta no encontrada' });
  res.json(c);
});

// POST /api/consultas
router.post('/', (req, res) => {
  const {
    paciente_id, cita_id, fecha,
    motivo_consulta, peso, talla, imc, tension_arterial, frecuencia_cardiaca,
    frecuencia_respiratoria, temperatura, saturacion_oxigeno,
    subjetivo, objetivo, exploracion_ginecologica,
    colposcopia_resultado, ultrasonido_resultado, estudios_laboratorio,
    diagnostico_principal, diagnosticos_secundarios, plan, indicaciones,
    proxima_cita_fecha, proxima_cita_instrucciones, notas
  } = req.body;

  if (!paciente_id || !fecha) return res.status(400).json({ error: 'paciente_id y fecha requeridos' });

  const imc_calc = peso && talla ? (peso / ((talla/100) * (talla/100))).toFixed(1) : imc;

  const result = db.prepare(`
    INSERT INTO consultas (
      paciente_id, cita_id, usuario_id, fecha,
      motivo_consulta, peso, talla, imc, tension_arterial, frecuencia_cardiaca,
      frecuencia_respiratoria, temperatura, saturacion_oxigeno,
      subjetivo, objetivo, exploracion_ginecologica,
      colposcopia_resultado, ultrasonido_resultado, estudios_laboratorio,
      diagnostico_principal, diagnosticos_secundarios, plan, indicaciones,
      proxima_cita_fecha, proxima_cita_instrucciones, notas
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    paciente_id, cita_id||null, req.user.id, fecha,
    motivo_consulta||null, peso||null, talla||null, imc_calc||null,
    tension_arterial||null, frecuencia_cardiaca||null, frecuencia_respiratoria||null,
    temperatura||null, saturacion_oxigeno||null,
    subjetivo||null, objetivo||null, exploracion_ginecologica||null,
    colposcopia_resultado||null, ultrasonido_resultado||null, estudios_laboratorio||null,
    diagnostico_principal||null, diagnosticos_secundarios||null, plan||null, indicaciones||null,
    proxima_cita_fecha||null, proxima_cita_instrucciones||null, notas||null
  );

  // Si viene con cita_id, marcarla como completada
  if (cita_id) {
    db.prepare(`UPDATE citas SET estado = 'completada' WHERE id = ?`).run(cita_id);
  }

  res.status(201).json({ id: result.lastInsertRowid, mensaje: 'Consulta guardada' });
});

// PUT /api/consultas/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM consultas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Consulta no encontrada' });

  const fields = Object.keys(req.body).filter(k => k !== 'id' && k !== 'paciente_id');
  if (!fields.length) return res.status(400).json({ error: 'Sin datos' });

  const sets = fields.map(f => `${f} = ?`).join(', ');
  db.prepare(`UPDATE consultas SET ${sets} WHERE id = ?`).run(...fields.map(f => req.body[f]), req.params.id);

  res.json({ mensaje: 'Consulta actualizada' });
});

module.exports = router;
