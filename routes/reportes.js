const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/reportes/resumen — stats globales
router.get('/resumen', (req, res) => {
  const totalPacientes = db.prepare('SELECT COUNT(*) as c FROM pacientes WHERE activo = 1').get().c;
  const totalConsultas = db.prepare('SELECT COUNT(*) as c FROM consultas').get().c;
  const totalRecetas = db.prepare('SELECT COUNT(*) as c FROM recetas').get().c;
  const totalEmbarazos = db.prepare(`SELECT COUNT(*) as c FROM embarazos WHERE estado = 'activo'`).get().c;
  const totalIngresos = db.prepare(`SELECT COALESCE(SUM(monto), 0) as t FROM cobros WHERE estado = 'pagado'`).get().t;
  const ingresosMes = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) as t FROM cobros
    WHERE estado = 'pagado' AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')
  `).get().t;
  const recordatoriosVencidos = db.prepare(`
    SELECT COUNT(*) as c FROM recordatorios
    WHERE estado = 'pendiente' AND fecha_programada < date('now')
  `).get().c;

  res.json({
    totalPacientes, totalConsultas, totalRecetas, totalEmbarazos,
    totalIngresos, ingresosMes, recordatoriosVencidos
  });
});

// GET /api/reportes/pacientes-mensual — nuevas pacientes por mes (12 meses)
router.get('/pacientes-mensual', (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as mes, COUNT(*) as total
    FROM pacientes WHERE activo = 1
      AND created_at >= date('now', '-11 months', 'start of month')
    GROUP BY mes ORDER BY mes
  `).all();
  res.json(rows);
});

// GET /api/reportes/citas-mensual — citas por mes (12 meses)
router.get('/citas-mensual', (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', fecha) as mes, COUNT(*) as total
    FROM citas WHERE estado != 'cancelada'
      AND fecha >= date('now', '-11 months', 'start of month')
    GROUP BY mes ORDER BY mes
  `).all();
  res.json(rows);
});

// GET /api/reportes/citas-tipo — distribución por tipo
router.get('/citas-tipo', (req, res) => {
  const rows = db.prepare(`
    SELECT tipo, COUNT(*) as total FROM citas
    WHERE estado != 'cancelada'
    GROUP BY tipo ORDER BY total DESC
  `).all();
  res.json(rows);
});

// GET /api/reportes/ingresos-mensual — ingresos por mes (12 meses)
router.get('/ingresos-mensual', (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', fecha) as mes, COALESCE(SUM(monto), 0) as total
    FROM cobros WHERE estado = 'pagado'
      AND fecha >= date('now', '-11 months', 'start of month')
    GROUP BY mes ORDER BY mes
  `).all();
  res.json(rows);
});

// GET /api/reportes/diagnosticos — diagnósticos más frecuentes
router.get('/diagnosticos', (req, res) => {
  const rows = db.prepare(`
    SELECT diagnostico_principal as diagnostico, COUNT(*) as total
    FROM consultas WHERE diagnostico_principal IS NOT NULL AND diagnostico_principal != ''
    GROUP BY diagnostico_principal ORDER BY total DESC LIMIT 10
  `).all();
  res.json(rows);
});

// GET /api/reportes/origen-pacientes — cómo llegaron
router.get('/origen-pacientes', (req, res) => {
  const rows = db.prepare(`
    SELECT como_nos_conocio as origen, COUNT(*) as total
    FROM pacientes WHERE activo = 1 AND como_nos_conocio IS NOT NULL
    GROUP BY como_nos_conocio ORDER BY total DESC
  `).all();
  res.json(rows);
});

module.exports = router;
