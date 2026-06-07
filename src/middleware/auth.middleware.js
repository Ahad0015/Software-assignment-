// =============================================================================
//  AMDAN ORGANICS – Auth Middleware (JWT verification + RBAC)
// =============================================================================

const jwt = require('jsonwebtoken');

// ── Verify JWT token ──────────────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userID, role, email }
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

// ── Role-Based Access Control ─────────────────────────────────────────────────
// Usage: authorizeRoles('SystemAdmin', 'FarmManager')
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`
      });
    }
    next();
  };
};

module.exports = { verifyToken, authorizeRoles };
