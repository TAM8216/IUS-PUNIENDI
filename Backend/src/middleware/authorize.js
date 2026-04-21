// src/middleware/authorize.js
/**
 * authorize(roles)
 * - roles: array de nombres de rol permitidos (o vacío/null para solo autenticación)
 * Devuelve una función middleware.
 */
function authorize(roles = []) {
  if (typeof roles === 'string') roles = [roles];

  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'User not authenticated' });

    if (!roles || roles.length === 0) return next();

    const userRole = user.role || user.rol || user.role_name || user.rol_nombre;
    if (!userRole) return res.status(403).json({ message: 'User role missing in token' });

    if (roles.includes(userRole)) return next();

    return res.status(403).json({ message: 'Access denied: insufficient privileges' });
  };
}

module.exports = authorize;
