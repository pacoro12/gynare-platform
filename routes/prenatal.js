const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/prenatal/paciente/:pid — embarazos de una paciente
router.get('/paciente/:pid', (req, res) => {
  const embarazos = db.prepare(`
    SELECT e.*, p.nombre, p.apellido_paterno
    FROM embarazos e
    JOIN pacientes p ON e.paciente_id = p.id
    WHERE e.paciente_id = ?
    ORDER BY e.created_at DESC
  `).all(req.params.pid);

  const result = embarazos.map(e => {
    const controles = db.prepare(`
      SELECT * FROM controles_prenatales WHERE embarazo_id = ? ORDER BY fecha DESC
    `).all(e.id);
    return { ...e, controles };
  });

  res.json(result);
});

// GET /api/prenatal/activos — todos los embarazos activos
router.get('/activos', (req, res) => {
  const rows = db.prepare(`
    SELECT e.*, p.nombre, p.apellido_paterno, p.apellido_materno, p.telefono,
      (SELECT MAX(cp.semanas) FROM controles_prenatales cp WHERE cp.embarazo_id = e.id) as semanas_actuales,
      (SELECT COUNT(*) FROM controles_prenatales cp WHERE cp.embarazo_id = e.id) as num_controles
    FROM embarazos e
    JOIN pacientes p ON e.paciente_id = p.id
    WHERE e.estado = 'activo'
    ORDER BY e.fpp
  `).all();
  res.json(rows);
});

// GET /api/prenatal/:id — detalle de embarazo
router.get('/:id', (req, res) => {
  const e = db.prepare(`
    SELECT e.*, p.nombre, p.apellido_paterno, p.apellido_materno, p.telefono,
      p.fecha_nacimiento, p.tipo_sangre, p.alergias
    FROM embarazos e JOIN pacientes p ON e.paciente_id = p.id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Embarazo no encontrado' });

  const controles = db.prepare(`
    SELECT * FROM controles_prenatales WHERE embarazo_id = ? ORDER BY fecha ASC
  `).all(req.params.id);

  res.json({ ...e, controles });
});

// POST /api/prenatal — nuevo embarazo
router.post('/', (req, res) => {
  const { paciente_id, fum, tipo_embarazo, semanas_al_ingresar, notas } = req.body;
  if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });

  // Calcular FPP (Naegele: FUM + 280 días)
  let fpp = null;
  if (fum) {
    const d = new Date(fum + 'T12:00:00');
    d.setDate(d.getDate() + 280);
    fpp = d.toISOString().split('T')[0];
  }

  const r = db.prepare(`
    INSERT INTO embarazos (paciente_id, fum, fpp, tipo_embarazo, semanas_al_ingresar, notas)
    VALUES (?,?,?,?,?,?)
  `).run(paciente_id, fum||null, fpp, tipo_embarazo||'único', semanas_al_ingresar||null, notas||null);

  res.status(201).json({ id: r.lastInsertRowid, fpp, mensaje: 'Embarazo registrado' });
});

// PUT /api/prenatal/:id — actualizar embarazo
router.put('/:id', (req, res) => {
  const e = db.prepare('SELECT id FROM embarazos WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'No encontrado' });

  const fields = Object.keys(req.body).filter(k => k !== 'id');
  if (!fields.length) return res.status(400).json({ error: 'Sin datos' });

  const sets = fields.map(f => `${f} = ?`).join(', ');
  db.prepare(`UPDATE embarazos SET ${sets} WHERE id = ?`)
    .run(...fields.map(f => req.body[f]), req.params.id);

  res.json({ mensaje: 'Actualizado' });
});

// POST /api/prenatal/:id/controles — nuevo control prenatal
router.post('/:id/controles', (req, res) => {
  const e = db.prepare('SELECT id, paciente_id FROM embarazos WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Embarazo no encontrado' });

  const {
    fecha, semanas, peso, tension_arterial, fcm, fcf,
    altura_uterina, presentacion, movimientos_fetales, edema,
    proteinas, hemoglobina, glucemia, ultrasonido, laboratorios,
    diagnostico, plan, proxima_cita, notas
  } = req.body;

  if (!fecha) return res.status(400).json({ error: 'Fecha requerida' });

  const r = db.prepare(`
    INSERT INTO controles_prenatales (
      embarazo_id, paciente_id, fecha, semanas, peso, tension_arterial, fcm, fcf,
      altura_uterina, presentacion, movimientos_fetales, edema, proteinas,
      hemoglobina, glucemia, ultrasonido, laboratorios, diagnostico, plan, proxima_cita, notas
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    e.id, e.paciente_id, fecha, semanas||null, peso||null, tension_arterial||null,
    fcm||null, fcf||null, altura_uterina||null, presentacion||null,
    movimientos_fetales||null, edema||null, proteinas||null,
    hemoglobina||null, glucemia||null, ultrasonido||null, laboratorios||null,
    diagnostico||null, plan||null, proxima_cita||null, notas||null
  );

  res.status(201).json({ id: r.lastInsertRowid, mensaje: 'Control registrado' });
});

// PUT /api/prenatal/controles/:id — editar control
router.put('/controles/:id', (req, res) => {
  const fields = Object.keys(req.body).filter(k => k !== 'id');
  if (!fields.length) return res.status(400).json({ error: 'Sin datos' });
  const sets = fields.map(f => `${f} = ?`).join(', ');
  db.prepare(`UPDATE controles_prenatales SET ${sets} WHERE id = ?`)
    .run(...fields.map(f => req.body[f]), req.params.id);
  res.json({ mensaje: 'Control actualizado' });
});

module.exports = router;
