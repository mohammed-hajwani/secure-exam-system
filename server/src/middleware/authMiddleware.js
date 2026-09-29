import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Middleware to authenticate requests using JWT Access Token
 * Reads 'Authorization: Bearer <token>' header
 * Attaches decoded { userId, role, batch } to req.user
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided or malformed authorization header.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      batch: decoded.batch || null
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access token has expired. Please refresh your token.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid access token.'
    });
  }
};
