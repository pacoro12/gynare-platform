const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/cobros — lista con filtros
router.get('/', (req, res) => {
  const { paciente_id, mes, metodo, estado } = req.query;
  let q = `
    SELECT c.*, p.nombre, p.apellido_paterno, p.apellido_materno
    FROM cobros c LEFT JOIN pacientes p ON c.paciente_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (paciente_id) { q += ` AND c.paciente_id = ?`; params.push(paciente_id); }
  if (mes) { q += ` AND strftime('%Y-%m', c.fecha) = ?`; params.push(mes); }
  if (metodo) { q += ` AND c.metodo_pago = ?`; params.push(metodo); }
  if (estado) { q += ` AND c.estado = ?`; params.push(estado); }
  q += ` ORDER BY c.fecha DESC, c.created_at DESC LIMIT 100`;

  res.json(db.prepare(q).all(...params));
});

// GET /api/cobros/stats — resumen financiero
router.get('/stats', (req, res) => {
  const mesActual = new Date().toISOString().slice(0, 7);
  const mesAnterior = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  const totalMes = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) as total, COUNT(*) as num
    FROM cobros WHERE strftime('%Y-%m', fecha) = ? AND estado = 'pagado'
  `).get(mesActual);

  const totalMesAnterior = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) as total FROM cobros
    WHERE strftime('%Y-%m', fecha) = ? AND estado = 'pagado'
  `).get(mesAnterior);

  const totalHoy = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) as total FROM cobros
    WHERE fecha = date('now') AND estado = 'pagado'
  `).get();

  const pendientes = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) as total, COUNT(*) as num
    FROM cobros WHERE estado = 'pendiente'
  `).get();

  const porMetodo = db.prepare(`
    SELECT metodo_pago, COALESCE(SUM(monto), 0) as total, COUNT(*) as num
    FROM cobros WHERE strftime('%Y-%m', fecha) = ? AND estado = 'pagado'
    GROUP BY metodo_pago
  `).all(mesActual);

  res.json({
    totalMes: totalMes.total,
    numCobrosM: totalMes.num,
    totalMesAnterior: totalMesAnterior.total,
    totalHoy: totalHoy.total,
    pendientesMonto: pendientes.total,
    pendientesNum: pendientes.num,
    porMetodo
  });
});

// GET /api/cobros/mensual — datos para gráfica 12 meses
router.get('/mensual', (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', fecha) as mes,
      COALESCE(SUM(monto), 0) as total,
      COUNT(*) as num
    FROM cobros WHERE estado = 'pagado'
      AND fecha >= date('now', '-11 months', 'start of month')
    GROUP BY mes ORDER BY mes
  `).all();
  res.json(rows);
});

// POST /api/cobros — registrar pago
router.post('/', (req, res) => {
  const { paciente_id, consulta_id, concepto, monto, metodo_pago, fecha, estado, notas } = req.body;
  if (!concepto || !monto) return res.status(400).json({ error: 'Concepto y monto requeridos' });

  // Generar folio
  const count = db.prepare('SELECT COUNT(*) as c FROM cobros').get().c;
  const folio = `GYN-${String(count + 1).padStart(5, '0')}`;

  const r = db.prepare(`
    INSERT INTO cobros (paciente_id, consulta_id, usuario_id, concepto, monto, metodo_pago, fecha, estado, folio, notas)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    paciente_id||null, consulta_id||null, req.user.id,
    concepto, Number(monto), metodo_pago||'efectivo',
    fecha||new Date().toISOString().split('T')[0],
    estado||'pagado', folio, notas||null
  );

  res.status(201).json({ id: r.lastInsertRowid, folio, mensaje: 'Cobro registrado' });
});

// PUT /api/cobros/:id
router.put('/:id', (req, res) => {
  const c = db.prepare('SELECT id FROM cobros WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'No encontrado' });
  const fields = Object.keys(req.body).filter(k => k !== 'id');
  if (!fields.length) return res.status(400).json({ error: 'Sin datos' });
  const sets = fields.map(f => `${f} = ?`).join(', ');
  db.prepare(`UPDATE cobros SET ${sets} WHERE id = ?`).run(...fields.map(f => req.body[f]), req.params.id);
  res.json({ mensaje: 'Cobro actualizado' });
});

// DELETE /api/cobros/:id — cancelar
router.delete('/:id', (req, res) => {
  db.prepare(`UPDATE cobros SET estado = 'cancelado' WHERE id = ?`).run(req.params.id);
  res.json({ mensaje: 'Cobro cancelado' });
});

module.exports = router;
