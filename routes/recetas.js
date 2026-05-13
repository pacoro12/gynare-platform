const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { authMiddleware } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

router.use(authMiddleware);

// GET /api/recetas?paciente_id=X
router.get('/', (req, res) => {
  const { paciente_id } = req.query;
  if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });

  const rows = db.prepare(`
    SELECT r.*, u.nombre as medico
    FROM recetas r
    LEFT JOIN usuarios u ON r.usuario_id = u.id
    WHERE r.paciente_id = ?
    ORDER BY r.fecha DESC
  `).all(paciente_id);

  res.json(rows);
});

// GET /api/recetas/:id
router.get('/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM recetas WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Receta no encontrada' });
  res.json(r);
});

// POST /api/recetas
router.post('/', (req, res) => {
  const { paciente_id, consulta_id, fecha, diagnostico, medicamentos, indicaciones_generales } = req.body;
  if (!paciente_id || !medicamentos) return res.status(400).json({ error: 'Datos incompletos' });

  const med = typeof medicamentos === 'string' ? medicamentos : JSON.stringify(medicamentos);

  const result = db.prepare(`
    INSERT INTO recetas (paciente_id, consulta_id, usuario_id, fecha, diagnostico, medicamentos, indicaciones_generales)
    VALUES (?,?,?,?,?,?,?)
  `).run(paciente_id, consulta_id||null, req.user.id, fecha||new Date().toISOString().split('T')[0], diagnostico||null, med, indicaciones_generales||null);

  res.status(201).json({ id: result.lastInsertRowid, mensaje: 'Receta guardada' });
});

// GET /api/recetas/:id/pdf — genera y descarga PDF
router.get('/:id/pdf', (req, res) => {
  const receta = db.prepare('SELECT * FROM recetas WHERE id = ?').get(req.params.id);
  if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });

  const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(receta.paciente_id);
  const medico = db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(receta.usuario_id);

  let medicamentos = [];
  try { medicamentos = JSON.parse(receta.medicamentos); }
  catch { medicamentos = [{ nombre: receta.medicamentos, dosis: '', instrucciones: '' }]; }

  const doc = new PDFDocument({ size: 'letter', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="receta-${receta.id}.pdf"`);
  doc.pipe(res);

  // --- ENCABEZADO ---
  const PLUM = '#4B1040';
  const ROSE = '#C4A0B8';

  // Franja superior morada
  doc.rect(0, 0, doc.page.width, 100).fill(PLUM);

  // Logo/título
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
     .text('GYNARE', 50, 20, { align: 'center' });
  doc.fontSize(10).font('Helvetica')
     .text('CLÍNICA DE LA MUJER', 50, 46, { align: 'center' });
  doc.fontSize(9)
     .text('Dra. Lucero Vaca · Ginecología y Obstetricia', 50, 62, { align: 'center' })
     .text('Cédula Profesional: [CEDULA] · CEsp: [CEDESP]', 50, 76, { align: 'center' });

  doc.fillColor(PLUM).fontSize(14).font('Helvetica-Bold')
     .text('RECETA MÉDICA', 50, 115, { align: 'center' });

  // Línea decorativa
  doc.moveTo(50, 135).lineTo(doc.page.width - 50, 135).strokeColor(ROSE).lineWidth(1.5).stroke();

  // Datos del paciente
  doc.fillColor('#333').fontSize(10).font('Helvetica-Bold').text('PACIENTE:', 50, 150);
  doc.font('Helvetica').text(`${paciente?.nombre || ''} ${paciente?.apellido_paterno || ''} ${paciente?.apellido_materno || ''}`, 120, 150);
  doc.font('Helvetica-Bold').text('FECHA:', 380, 150);
  doc.font('Helvetica').text(receta.fecha, 420, 150);

  if (paciente?.fecha_nacimiento) {
    doc.font('Helvetica-Bold').text('FECHA NAC:', 50, 165);
    doc.font('Helvetica').text(paciente.fecha_nacimiento, 130, 165);
  }
  if (paciente?.alergias) {
    doc.font('Helvetica-Bold').fillColor('#c0392b').text('ALERGIAS:', 50, 180);
    doc.font('Helvetica').fillColor('#c0392b').text(paciente.alergias, 120, 180);
  }

  if (receta.diagnostico) {
    doc.fillColor('#333').font('Helvetica-Bold').text('Dx:', 50, 200);
    doc.font('Helvetica').text(receta.diagnostico, 80, 200, { width: 460 });
  }

  // Línea separadora
  doc.moveTo(50, 225).lineTo(doc.page.width - 50, 225).strokeColor('#ddd').lineWidth(0.5).stroke();

  // Medicamentos - ℞ símbolo
  doc.fillColor(PLUM).fontSize(28).font('Helvetica-Bold').text('℞', 50, 235);
  doc.fillColor('#333').fontSize(11);

  let y = 240;
  medicamentos.forEach((med, i) => {
    const nombre = med.nombre || med;
    const dosis = med.dosis || '';
    const instrucciones = med.instrucciones || '';
    const cantidad = med.cantidad || '';

    doc.font('Helvetica-Bold').fontSize(11).text(`${i + 1}. ${nombre}`, 80, y);
    y += 16;
    if (dosis) { doc.font('Helvetica').fontSize(10).text(`   Dosis: ${dosis}`, 80, y); y += 14; }
    if (instrucciones) { doc.font('Helvetica').fontSize(10).text(`   ${instrucciones}`, 80, y); y += 14; }
    if (cantidad) { doc.font('Helvetica').fontSize(10).text(`   Cantidad: ${cantidad}`, 80, y); y += 14; }
    y += 8;
  });

  if (receta.indicaciones_generales) {
    y += 10;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#ddd').lineWidth(0.5).stroke();
    y += 12;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(PLUM).text('INDICACIONES GENERALES:', 50, y);
    y += 15;
    doc.font('Helvetica').fillColor('#333').text(receta.indicaciones_generales, 50, y, { width: 460 });
  }

  // Firma
  const firmaY = doc.page.height - 130;
  doc.moveTo(doc.page.width/2 - 80, firmaY).lineTo(doc.page.width/2 + 80, firmaY).strokeColor(PLUM).lineWidth(1).stroke();
  doc.fillColor(PLUM).font('Helvetica-Bold').fontSize(10).text(medico?.nombre || 'Dra. Lucero Vaca', 50, firmaY + 5, { align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor('#555').text('Ginecología y Obstetricia', 50, firmaY + 18, { align: 'center' });

  // Footer
  doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(PLUM);
  doc.fillColor('white').fontSize(8).font('Helvetica')
     .text('Santa Edwiges · Guadalajara, Jalisco · Tel: [TELEFONO]', 50, doc.page.height - 27, { align: 'center' });

  doc.end();
});

module.exports = router;
