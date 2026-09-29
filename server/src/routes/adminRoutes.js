import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import { adminCreateUserSchema, updateUserStatusSchema } from '../utils/validators.js';

const router = Router();

// Protect all /admin routes with JWT authentication and ADMIN role check
router.use(authenticate, authorize('ADMIN'));

// POST /api/v1/admin/users (Create user with explicit role)
router.post('/users', validate(adminCreateUserSchema), adminController.createUser);

// GET /api/v1/admin/users (List all users with filters)
router.get('/users', adminController.listUsers);

// PATCH /api/v1/admin/users/:id/status (Activate/Deactivate user)
router.patch('/users/:id/status', validate(updateUserStatusSchema), adminController.updateUserStatus);

// GET /api/v1/admin/audit-logs (View and filter system audit logs)
router.get('/audit-logs', adminController.getAuditLogs);


export default router;
