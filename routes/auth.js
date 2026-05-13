const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/init');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const user = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email);
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, nombre, email, rol FROM usuarios WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
