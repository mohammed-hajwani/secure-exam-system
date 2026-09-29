/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if req.user.role matches one of the allowed roles.
 * Must be executed after the authenticate middleware.
 *
 * @param {...string} allowedRoles - List of allowed roles (e.g. 'ADMIN', 'FACULTY')
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Authentication required before role check.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      });
    }

    next();
  };
};
