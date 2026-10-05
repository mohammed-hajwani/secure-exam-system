import * as authService from '../services/authService.js';
import { cookieOptions, clearCookieOptions } from '../config/security.js';

/**
 * Handle user registration: POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login: POST /api/v1/auth/login
 * If OTP enabled: returns tempToken for 2FA verification.
 * Otherwise returns Access Token and sets Refresh Token in HttpOnly cookie.
 */
export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);

    if (result.requiresOtp) {
      return res.status(200).json({
        success: true,
        requiresOtp: true,
        message: 'A 6-digit verification code has been sent to your email',
        tempToken: result.tempToken,
        email: result.email
      });
    }

    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    return res.status(200).json({
      success: true,
      requiresOtp: false,
      message: 'Login successful',
      accessToken: result.accessToken,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle 2FA OTP verification: POST /api/v1/auth/verify-otp
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyOtp({
      ...req.body,
      ipAddress: req.ip
    });

    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Verification successful',
      accessToken: result.accessToken,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle 2FA OTP resend: POST /api/v1/auth/resend-otp
 */
export const resendOtp = async (req, res, next) => {
  try {
    const result = await authService.resendOtp(req.body);

    return res.status(200).json({
      success: true,
      message: 'Verification code resent successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token and rotate the HttpOnly refresh token cookie: POST /api/v1/auth/refresh
 */
export const refresh = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.refreshSession(
      req.cookies?.refreshToken,
      req.ip
    );

    // Rotated: replace the cookie with the newly issued refresh token
    if (refreshToken) {
      res.cookie('refreshToken', refreshToken, cookieOptions);
    }

    return res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully',
      accessToken,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout and invalidate refresh token: POST /api/v1/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await authService.revokeSession(refreshToken);
    }

    // Clear refresh token cookie using standard options
    res.clearCookie('refreshToken', clearCookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user session details: GET /api/v1/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get comprehensive user profile with stats: GET /api/v1/auth/profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const profile = await authService.getUserProfile(req.user.userId);
    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change user password: PUT /api/v1/auth/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    const result = await authService.changePassword({
      userId: req.user.userId,
      currentPassword,
      newPassword,
      ipAddress
    });

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

