import { Router } from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import questionRoutes from './questionRoutes.js';
import examRoutes from './examRoutes.js';
import testRoutes from './testRoutes.js';

const router = Router();

// Root API ping
router.get('/', (req, res) => {
  res.json({ message: 'Secure Examination System API v1 is active' });
});

// Mount domain routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/questions', questionRoutes);
router.use('/exams', examRoutes);
router.use('/test', testRoutes);

export default router;
