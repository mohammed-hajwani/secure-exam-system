import { Router } from 'express';
import * as questionController from '../controllers/questionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createQuestionSchema, updateQuestionSchema } from '../utils/validators.js';

const router = Router();

// Protect all /questions routes: Requires valid JWT and FACULTY or ADMIN role
router.use(authenticate, authorize('FACULTY', 'ADMIN'));

// POST /api/v1/questions (Create question)
router.post('/', validate(createQuestionSchema), questionController.create);

// GET /api/v1/questions (List questions - scoped by creator unless Admin)
router.get('/', questionController.list);

// PATCH /api/v1/questions/:id (Update question - creator/admin only)
router.patch('/:id', validate(updateQuestionSchema), questionController.update);

// DELETE /api/v1/questions/:id (Delete question - creator/admin only)
router.delete('/:id', questionController.remove);

export default router;
