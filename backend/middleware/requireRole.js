module.exports = function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const roles = Array.isArray(req.user.roles) ? req.user.roles : [];
    const ok = allowedRoles.some(r => roles.includes(r));
    if (!ok) return res.status(403).json({ error: 'Forbidden: insufficient role' });
    next();
  };
};
