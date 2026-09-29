import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema, changePasswordSchema } from '../utils/validators.js';

const router = Router();

// POST /api/v1/auth/register - Disabled: Student & Faculty accounts are provisioned exclusively by Administrators
router.post('/register', authLimiter, (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Public registration is disabled. User accounts must be provisioned by the institutional administrator.'
  });
});


// POST /api/v1/auth/login (rate-limited, validated)
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// POST /api/v1/auth/verify-otp (rate-limited, validated)
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);

// POST /api/v1/auth/resend-otp (rate-limited, validated)
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), authController.resendOtp);

// POST /api/v1/auth/refresh (reads HttpOnly refreshToken cookie)
router.post('/refresh', authController.refresh);

// POST /api/v1/auth/logout (revokes DB refresh token & clears cookie)
router.post('/logout', authController.logout);

// GET /api/v1/auth/me (protected route, requires valid JWT access token)
router.get('/me', authenticate, authController.getMe);

// GET /api/v1/auth/profile (protected route, returns full user profile & activity stats)
router.get('/profile', authenticate, authController.getProfile);

// PUT /api/v1/auth/change-password (protected route, changes password & invalidates sessions)
router.put('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;

