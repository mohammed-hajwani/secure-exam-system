import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100, 'Name must not exceed 100 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  batch: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100, 'Name must not exceed 100 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['ADMIN', 'FACULTY', 'STUDENT'], {
    errorMap: () => ({ message: "Role must be one of 'ADMIN', 'FACULTY', or 'STUDENT'" })
  }),
  batch: z.string().optional().nullable()
});

export const createQuestionSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(100),
  type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'], {
    errorMap: () => ({ message: "Type must be 'MCQ', 'TRUE_FALSE', or 'SHORT_ANSWER'" })
  }),
  text: z.string().min(1, 'Question text is required'),
  marks: z.number().positive('Marks must be greater than 0').default(1.0).optional(),
  options: z.array(
    z.object({
      text: z.string().min(1, 'Option text cannot be empty'),
      isCorrect: z.boolean().default(false)
    })
  ).optional()
}).superRefine((data, ctx) => {
  if (data.type === 'MCQ') {
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MCQ questions require at least 2 options',
        path: ['options']
      });
    } else if (!data.options.some(opt => opt.isCorrect)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one option must be marked as correct',
        path: ['options']
      });
    }
  } else if (data.type === 'TRUE_FALSE') {
    if (!data.options || data.options.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'TRUE_FALSE questions must have exactly 2 options',
        path: ['options']
      });
    } else if (!data.options.some(opt => opt.isCorrect)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one option must be marked as correct',
        path: ['options']
      });
    }
  }
});

export const updateQuestionSchema = z.object({
  subject: z.string().min(1).max(100).optional(),
  type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']).optional(),
  text: z.string().min(1).optional(),
  marks: z.number().positive().optional(),
  options: z.array(
    z.object({
      text: z.string().min(1, 'Option text cannot be empty'),
      isCorrect: z.boolean().default(false)
    })
  ).optional()
}).superRefine((data, ctx) => {
  if (data.type === 'MCQ' && data.options) {
    if (data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MCQ questions require at least 2 options',
        path: ['options']
      });
    } else if (!data.options.some(opt => opt.isCorrect)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one option must be marked as correct',
        path: ['options']
      });
    }
  } else if (data.type === 'TRUE_FALSE' && data.options) {
    if (data.options.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'TRUE_FALSE questions must have exactly 2 options',
        path: ['options']
      });
    } else if (!data.options.some(opt => opt.isCorrect)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one option must be marked as correct',
        path: ['options']
      });
    }
  }
});

export const createExamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  subject: z.string().min(1, 'Subject is required').max(100),
  targetBatch: z.string().min(1, 'Target batch is required').max(50),
  durationMinutes: z.number().int().positive('Duration must be a positive number of minutes'),
  startTime: z.string().datetime({ message: 'Start time must be a valid ISO date string' }).or(z.string().min(1)),
  endTime: z.string().datetime({ message: 'End time must be a valid ISO date string' }).or(z.string().min(1)),
  maxViolations: z.number().int().positive().default(3).optional(),
  questionIds: z.array(z.string().uuid({ message: 'Each questionId must be a valid UUID' })).min(1, 'At least one question must be linked to the exam')
}).refine((data) => {
  const start = new Date(data.startTime).getTime();
  const end = new Date(data.endTime).getTime();
  return !isNaN(start) && !isNaN(end) && end > start;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const updateExamSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  subject: z.string().min(1).max(100).optional(),
  targetBatch: z.string().min(1).max(50).optional(),
  durationMinutes: z.number().int().positive().optional(),
  startTime: z.string().datetime().or(z.string().min(1)).optional(),
  endTime: z.string().datetime().or(z.string().min(1)).optional(),
  maxViolations: z.number().int().positive().optional(),
  questionIds: z.array(z.string().uuid()).min(1).optional()
}).refine((data) => {
  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime).getTime();
    const end = new Date(data.endTime).getTime();
    return !isNaN(start) && !isNaN(end) && end > start;
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const verifyOtpSchema = z.object({
  tempToken: z.string().min(1, 'Temporary 2FA token is required'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code')
});

export const resendOtpSchema = z.object({
  tempToken: z.string().min(1, 'Temporary 2FA token is required')
});

export const saveAnswerSchema = z.object({
  questionId: z.string().uuid({ message: 'questionId must be a valid UUID' }),
  selectedOptionId: z.string().uuid({ message: 'selectedOptionId must be a valid UUID' }).optional().nullable(),
  textAnswer: z.string().optional().nullable()
}).refine((data) => {
  const hasOption = data.selectedOptionId !== undefined && data.selectedOptionId !== null;
  const hasText = data.textAnswer !== undefined && data.textAnswer !== null;
  return hasOption || hasText;
}, {
  message: 'Either selectedOptionId or textAnswer must be provided'
});

export const VIOLATION_TYPES = [
  'TAB_SWITCH',
  'FULLSCREEN_EXIT',
  'WINDOW_BLUR',
  'DEVTOOLS_OPEN',
  'MULTIPLE_FACES',
  'FACE_NOT_DETECTED',
  'SUSPICIOUS_KEY_COMBINATION'
];

export const recordViolationSchema = z.object({
  type: z.enum(VIOLATION_TYPES, {
    errorMap: () => ({ message: `Violation type must be one of: ${VIOLATION_TYPES.join(', ')}` })
  }),
  details: z.any().optional()
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive is required as a boolean' })
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters long')
    .max(128)
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'New password must contain at least one special character')
});



