import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:MyNewPass123@localhost:5432/secure_exam_db',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_123',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_123',
  JWT_TEMP_SECRET: process.env.JWT_TEMP_SECRET || 'dev_jwt_temp_secret_123',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'Secure Exam System <no-reply@exam-system.edu>',
  OTP_ENABLED: process.env.OTP_ENABLED !== 'false' // Enable OTP 2FA by default
};

// Validate production secrets
if (env.NODE_ENV === 'production') {
  if (
    !process.env.JWT_ACCESS_SECRET ||
    env.JWT_ACCESS_SECRET === 'dev_jwt_access_secret_123' ||
    !process.env.JWT_REFRESH_SECRET ||
    env.JWT_REFRESH_SECRET === 'dev_jwt_refresh_secret_123' ||
    !process.env.JWT_TEMP_SECRET ||
    env.JWT_TEMP_SECRET === 'dev_jwt_temp_secret_123'
  ) {
    throw new Error('CRITICAL SECURITY CONFIGURATION ERROR: Production environment detected with missing or default JWT secrets (Access, Refresh, or 2FA Temp secret)!');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('CRITICAL SECURITY CONFIGURATION ERROR: DATABASE_URL must be provided in production.');
  }
}

