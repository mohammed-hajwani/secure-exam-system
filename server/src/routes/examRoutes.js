import { Router } from 'express';
import * as examController from '../controllers/examController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  createExamSchema,
  updateExamSchema,
  saveAnswerSchema,
  recordViolationSchema
} from '../utils/validators.js';

const router = Router();

// Protect all exam routes with authentication
router.use(authenticate);

// GET /api/v1/exams (List exams)
router.get('/', examController.list);

// GET /api/v1/exams/:id (Get single exam - metadata only for students)
router.get('/:id', examController.getById);

// POST /api/v1/exams/:id/start (Start exam attempt - STUDENT only)
router.post('/:id/start', authorize('STUDENT'), examController.start);

// PATCH /api/v1/exams/:examId/attempts/:attemptId/answer (Save student answer - STUDENT only)
router.patch(
  '/:examId/attempts/:attemptId/answer',
  authorize('STUDENT'),
  validate(saveAnswerSchema),
  examController.saveAnswer
);

// POST /api/v1/exams/:examId/attempts/:attemptId/violation (Record anti-cheat violation - STUDENT only)
router.post(
  '/:examId/attempts/:attemptId/violation',
  authorize('STUDENT'),
  validate(recordViolationSchema),
  examController.recordViolation
);

// POST /api/v1/exams/:examId/attempts/:attemptId/submit (Submit exam and auto-grade - STUDENT only)
router.post(
  '/:examId/attempts/:attemptId/submit',
  authorize('STUDENT'),
  examController.submit
);

// GET /api/v1/exams/:id/my-attempt (Get current student's attempt & results - STUDENT only)
router.get('/:id/my-attempt', authorize('STUDENT'), examController.getMyAttempt);

// GET /api/v1/exams/:id/attempts (List all student attempts & stats for exam - Faculty/Admin only)
router.get('/:id/attempts', authorize('FACULTY', 'ADMIN'), examController.getExamAttempts);

// GET /api/v1/exams/:id/attempts/:attemptId (Detailed attempt inspection with answers & audit logs - Faculty/Admin only)
router.get('/:id/attempts/:attemptId', authorize('FACULTY', 'ADMIN'), examController.getAttemptDetails);


// POST /api/v1/exams (Create exam - Faculty/Admin only)
router.post('/', authorize('FACULTY', 'ADMIN'), validate(createExamSchema), examController.create);

// PATCH /api/v1/exams/:id/publish (Publish exam - Creator/Admin only)
router.patch('/:id/publish', authorize('FACULTY', 'ADMIN'), examController.publish);

// PATCH /api/v1/exams/:id (Update exam - Creator/Admin only before live window)
router.patch('/:id', authorize('FACULTY', 'ADMIN'), validate(updateExamSchema), examController.update);

// DELETE /api/v1/exams/:id (Delete exam - Creator/Admin only with no attempts)
router.delete('/:id', authorize('FACULTY', 'ADMIN'), examController.remove);

export default router;
