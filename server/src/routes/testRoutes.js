import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = Router();

// Test Route: Faculty & Admin only
router.get('/faculty-only', authenticate, authorize('FACULTY', 'ADMIN'), (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Access granted to faculty/admin resource',
    user: req.user
  });
});

// Test Route: Admin only
router.get('/admin-only', authenticate, authorize('ADMIN'), (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Access granted to admin-only resource',
    user: req.user
  });
});

export default router;
