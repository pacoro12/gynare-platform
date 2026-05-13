const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'gynare.db');
const db = new DatabaseSync(DB_PATH);

function initDatabase() {
  db.exec(`PRAGMA journal_mode=WAL;`);
  db.exec(`PRAGMA foreign_keys=ON;`);

  // Usuarios del sistema (doctora + asistentes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'asistente',
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Pacientes
  db.exec(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellido_paterno TEXT NOT NULL,
      apellido_materno TEXT,
      fecha_nacimiento DATE,
      edad INTEGER,
      telefono TEXT,
      email TEXT,
      ocupacion TEXT,
      estado_civil TEXT,
      direccion TEXT,
      ciudad TEXT DEFAULT 'Guadalajara',
      estado TEXT DEFAULT 'Jalisco',
      alergias TEXT,
      tipo_sangre TEXT,
      -- Antecedentes
      antecedentes_heredofamiliares TEXT,
      antecedentes_personales_patologicos TEXT,
      antecedentes_personales_no_patologicos TEXT,
      antecedentes_quirurgicos TEXT,
      -- Historia ginecológica-obstétrica
      menarca INTEGER,
      ritmo_menstrual TEXT,
      dismenorrea INTEGER DEFAULT 0,
      fum DATE,
      gestas INTEGER DEFAULT 0,
      partos INTEGER DEFAULT 0,
      cesareas INTEGER DEFAULT 0,
      abortos INTEGER DEFAULT 0,
      vivos INTEGER DEFAULT 0,
      metodo_anticonceptivo TEXT,
      inicio_vida_sexual INTEGER,
      num_parejas_sexuales INTEGER,
      ultima_colposcopia DATE,
      resultado_colposcopia TEXT,
      ultimo_papanicolau DATE,
      resultado_papanicolau TEXT,
      vacuna_vph INTEGER DEFAULT 0,
      notas_adicionales TEXT,
      como_nos_conocio TEXT,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Citas
  db.exec(`
    CREATE TABLE IF NOT EXISTS citas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER REFERENCES pacientes(id),
      -- Para citas desde web (paciente nuevo)
      web_nombre TEXT,
      web_email TEXT,
      web_telefono TEXT,
      web_motivo TEXT,
      web_es_primera_vez INTEGER DEFAULT 1,
      fecha DATE NOT NULL,
      hora TIME NOT NULL,
      duracion_min INTEGER DEFAULT 30,
      tipo TEXT NOT NULL DEFAULT 'primera_vez',
      motivo TEXT,
      estado TEXT DEFAULT 'pendiente',
      notas_internas TEXT,
      origen TEXT DEFAULT 'plataforma',
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Consultas (notas de evolución / SOAP)
  db.exec(`
    CREATE TABLE IF NOT EXISTS consultas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
      cita_id INTEGER REFERENCES citas(id),
      usuario_id INTEGER REFERENCES usuarios(id),
      fecha DATETIME NOT NULL,
      motivo_consulta TEXT,
      -- Signos vitales
      peso REAL,
      talla REAL,
      imc REAL,
      tension_arterial TEXT,
      frecuencia_cardiaca INTEGER,
      frecuencia_respiratoria INTEGER,
      temperatura REAL,
      saturacion_oxigeno REAL,
      -- SOAP
      subjetivo TEXT,
      objetivo TEXT,
      exploracion_ginecologica TEXT,
      colposcopia_resultado TEXT,
      ultrasonido_resultado TEXT,
      estudios_laboratorio TEXT,
      -- Diagnóstico y plan
      diagnostico_principal TEXT,
      diagnosticos_secundarios TEXT,
      plan TEXT,
      indicaciones TEXT,
      -- Próxima cita
      proxima_cita_fecha DATE,
      proxima_cita_instrucciones TEXT,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Recetas médicas
  db.exec(`
    CREATE TABLE IF NOT EXISTS recetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
      consulta_id INTEGER REFERENCES consultas(id),
      usuario_id INTEGER REFERENCES usuarios(id),
      fecha DATE NOT NULL,
      diagnostico TEXT,
      medicamentos TEXT NOT NULL,
      indicaciones_generales TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Documentos / estudios adjuntos
  db.exec(`
    CREATE TABLE IF NOT EXISTS documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
      consulta_id INTEGER REFERENCES consultas(id),
      tipo TEXT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      archivo TEXT,
      fecha DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Crear usuario admin por defecto si no existe
  const adminExists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('dra.vaca@gynare.com.mx');
  if (!adminExists) {
    const hash = bcrypt.hashSync('Gynare2026!', 10);
    db.prepare(`
      INSERT INTO usuarios (nombre, email, password, rol)
      VALUES (?, ?, ?, ?)
    `).run('Dra. Lucero Vaca', 'dra.vaca@gynare.com.mx', hash, 'doctor');

    const hashAdmin = bcrypt.hashSync('Admin2026!', 10);
    db.prepare(`
      INSERT INTO usuarios (nombre, email, password, rol)
      VALUES (?, ?, ?, ?)
    `).run('Recepción GYNARE', 'recepcion@gynare.com.mx', hashAdmin, 'asistente');
  }

  console.log('✅ Base de datos GYNARE inicializada:', DB_PATH);
}

initDatabase();

module.exports = db;
