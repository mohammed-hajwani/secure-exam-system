import * as adminService from '../services/adminService.js';

/**
 * Handle Admin user creation: POST /api/v1/admin/users
 */
export const createUser = async (req, res, next) => {
  try {
    const user = await adminService.createUserByAdmin(req.body);
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Admin listing all users: GET /api/v1/admin/users
 */
export const listUsers = async (req, res, next) => {
  try {
    const { role, batch, search, isActive, limit, offset } = req.query;
    const result = await adminService.listUsers({
      role,
      batch,
      search,
      isActive,
      limit,
      offset
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user status toggle: PATCH /api/v1/admin/users/:id/status
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const updatedUser = await adminService.updateUserStatus({
      targetUserId: id,
      isActive,
      adminUserId: req.user.userId
    });

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle fetching audit logs: GET /api/v1/admin/audit-logs
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { eventType, userId, limit, offset } = req.query;
    const result = await adminService.getAuditLogs({
      eventType,
      userId,
      limit,
      offset
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

