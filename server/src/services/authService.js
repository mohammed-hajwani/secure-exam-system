import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/db.js';
import { env } from '../config/env.js';

import nodemailer from 'nodemailer';

const SALT_ROUNDS = 12;

let mailTransporter = null;

const getTransporter = () => {
  if (!mailTransporter && env.SMTP_USER && env.SMTP_PASS) {
    mailTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
  }
  return mailTransporter;
};

/**
 * Send OTP via email with safe dev console fallback
 */
export const sendOtpEmail = async (email, otp) => {
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: email,
        subject: 'Your Secure Exam Verification Code',
        text: `Your 6-digit verification code is: ${otp}. It will expire in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0;">Secure Examination System</h2>
            <p style="color: #475569; font-size: 15px;">Use the following one-time code to complete your sign-in verification:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #059669; padding: 14px 20px; background: #ecfdf5; border-radius: 8px; text-align: center; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">This code will expire in 10 minutes. If you did not initiate this request, please contact your administrator immediately.</p>
          </div>
        `
      });
      return;
    } catch (err) {
      console.warn('⚠️ SMTP sendMail failed; falling back to console:', err.message);
    }
  }

  // Safe development fallback: Log OTP to console
  console.log('\n======================================================');
  console.log(`🔐 [DEV 2FA OTP CODE] Recipient: ${email}`);
  console.log(`🔑 Verification Code: ${otp}`);
  console.log('======================================================\n');
};

/**
 * Internal helper to generate and record a fresh 6-digit OTP for a user
 */
const createAndSendOtp = async (user) => {
  // Generate random 6-digit string
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate past unused OTPs for this user
  await prisma.otpCode.updateMany({
    where: { userId: user.id, isUsed: false },
    data: { isUsed: true }
  });

  // Store new hashed OTP
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      otpHash,
      expiresAt,
      isUsed: false
    }
  });

  // Send email (or log to console in dev)
  await sendOtpEmail(user.email, otp);

  // Generate temporary 2FA exchange token
  const tempToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      is2faTemp: true
    },
    env.JWT_TEMP_SECRET,
    { expiresIn: '10m' }
  );

  return {
    requiresOtp: true,
    tempToken,
    email: user.email
  };
};

/**
 * Helper to issue access & refresh tokens
 */
export const issueTokens = async (user) => {
  // 1. Generate short-lived Access Token (15 min) with { userId, role, batch }
  const accessToken = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      batch: user.batch || null
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );

  // 2. Generate longer-lived Refresh Token (7 days)
  const refreshToken = jwt.sign(
    {
      userId: user.id
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  // 3. Hash refresh token with SHA-256 for secure database storage
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 4. Store refresh token hash in PostgreSQL via Prisma
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      batch: user.batch
    }
  };
};

/**
 * Authenticate user credentials.
 * If OTP_ENABLED, sends OTP and returns tempToken for 2FA verification.
 * Otherwise issues dual tokens immediately.
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Look up user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check password against stored BCrypt hash
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Ensure account is active
  if (!user.isActive) {
    const error = new Error('Account is deactivated. Please contact an administrator.');
    error.statusCode = 403;
    throw error;
  }

  if (env.OTP_ENABLED) {
    return createAndSendOtp(user);
  }

  const tokens = await issueTokens(user);
  return {
    requiresOtp: false,
    ...tokens
  };
};

/**
 * Verify 2FA OTP code and issue JWT tokens
 */
export const verifyOtp = async ({ tempToken, otp, ipAddress }) => {
  let decoded;
  try {
    decoded = jwt.verify(tempToken, env.JWT_TEMP_SECRET);
  } catch (err) {
    const error = new Error('Verification session has expired or is invalid. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  if (!decoded.is2faTemp || !decoded.userId) {
    const error = new Error('Invalid verification token.');
    error.statusCode = 401;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user || !user.isActive) {
    const error = new Error('User not found or account is deactivated');
    error.statusCode = 403;
    throw error;
  }

  const otpHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');

  const validOtpRecord = await prisma.otpCode.findFirst({
    where: {
      userId: user.id,
      otpHash,
      isUsed: false,
      expiresAt: { gt: new Date() }
    }
  });

  if (!validOtpRecord) {
    const error = new Error('Invalid or expired verification code');
    error.statusCode = 400;
    throw error;
  }

  // Mark OTP as used
  await prisma.otpCode.update({
    where: { id: validOtpRecord.id },
    data: { isUsed: true }
  });

  // Audit log the successful OTP verification
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      eventType: 'OTP_VERIFY',
      details: JSON.stringify({ email: user.email }),
      ipAddress: ipAddress || null
    }
  });

  const tokens = await issueTokens(user);
  return {
    requiresOtp: false,
    ...tokens
  };
};

/**
 * Resend OTP code for an active 2FA session
 */
export const resendOtp = async ({ tempToken }) => {
  let decoded;
  try {
    decoded = jwt.verify(tempToken, env.JWT_TEMP_SECRET);
  } catch (err) {
    const error = new Error('Verification session has expired. Please sign in again.');
    error.statusCode = 401;
    throw error;
  }

  if (!decoded.is2faTemp || !decoded.userId) {
    const error = new Error('Invalid verification token.');
    error.statusCode = 401;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user || !user.isActive) {
    const error = new Error('User not found or account is deactivated');
    error.statusCode = 403;
    throw error;
  }

  return createAndSendOtp(user);
};


/**
 * Validate refresh token from cookie, check DB hash/revocation/expiry, and issue fresh access token
 */
export const refreshSession = async (refreshToken) => {
  if (!refreshToken) {
    const error = new Error('Refresh token is required');
    error.statusCode = 401;
    throw error;
  }

  // 1. Verify JWT signature against JWT_REFRESH_SECRET
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  // 2. Compute SHA-256 hash of the presented token
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // 3. Look up token in RefreshToken table
  const storedToken = await prisma.refreshToken.findFirst({
    where: { tokenHash },
    include: { user: true }
  });

  if (!storedToken) {
    const error = new Error('Refresh token not recognized or already pruned');
    error.statusCode = 401;
    throw error;
  }

  if (storedToken.isRevoked) {
    const error = new Error('Refresh token has been revoked');
    error.statusCode = 401;
    throw error;
  }

  if (new Date() > storedToken.expiresAt) {
    const error = new Error('Refresh token has expired. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  if (!storedToken.user || !storedToken.user.isActive) {
    const error = new Error('User account is deactivated');
    error.statusCode = 403;
    throw error;
  }

  // 4. Issue fresh short-lived Access Token (15 min) with { userId, role, batch }
  const newAccessToken = jwt.sign(
    {
      userId: storedToken.user.id,
      role: storedToken.user.role,
      batch: storedToken.user.batch || null
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );

  return {
    accessToken: newAccessToken,
    user: {
      id: storedToken.user.id,
      name: storedToken.user.name,
      email: storedToken.user.email,
      role: storedToken.user.role,
      batch: storedToken.user.batch
    }
  };
};

/**
 * Revoke active refresh token session in database
 */
export const revokeSession = async (refreshToken) => {
  if (!refreshToken) {
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Mark all matching token records as revoked
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { isRevoked: true }
  });
};

/**
 * Get comprehensive user profile with role-specific activity metrics
 */
export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      batch: true,
      isActive: true,
      createdAt: true
    }
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  let activityStats = {};

  if (user.role === 'STUDENT') {
    const [totalAttempts, submittedAttempts, flaggedAttempts] = await Promise.all([
      prisma.examAttempt.count({ where: { studentId: userId } }),
      prisma.examAttempt.count({ where: { studentId: userId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } } }),
      prisma.examAttempt.count({ where: { studentId: userId, isFlagged: true } })
    ]);

    const scoredAttempts = await prisma.examAttempt.findMany({
      where: { studentId: userId, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } },
      select: { score: true }
    });

    const validScores = scoredAttempts.map((a) => a.score).filter((s) => typeof s === 'number');
    const avgScore =
      validScores.length > 0
        ? (validScores.reduce((acc, s) => acc + s, 0) / validScores.length).toFixed(1)
        : null;


    activityStats = {
      totalAttempts,
      submittedAttempts,
      flaggedAttempts,
      averageScore: avgScore
    };
  } else if (user.role === 'FACULTY') {
    const [examsCreated, questionsAuthored, totalSubmissions] = await Promise.all([
      prisma.exam.count({ where: { createdById: userId } }),
      prisma.question.count({ where: { createdBy: userId } }),
      prisma.examAttempt.count({ where: { exam: { createdById: userId } } })
    ]);

    activityStats = {
      examsCreated,
      questionsAuthored,
      totalSubmissions
    };
  } else if (user.role === 'ADMIN') {
    const [totalUsers, totalExams, totalLogs] = await Promise.all([
      prisma.user.count(),
      prisma.exam.count(),
      prisma.auditLog.count()
    ]);

    activityStats = {
      totalUsers,
      totalExams,
      totalLogs
    };
  }

  return {
    user,
    stats: activityStats
  };
};

/**
 * Update user account password with verification and audit logging
 */
export const changePassword = async ({ userId, currentPassword, newPassword, ipAddress }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // 1. Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Incorrect current password');
    error.statusCode = 400;
    throw error;
  }

  // 2. Hash new password
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);


  // 3. Update database record
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash }
  });

  // 4. Invalidate all existing refresh tokens
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true }
  });

  // 5. Audit log entry
  await prisma.auditLog.create({
    data: {
      userId,
      eventType: 'USER_STATUS_CHANGE',
      details: 'User successfully changed account password',
      ipAddress
    }
  });

  return { success: true, message: 'Password updated successfully' };
};

