// Ruta temporal de seed para datos de demostración
// Llamar UNA VEZ: GET /api/seed-demo?key=GYNARE_SEED_2026
// Protegida por token para que no sea accesible al público

const express = require('express');
const router = express.Router();
const db = require('../database/init');

const SEED_KEY = 'GYNARE_SEED_2026';

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function diasAdelante(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function calcFpp(fum) {
  const d = new Date(fum + 'T00:00:00');
  d.setDate(d.getDate() + 280);
  return d.toISOString().split('T')[0];
}

router.get('/', (req, res) => {
  if (req.query.key !== SEED_KEY) {
    return res.status(403).json({ error: 'Clave incorrecta' });
  }

  // Limpiar pacientes de prueba existentes
  const existentes = db.prepare(`SELECT id FROM pacientes WHERE apellido_paterno = 'PRUEBA'`).all();
  for (const p of existentes) {
    const id = p.id;
    db.prepare(`DELETE FROM recordatorios WHERE paciente_id = ?`).run(id);
    db.prepare(`DELETE FROM cobros WHERE paciente_id = ?`).run(id);
    const embs = db.prepare(`SELECT id FROM embarazos WHERE paciente_id = ?`).all(id);
    for (const e of embs) {
      db.prepare(`DELETE FROM controles_prenatales WHERE embarazo_id = ?`).run(e.id);
    }
    db.prepare(`DELETE FROM embarazos WHERE paciente_id = ?`).run(id);
    db.prepare(`DELETE FROM recetas WHERE paciente_id = ?`).run(id);
    db.prepare(`DELETE FROM consultas WHERE paciente_id = ?`).run(id);
    db.prepare(`DELETE FROM citas WHERE paciente_id = ?`).run(id);
    db.prepare(`DELETE FROM pacientes WHERE id = ?`).run(id);
  }

  // Folio para cobros
  let folioCount = 0;
  const ultimoCobro = db.prepare(`SELECT folio FROM cobros ORDER BY id DESC LIMIT 1`).get();
  if (ultimoCobro && ultimoCobro.folio) {
    folioCount = parseInt(ultimoCobro.folio.replace('GYN-', ''), 10) || 0;
  }
  function folio() {
    folioCount++;
    return `GYN-${String(folioCount).padStart(5, '0')}`;
  }

  const docUser = db.prepare(`SELECT id FROM usuarios WHERE rol = 'doctor' LIMIT 1`).get();
  const uid = docUser ? docUser.id : 1;

  const ids = [];

  // ── PACIENTE 1 ── María PRUEBA González (32 años) ────────────────────────────
  const r1 = db.prepare(`
    INSERT INTO pacientes (nombre,apellido_paterno,apellido_materno,fecha_nacimiento,edad,
      telefono,email,ocupacion,estado_civil,direccion,ciudad,estado,alergias,tipo_sangre,
      antecedentes_heredofamiliares,antecedentes_personales_patologicos,
      menarca,ritmo_menstrual,dismenorrea,fum,gestas,partos,cesareas,abortos,vivos,
      metodo_anticonceptivo,inicio_vida_sexual,num_parejas_sexuales,
      ultimo_papanicolau,resultado_papanicolau,como_nos_conocio,notas_adicionales)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run('María','PRUEBA','González','1993-08-15',32,
    '3311111001','prueba1.maria@email.com','Maestra','Casada',
    'Calle Juárez 450, Col. Centro','Guadalajara','Jalisco',
    'Penicilina','O+',
    'Madre: DM2. Padre: HTA.','Ninguno relevante.',
    13,'28/4-5 días',1,diasAtras(45),
    2,2,0,0,2,'DIU (Mirena)',18,1,
    diasAtras(420),'NILM — sin alteraciones',
    'Recomendación de amiga','Refiere dolor leve en hipogastrio ocasional.');
  const id1 = r1.lastInsertRowid;
  ids.push(id1);

  const c1a = db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id)VALUES(?,?,?,?,?,?,?,?)`).run(id1,diasAtras(420),'10:00','revision','Revisión anual + PAP','completada','plataforma',uid);
  const s1a = db.prepare(`
    INSERT INTO consultas(paciente_id,cita_id,usuario_id,fecha,motivo_consulta,
      peso,talla,imc,tension_arterial,frecuencia_cardiaca,temperatura,
      subjetivo,objetivo,exploracion_ginecologica,diagnostico_principal,plan,indicaciones,proxima_cita_fecha)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id1,c1a.lastInsertRowid,uid,diasAtras(420)+' 10:00','Revisión anual rutinaria',
    65.5,162,24.9,'110/70',72,36.5,
    'Paciente asintomática. Acude a revisión anual de rutina.',
    'Exploración física sin alteraciones. Útero en AVF de tamaño normal.',
    'Cuello uterino de aspecto normal. PAP tomado.',
    'Z01.419 — Revisión ginecológica anual. PAP: NILM.',
    'Continuar con DIU. Siguiente revisión en 1 año.',
    'Acudir si presenta sangrado anormal.',diasAtras(-60));
  db.prepare(`INSERT INTO recetas(paciente_id,consulta_id,usuario_id,fecha,diagnostico,medicamentos,indicaciones_generales)VALUES(?,?,?,?,?,?,?)`).run(
    id1,s1a.lastInsertRowid,uid,diasAtras(420),'Dismenorrea leve',
    JSON.stringify([{nombre:'Ibuprofeno 400 mg',dosis:'1 tableta cada 8 hrs',duracion:'3 días',instrucciones:'Con alimentos al inicio de la menstruación'}]),
    'Aplicar calor local. Hidratarse adecuadamente.');

  const c1b = db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id)VALUES(?,?,?,?,?,?,?,?)`).run(id1,diasAtras(90),'11:30','consulta','Flujo vaginal con mal olor','completada','plataforma',uid);
  const s1b = db.prepare(`
    INSERT INTO consultas(paciente_id,cita_id,usuario_id,fecha,motivo_consulta,
      peso,talla,imc,tension_arterial,frecuencia_cardiaca,temperatura,
      subjetivo,objetivo,exploracion_ginecologica,estudios_laboratorio,
      diagnostico_principal,plan,indicaciones)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id1,c1b.lastInsertRowid,uid,diasAtras(90)+' 11:30','Flujo vaginal con mal olor y prurito',
    66.0,162,25.1,'112/72',74,36.6,
    'Flujo grisáceo con olor a pescado desde hace 10 días. Prurito leve.',
    'Flujo gris homogéneo adherente a paredes vaginales.',
    'Test de Whiff positivo. pH vaginal 5.5. Clue cells en frotis.',
    'Frotis vaginal: flora alterada. Clue cells ++. Sin Trichomonas ni Cándida.',
    'N76.0 — Vaginosis bacteriana',
    'Tratamiento antibiótico. Control en 2 semanas si persisten síntomas.',
    'Abstenerse de relaciones durante el tratamiento.');
  db.prepare(`INSERT INTO recetas(paciente_id,consulta_id,usuario_id,fecha,diagnostico,medicamentos,indicaciones_generales)VALUES(?,?,?,?,?,?,?)`).run(
    id1,s1b.lastInsertRowid,uid,diasAtras(90),'Vaginosis bacteriana',
    JSON.stringify([
      {nombre:'Metronidazol 500 mg',dosis:'1 tableta cada 12 hrs',duracion:'7 días',instrucciones:'Vía oral. No alcohol.'},
      {nombre:'Clindamicina óvulos 100 mg',dosis:'1 óvulo vaginal al dormir',duracion:'3 noches',instrucciones:'Introducir profundo con aplicador.'}]),
    'Evitar alcohol durante el tratamiento. Ropa interior de algodón.');

  db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id,notas_internas)VALUES(?,?,?,?,?,?,?,?,?)`).run(
    id1,diasAdelante(14),'10:00','revision','Revisión anual + PAP (pendiente 14 meses)','confirmada','plataforma',uid,
    'PAP VENCIDO — última toma hace 14 meses, resultado NILM.');

  db.prepare(`INSERT INTO cobros(paciente_id,consulta_id,usuario_id,concepto,monto,metodo_pago,fecha,estado,folio)VALUES(?,?,?,?,?,?,?,?,?)`).run(id1,s1a.lastInsertRowid,uid,'Consulta ginecológica + PAP',800,'efectivo',diasAtras(420),'pagado',folio());
  db.prepare(`INSERT INTO cobros(paciente_id,consulta_id,usuario_id,concepto,monto,metodo_pago,fecha,estado,folio)VALUES(?,?,?,?,?,?,?,?,?)`).run(id1,s1b.lastInsertRowid,uid,'Consulta + frotis vaginal',700,'tarjeta',diasAtras(90),'pagado',folio());
  db.prepare(`INSERT INTO recordatorios(paciente_id,tipo,descripcion,fecha_programada,estado)VALUES(?,?,?,?,?)`).run(
    id1,'pap','PAP anual vencido — última toma hace 14 meses (NILM). Programar con urgencia.',diasAtras(60),'pendiente');

  // ── PACIENTE 2 ── Ana PRUEBA Ramírez (28 años) — Embarazo activo ────────────
  const fumP2 = diasAtras(175); // ~25 semanas
  const fppP2 = calcFpp(fumP2);

  const r2 = db.prepare(`
    INSERT INTO pacientes(nombre,apellido_paterno,apellido_materno,fecha_nacimiento,edad,
      telefono,email,ocupacion,estado_civil,direccion,ciudad,estado,alergias,tipo_sangre,
      antecedentes_heredofamiliares,antecedentes_personales_patologicos,
      menarca,ritmo_menstrual,dismenorrea,fum,gestas,partos,cesareas,abortos,vivos,
      metodo_anticonceptivo,inicio_vida_sexual,num_parejas_sexuales,como_nos_conocio,notas_adicionales)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run('Ana','PRUEBA','Ramírez','1997-03-22',28,
    '3322222002','prueba2.ana@email.com','Enfermera','Casada',
    'Av. Vallarta 1200, Col. Americana','Guadalajara','Jalisco',
    'Ninguna','A+',
    'Madre: tiroiditis.','Hipotiroidismo controlado (Levotiroxina 50 mcg).',
    12,'30/5-6 días',0,fumP2,
    1,0,0,0,0,null,20,1,'Redes sociales',
    `Embarazo actual. FUM: ${fumP2}. FPP: ${fppP2}. Primigest.`);
  const id2 = r2.lastInsertRowid;
  ids.push(id2);

  const emb2 = db.prepare(`INSERT INTO embarazos(paciente_id,fum,fpp,semanas_al_ingresar,tipo_embarazo,estado,notas)VALUES(?,?,?,?,?,?,?)`).run(
    id2,fumP2,fppP2,8,'único','activo','Primigest. Embarazo de bajo riesgo. Hipotiroidismo controlado con Levotiroxina.');
  const embId2 = emb2.lastInsertRowid;

  const cp2 = [
    {f:diasAtras(140),s:8,p:58.2,ta:'100/60',fcm:78,fcf:160,au:null,us:'Embrión único. LCN acorde a 8 sem. Latido cardiaco presente.',labs:'BH: Hb 12.8. QS: glucosa 85. TORCH negativos. TSH: 2.1. Grupo: A+.',dx:'Embarazo único 8 semanas. Bajo riesgo.',plan:'Ácido fólico 5 mg + hierro. Citas cada 4 semanas.',hb:12.8,gl:85,prox:diasAtras(112)},
    {f:diasAtras(112),s:12,p:59.5,ta:'102/62',fcm:76,fcf:155,au:null,us:'US 12 sem: TN 1.8 mm (normal). Nasal presente. Biometría acorde.',labs:'TSH 2.4 (estable). Urocultivo negativo.',dx:'Embarazo único 12 semanas. TN normal.',plan:'Continuar suplementación. Calcio 1200 mg/día.',hb:12.5,gl:88,prox:diasAtras(84)},
    {f:diasAtras(84),s:16,p:61.0,ta:'100/64',fcm:74,fcf:148,au:14.5,us:'US morfológico: anatomía fetal sin alteraciones. Placenta fúndica posterior.',labs:'BH: Hb 11.9 (descenso leve). Duplicar hierro.',dx:'Embarazo único 16 semanas. Anemia leve.',plan:'Sulfato ferroso 300 mg c/12 hrs.',hb:11.9,gl:92,prox:diasAtras(56)},
    {f:diasAtras(56),s:20,p:63.2,ta:'104/66',fcm:72,fcf:144,au:19.0,us:'US 20 sem: anatomía completa sin malformaciones. Sexo: FEMENINO. Peso estimado 330 g.',labs:'BH: Hb 12.3 (mejoría). CTG: 82-138-105 (normal).',dx:'Embarazo único 20 semanas. Anemia en resolución.',plan:'Continuar suplementación. Psicoprofilaxis.',hb:12.3,gl:89,prox:diasAtras(28)},
  ];
  for (const cp of cp2) {
    db.prepare(`INSERT INTO controles_prenatales(embarazo_id,paciente_id,fecha,semanas,peso,tension_arterial,fcm,fcf,altura_uterina,presentacion,hemoglobina,glucemia,ultrasonido,laboratorios,diagnostico,plan,proxima_cita)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      embId2,id2,cp.f,cp.s,cp.p,cp.ta,cp.fcm,cp.fcf,cp.au,'Cefálica',cp.hb,cp.gl,cp.us,cp.labs,cp.dx,cp.plan,cp.prox);
  }

  db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id)VALUES(?,?,?,?,?,?,?,?)`).run(id2,diasAdelante(7),'09:00','prenatal','Control prenatal 24 semanas','confirmada','plataforma',uid);

  for (const [conc,monto,met,fecha] of [
    ['Control prenatal 1er trimestre + labs',1200,'transferencia',diasAtras(140)],
    ['Control prenatal + US 12 semanas',1500,'tarjeta',diasAtras(112)],
    ['Control prenatal 2do trimestre',900,'efectivo',diasAtras(84)],
    ['Control prenatal + US morfológico 20 sem',1800,'tarjeta',diasAtras(56)],
  ]) {
    db.prepare(`INSERT INTO cobros(paciente_id,usuario_id,concepto,monto,metodo_pago,fecha,estado,folio)VALUES(?,?,?,?,?,?,?,?)`).run(id2,uid,conc,monto,met,fecha,'pagado',folio());
  }
  db.prepare(`INSERT INTO recordatorios(paciente_id,tipo,descripcion,fecha_programada,estado)VALUES(?,?,?,?,?)`).run(
    id2,'seguimiento','Iniciar controles cada 2 semanas a las 28 sem. Estreptococo B a las 35-37 sem.',diasAdelante(21),'pendiente');

  // ── PACIENTE 3 ── Carmen PRUEBA Hernández (38 años) — NIC 1 ─────────────────
  const r3 = db.prepare(`
    INSERT INTO pacientes(nombre,apellido_paterno,apellido_materno,fecha_nacimiento,edad,
      telefono,email,ocupacion,estado_civil,direccion,ciudad,estado,alergias,tipo_sangre,
      antecedentes_heredofamiliares,antecedentes_personales_patologicos,antecedentes_quirurgicos,
      menarca,ritmo_menstrual,dismenorrea,fum,gestas,partos,cesareas,abortos,vivos,
      metodo_anticonceptivo,inicio_vida_sexual,num_parejas_sexuales,
      ultima_colposcopia,resultado_colposcopia,ultimo_papanicolau,resultado_papanicolau,
      como_nos_conocio,notas_adicionales)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run('Carmen','PRUEBA','Hernández','1987-11-04',38,
    '3333333003','prueba3.carmen@email.com','Contadora','Divorciada',
    'Calle Reforma 890, Col. Chapalita','Guadalajara','Jalisco',
    'Sulfas','B-',
    'Madre: Ca mama (55 años). Hermana: miomatosis.','Migraña. Hipotiroidismo (Levotiroxina 75 mcg).',
    'Cesárea (2018). Legrado (2021) por aborto espontáneo.',
    11,'26/5-7 días (irregular)',1,diasAtras(22),
    2,1,1,1,1,'Parche anticonceptivo (Evra)',17,3,
    diasAtras(180),'ASCUS — seguimiento en 6 meses',
    diasAtras(180),'ASCUS — células escamosas atípicas',
    'Google','Antecedente familiar de Ca mama. Alto riesgo.');
  const id3 = r3.lastInsertRowid;
  ids.push(id3);

  const c3a = db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id)VALUES(?,?,?,?,?,?,?,?)`).run(id3,diasAtras(240),'12:00','consulta','Sangrado menstrual abundante','completada','plataforma',uid);
  const s3a = db.prepare(`
    INSERT INTO consultas(paciente_id,cita_id,usuario_id,fecha,motivo_consulta,
      peso,talla,imc,tension_arterial,frecuencia_cardiaca,temperatura,
      subjetivo,objetivo,exploracion_ginecologica,ultrasonido_resultado,
      diagnostico_principal,diagnosticos_secundarios,plan,indicaciones)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id3,c3a.lastInsertRowid,uid,diasAtras(240)+' 12:00','Hipermenorrea con coágulos. EVA 7/10.',
    72.5,165,26.6,'120/80',80,36.8,
    'Menstruaciones abundantes con coágulos desde hace 4 meses. Fatiga y mareo.',
    'Útero aumentado de tamaño (~16 SDG). Sin datos peritoneales.',
    'Útero retroverso aumentado. Fondos de saco libres.',
    'Múltiples miomas: submucoso 3.2 cm, intramural 2.8 cm, subseroso 1.5 cm.',
    'D25.9 — Leiomioma uterino múltiple',
    'N91.2 — Oligomenorrea. D50.0 — Anemia ferropénica.',
    'Tratamiento médico con progestágenos. Vigilar Hb.',
    'Acudir a urgencias si sangrado excesivo. Suplemento de hierro.');
  db.prepare(`INSERT INTO recetas(paciente_id,consulta_id,usuario_id,fecha,diagnostico,medicamentos,indicaciones_generales)VALUES(?,?,?,?,?,?,?)`).run(
    id3,s3a.lastInsertRowid,uid,diasAtras(240),'Miomatosis — hipermenorrea — anemia ferropénica',
    JSON.stringify([
      {nombre:'Ácido tranexámico 500 mg',dosis:'1 tableta cada 8 hrs',duracion:'5 días en menstruación',instrucciones:'Solo días de sangrado abundante.'},
      {nombre:'Sulfato ferroso 300 mg',dosis:'1 tableta cada 12 hrs',duracion:'3 meses',instrucciones:'Con vitamina C.'},
      {nombre:'Medroxiprogesterona 10 mg',dosis:'1 tableta al día días 16-25',duracion:'3 ciclos',instrucciones:'Para regular ciclo menstrual.'}]),
    'Dieta rica en hierro y vitamina C.');

  const c3b = db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id)VALUES(?,?,?,?,?,?,?,?)`).run(id3,diasAtras(180),'11:00','colposcopia','PAP + colposcopía','completada','plataforma',uid);
  db.prepare(`
    INSERT INTO consultas(paciente_id,cita_id,usuario_id,fecha,motivo_consulta,
      peso,talla,imc,tension_arterial,frecuencia_cardiaca,temperatura,
      subjetivo,objetivo,exploracion_ginecologica,colposcopia_resultado,
      diagnostico_principal,plan,indicaciones,proxima_cita_fecha)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id3,c3b.lastInsertRowid,uid,diasAtras(180)+' 11:00','Seguimiento ASCUS previo',
    71.8,165,26.4,'118/76',76,36.6,
    'Asintomática. Control por ASCUS hace 6 meses.',
    'Útero con miomas palpables. Sin adenopatías.',
    'Colposcopía: ZT tipo 1. Epitelio acetoblanco tenue cuadrante posterior.',
    'ZT tipo 1. Epitelio acetoblanco tenue grado 1. Biopsia: NIC 1 (Cambios por VPH bajo grado).',
    'N87.0 — NIC 1',
    'Control en 6 meses con PAP + colposcopía.',
    'No requiere cirugía. Evitar tabaco.',
    diasAdelante(21));

  db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id,notas_internas)VALUES(?,?,?,?,?,?,?,?,?)`).run(
    id3,diasAdelante(21),'11:00','colposcopia','Colposcopía control NIC 1 (6 meses)','pendiente','plataforma',uid,
    'Control NIC 1 — 6 meses. Alta prioridad.');

  db.prepare(`INSERT INTO cobros(paciente_id,usuario_id,concepto,monto,metodo_pago,fecha,estado,folio)VALUES(?,?,?,?,?,?,?,?,?)`).run(id3,uid,'Consulta + US pélvico',1200,'tarjeta',diasAtras(240),'pagado',folio());
  db.prepare(`INSERT INTO cobros(paciente_id,usuario_id,concepto,monto,metodo_pago,fecha,estado,folio)VALUES(?,?,?,?,?,?,?,?,?)`).run(id3,uid,'PAP + colposcopía + biopsia cervical',1800,'tarjeta',diasAtras(180),'pagado',folio());
  db.prepare(`INSERT INTO cobros(paciente_id,usuario_id,concepto,monto,metodo_pago,fecha,estado,folio,notas)VALUES(?,?,?,?,?,?,?,?,?,?)`).run(id3,uid,'Colposcopía control NIC 1',1500,'pendiente',diasAdelante(21),'pendiente',folio(),'Pendiente de pago — cita próxima');

  db.prepare(`INSERT INTO recordatorios(paciente_id,tipo,descripcion,fecha_programada,estado)VALUES(?,?,?,?,?)`).run(
    id3,'colposcopia','NIC 1 — control PAP + colposcopía. ALTA PRIORIDAD por antecedente Ca mama familiar.',diasAtras(5),'pendiente');
  db.prepare(`INSERT INTO recordatorios(paciente_id,tipo,descripcion,fecha_programada,estado)VALUES(?,?,?,?,?)`).run(
    id3,'mastografia','Mastografía anual vencida — antecedente Ca mama en madre. URGENTE.',diasAtras(30),'pendiente');

  // ── PACIENTE 4 ── Sofía PRUEBA Mendoza (19 años) — 1ª consulta ──────────────
  const r4 = db.prepare(`
    INSERT INTO pacientes(nombre,apellido_paterno,apellido_materno,fecha_nacimiento,edad,
      telefono,email,ocupacion,estado_civil,direccion,ciudad,estado,alergias,tipo_sangre,
      antecedentes_heredofamiliares,antecedentes_personales_patologicos,
      menarca,ritmo_menstrual,dismenorrea,fum,gestas,partos,cesareas,abortos,vivos,
      metodo_anticonceptivo,inicio_vida_sexual,num_parejas_sexuales,vacuna_vph,
      como_nos_conocio,notas_adicionales)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run('Sofía','PRUEBA','Mendoza','2006-09-10',19,
    '3344444004','prueba4.sofia@email.com','Estudiante','Soltera',
    'Col. Providencia, Guadalajara','Guadalajara','Jalisco',
    'Ninguna','O-',
    'Sin antecedentes relevantes.','Ninguno.',
    13,'28/4-5 días',1,diasAtras(15),
    0,0,0,0,0,'Pastillas anticonceptivas (inicio reciente)',18,1,1,
    'Instagram','Primera consulta ginecológica. IVSA hace 1 año.');
  const id4 = r4.lastInsertRowid;
  ids.push(id4);

  const c4a = db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id)VALUES(?,?,?,?,?,?,?,?)`).run(id4,diasAtras(30),'09:30','primera_vez','Primera consulta ginecológica','completada','plataforma',uid);
  const s4a = db.prepare(`
    INSERT INTO consultas(paciente_id,cita_id,usuario_id,fecha,motivo_consulta,
      peso,talla,imc,tension_arterial,frecuencia_cardiaca,temperatura,
      subjetivo,objetivo,exploracion_ginecologica,
      diagnostico_principal,plan,indicaciones,proxima_cita_fecha)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id4,c4a.lastInsertRowid,uid,diasAtras(30)+' 09:30','Primera consulta ginecológica. ACOs.',
    55.0,163,20.7,'108/68',70,36.4,
    'IVSA hace 1 año. Sin parejas múltiples. Ciclos regulares. Dismenorrea moderada.',
    'IMC normal. Sin masas palpables.',
    'Genitales externos normales. Cuello en nulípara. NO se toma PAP (VSA < 3 años).',
    'Z30.0 — Primera consulta. Inicio ACOs. VPH 1ª dosis aplicada.',
    'Microgynon. VPH: 1ª dosis hoy, 2ª en 2 meses. PAP a los 21 años.',
    'ACO misma hora cada día. Condón las primeras 4 semanas.',
    diasAdelante(30));
  db.prepare(`INSERT INTO recetas(paciente_id,consulta_id,usuario_id,fecha,diagnostico,medicamentos,indicaciones_generales)VALUES(?,?,?,?,?,?,?)`).run(
    id4,s4a.lastInsertRowid,uid,diasAtras(30),'Anticoncepción oral. Dismenorrea.',
    JSON.stringify([
      {nombre:'Microgynon 21 (Levonorgestrel 0.15/EE 0.03)',dosis:'1 tableta diaria 21 días, descanso 7',duracion:'3 ciclos',instrucciones:'Iniciar 1er día del ciclo.'},
      {nombre:'Ibuprofeno 400 mg',dosis:'1 tableta cada 8 hrs con alimentos',duracion:'Primeros 3 días de menstruación',instrucciones:'Para dismenorrea.'}]),
    'Consultar si cefalea intensa, dolor en pantorrilla o alteraciones visuales.');

  db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id)VALUES(?,?,?,?,?,?,?,?)`).run(id4,diasAdelante(30),'09:30','seguimiento','2ª dosis VPH + control ACO','confirmada','plataforma',uid);
  db.prepare(`INSERT INTO cobros(paciente_id,usuario_id,concepto,monto,metodo_pago,fecha,estado,folio)VALUES(?,?,?,?,?,?,?,?,?)`).run(id4,uid,'Primera consulta + VPH 1ª dosis',950,'efectivo',diasAtras(30),'pagado',folio());
  db.prepare(`INSERT INTO recordatorios(paciente_id,tipo,descripcion,fecha_programada,estado)VALUES(?,?,?,?,?)`).run(
    id4,'vacuna_vph','VPH 2ª dosis (Gardasil 9). Esquema 0-2-6 meses.',diasAdelante(30),'pendiente');

  // ── PACIENTE 5 ── Lucía PRUEBA Vargas (45 años) — Perimenopausia ─────────────
  const r5 = db.prepare(`
    INSERT INTO pacientes(nombre,apellido_paterno,apellido_materno,fecha_nacimiento,edad,
      telefono,email,ocupacion,estado_civil,direccion,ciudad,estado,alergias,tipo_sangre,
      antecedentes_heredofamiliares,antecedentes_personales_patologicos,antecedentes_quirurgicos,
      menarca,ritmo_menstrual,dismenorrea,fum,gestas,partos,cesareas,abortos,vivos,
      metodo_anticonceptivo,inicio_vida_sexual,num_parejas_sexuales,
      ultima_colposcopia,resultado_colposcopia,ultimo_papanicolau,resultado_papanicolau,
      como_nos_conocio,notas_adicionales)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run('Lucía','PRUEBA','Vargas','1980-06-18',45,
    '3355555005','prueba5.lucia@email.com','Arquitecta','Casada',
    'Av. López Mateos 2340, Zapopan','Zapopan','Jalisco',
    'AINEs (urticaria leve)','AB+',
    'Abuela materna: Ca endometrio. Madre: osteoporosis.',
    'HTA leve (Losartán 50 mg). Hiperlipidemia.',
    'Histeroscopía diagnóstica (2022). Apendicectomía (1998).',
    12,'35-60 días (irregular)',0,diasAtras(65),
    3,2,1,0,3,'Ninguno (ciclos irregulares)',20,2,
    diasAtras(365),'ZT tipo 3. Sin displasia. Cambios atróficos.',
    diasAtras(365),'Cambios celulares benignos por atrofia',
    'Recomendación médico','Perimenopausia confirmada. TRH iniciada. Mastografía pendiente.');
  const id5 = r5.lastInsertRowid;
  ids.push(id5);

  const c5a = db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id)VALUES(?,?,?,?,?,?,?,?)`).run(id5,diasAtras(365),'10:30','revision','Revisión anual + PAP + colposcopía','completada','plataforma',uid);
  db.prepare(`
    INSERT INTO consultas(paciente_id,cita_id,usuario_id,fecha,motivo_consulta,
      peso,talla,imc,tension_arterial,frecuencia_cardiaca,temperatura,
      subjetivo,objetivo,exploracion_ginecologica,colposcopia_resultado,
      diagnostico_principal,plan,indicaciones)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id5,c5a.lastInsertRowid,uid,diasAtras(365)+' 10:30','Revisión anual. Ciclos irregulares 18 meses. Bochornos.',
    74.0,168,26.2,'128/82',78,36.7,
    'Ciclos 35-60 días, irregulares. Bochornos 4-6/día. Insomnio.',
    'Sin masas palpables. Mamas sin nódulos.',
    'Cuello pálido, atrófico. Sin lesiones.',
    'ZT tipo 3. Cambios atróficos. Biopsia: cambios benignos. Sin displasia.',
    'N95.1 — Perimenopausia. Z12.31 — Detección cervicouterina negativa.',
    'Labs hormonales. Densitometría. Mastografía anual. Evaluar TRH.',
    'Dieta cálcica. Ejercicio aeróbico 150 min/sem.');

  const c5b = db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id)VALUES(?,?,?,?,?,?,?,?)`).run(id5,diasAtras(180),'10:00','consulta','Control síntomas + resultados labs','completada','plataforma',uid);
  const s5b = db.prepare(`
    INSERT INTO consultas(paciente_id,cita_id,usuario_id,fecha,motivo_consulta,
      peso,talla,imc,tension_arterial,frecuencia_cardiaca,temperatura,
      subjetivo,objetivo,estudios_laboratorio,
      diagnostico_principal,diagnosticos_secundarios,plan,indicaciones,proxima_cita_fecha)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id5,c5b.lastInsertRowid,uid,diasAtras(180)+' 10:00','Control síntomas menopáusicos.',
    74.5,168,26.4,'126/80',76,36.5,
    'Bochornos 6-8/día, intensos. Insomnio grave. Sequedad vaginal. Irritabilidad.',
    'Sin cambios relevantes.',
    'FSH: 68 mIU/mL (↑). LH: 42 mIU/mL (↑). E2: 18 pg/mL (↓). Densitometría T-score: -1.5 (osteopenia).',
    'N95.1 — Síndrome climatérico severo.',
    'M81.0 — Osteopenia. E78.0 — Hipercolesterolemia.',
    'TRH: estradiol transdérmico + progesterona micronizada. Calcio + Vit D.',
    'Gel estradiol 0.5 g/día. Progesterona 200 mg 12 días/mes.',
    diasAtras(0));
  db.prepare(`INSERT INTO recetas(paciente_id,consulta_id,usuario_id,fecha,diagnostico,medicamentos,indicaciones_generales)VALUES(?,?,?,?,?,?,?)`).run(
    id5,s5b.lastInsertRowid,uid,diasAtras(180),'Síndrome climatérico. Osteopenia. TRH.',
    JSON.stringify([
      {nombre:'Estradiol gel 0.1% (Estreva)',dosis:'0.5 g en piel de muslo/abdomen',duracion:'Continuo',instrucciones:'Rotar zona. No en mamas.'},
      {nombre:'Utrogestan 200 mg (progesterona micronizada)',dosis:'1 cápsula oral al dormir',duracion:'12 días/mes (días 14-25)',instrucciones:'Puede causar somnolencia.'},
      {nombre:'Calcio 600 mg + Vitamina D 400 UI',dosis:'2 tabletas al día con alimentos',duracion:'Continuo',instrucciones:'Alejado de Losartán 2 horas.'}]),
    'Reportar sangrado vaginal inmediatamente. Mastografía anual pendiente.');

  const c5c = db.prepare(`INSERT INTO citas(paciente_id,fecha,hora,tipo,motivo,estado,origen,usuario_id)VALUES(?,?,?,?,?,?,?,?)`).run(id5,diasAtras(7),'10:00','seguimiento','Control 6 meses TRH','completada','plataforma',uid);
  db.prepare(`
    INSERT INTO consultas(paciente_id,cita_id,usuario_id,fecha,motivo_consulta,
      peso,talla,imc,tension_arterial,frecuencia_cardiaca,
      subjetivo,objetivo,diagnostico_principal,plan,indicaciones,proxima_cita_fecha)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id5,c5c.lastInsertRowid,uid,diasAtras(7)+' 10:00','Control 6 meses TRH.',
    73.0,168,25.9,'122/78',72,
    'Mejoría: bochornos 2/día leves. Duerme mejor. Sequedad vaginal persiste moderada.',
    'TA controlada. Sin masas.',
    'N95.1 — Síntomas controlados con TRH.',
    'Continuar TRH. Lubricante vaginal sin hormonas. MASTOGRAFÍA URGENTE.',
    'Lubricante K-Y. Mastografía este mes.',
    diasAdelante(90));

  // Solicitud web pendiente
  db.prepare(`INSERT INTO citas(paciente_id,web_nombre,web_email,web_telefono,web_motivo,web_es_primera_vez,fecha,hora,tipo,motivo,estado,origen)VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id5,'Lucía Vargas Pérez','prueba5.lucia@email.com','3355555005',
    'Seguimiento control hormonal. Mastografía urgente.',0,
    diasAdelante(3),'11:00','seguimiento','Solicitud web: control hormonal + mastografía','pendiente','web');

  for (const [conc,monto,met,fecha] of [
    ['Revisión anual + PAP + colposcopía + biopsia',1800,'tarjeta',diasAtras(365)],
    ['Consulta + inicio TRH',900,'transferencia',diasAtras(180)],
    ['Control TRH 6 meses',700,'efectivo',diasAtras(7)],
  ]) {
    db.prepare(`INSERT INTO cobros(paciente_id,usuario_id,concepto,monto,metodo_pago,fecha,estado,folio)VALUES(?,?,?,?,?,?,?,?,?)`).run(id5,uid,conc,monto,met,fecha,'pagado',folio());
  }
  db.prepare(`INSERT INTO recordatorios(paciente_id,tipo,descripcion,fecha_programada,estado)VALUES(?,?,?,?,?)`).run(
    id5,'mastografia','Mastografía anual VENCIDA. Antecedente Ca endometrio abuela materna. URGENTE.',diasAtras(10),'pendiente');
  db.prepare(`INSERT INTO recordatorios(paciente_id,tipo,descripcion,fecha_programada,estado)VALUES(?,?,?,?,?)`).run(
    id5,'pap','PAP anual próximo — última toma hace 12 meses (atrófico benigno).',diasAdelante(5),'pendiente');

  // ── Resumen ───────────────────────────────────────────────────────────────────
  res.json({
    ok: true,
    mensaje: '5 pacientes de prueba creados correctamente',
    ids,
    resumen: {
      pacientes: db.prepare(`SELECT COUNT(*) as c FROM pacientes WHERE apellido_paterno='PRUEBA'`).get().c,
      citas:     db.prepare(`SELECT COUNT(*) as c FROM citas WHERE paciente_id IN (${ids.join(',')})`).get().c,
      consultas: db.prepare(`SELECT COUNT(*) as c FROM consultas WHERE paciente_id IN (${ids.join(',')})`).get().c,
      recetas:   db.prepare(`SELECT COUNT(*) as c FROM recetas WHERE paciente_id IN (${ids.join(',')})`).get().c,
      cobros:    db.prepare(`SELECT COUNT(*) as c FROM cobros WHERE paciente_id IN (${ids.join(',')})`).get().c,
      recordatorios: db.prepare(`SELECT COUNT(*) as c FROM recordatorios WHERE paciente_id IN (${ids.join(',')})`).get().c,
      embarazos: db.prepare(`SELECT COUNT(*) as c FROM embarazos WHERE paciente_id IN (${ids.join(',')})`).get().c,
      controles: db.prepare(`SELECT COUNT(*) as c FROM controles_prenatales WHERE paciente_id IN (${ids.join(',')})`).get().c,
    }
  });
});

module.exports = router;
