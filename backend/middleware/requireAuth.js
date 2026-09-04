const authService = require('../services/authService');

function requireAuth(req, res, next) {
  const user = authService.getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
  req.user = user;
  return next();
}

module.exports = requireAuth;
