import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

const SALT_ROUNDS = 12;

/**
 * Create a new user with an explicit role (ADMIN, FACULTY, or STUDENT)
 */
export const createUserByAdmin = async ({ name, email, password, role, batch }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for duplicate email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password using BCrypt with cost factor 12
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user in PostgreSQL
  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      batch: batch ? batch.trim() : null
    },
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

  return newUser;
};

/**
 * List all users with optional filtering by role, batch, active status, or search query
 */
export const listUsers = async ({ role, batch, search, isActive, limit = 50, offset = 0 }) => {
  const where = {};

  if (role) {
    where.role = role;
  }

  if (batch) {
    where.batch = {
      contains: batch.trim(),
      mode: 'insensitive'
    };
  }

  if (isActive !== undefined && isActive !== null) {
    where.isActive = isActive === true || isActive === 'true';
  }

  if (search) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { email: { contains: search.trim(), mode: 'insensitive' } }
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        batch: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            attempts: true,
            examsCreated: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })
  ]);

  return {
    total,
    count: users.length,
    users
  };
};

/**
 * Toggle user active status (activate / deactivate)
 */
export const updateUserStatus = async ({ targetUserId, isActive, adminUserId }) => {
  if (targetUserId === adminUserId) {
    const error = new Error('You cannot deactivate your own administrator account');
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId }
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive: Boolean(isActive) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      batch: true,
      isActive: true
    }
  });

  // If user was deactivated, revoke all active refresh tokens immediately
  if (!isActive) {
    await prisma.refreshToken.updateMany({
      where: { userId: targetUserId, isRevoked: false },
      data: { isRevoked: true }
    });
  }

  // Audit log the status update
  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      eventType: 'USER_STATUS_CHANGE',
      details: JSON.stringify({
        targetUserId,
        targetEmail: user.email,
        newStatus: Boolean(isActive)
      })
    }
  });

  return updatedUser;
};

/**
 * Get append-only system audit logs with filtering
 */
export const getAuditLogs = async ({ eventType, userId, limit = 50, offset = 0 }) => {
  const where = {};

  if (eventType) {
    where.eventType = eventType;
  }

  if (userId) {
    where.userId = userId;
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        attempt: {
          select: {
            id: true,
            examId: true,
            status: true,
            score: true,
            exam: {
              select: {
                title: true
              }
            }
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })
  ]);

  return {
    total,
    count: logs.length,
    logs
  };
};

