const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gynare_secret_2026_!@#';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
