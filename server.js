const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pacientes', require('./routes/pacientes'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/consultas', require('./routes/consultas'));
app.use('/api/recetas', require('./routes/recetas'));
app.use('/api/publica', require('./routes/publica'));

// SPA fallback para la plataforma
app.get('/platform*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'platform', 'index.html'));
});

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ GYNARE corriendo en puerto ${PORT}`);
  console.log(`   🌐 Landing: http://localhost:${PORT}`);
  console.log(`   🏥 Plataforma: http://localhost:${PORT}/platform/`);
});
