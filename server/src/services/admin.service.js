import { User, Property, Tenancy, Inspection, AuditLog, Config, Comparison, Report } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { logAudit } from './audit.service.js';

export async function listUsers({ search = '', role, status, page = 1, limit = 20 }) {
  const query = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [{ name: regex }, { email: regex }];
  }

  if (role) {
    query.role = role.toUpperCase();
  }

  if (status) {
    if (status === 'SUSPENDED') query.isActive = false;
    if (status === 'ACTIVE') query.isActive = true;
  }

  const numericPage = Math.max(1, parseInt(page, 10));
  const numericLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (numericPage - 1) * numericLimit;

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(numericLimit),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      pages: Math.ceil(total / numericLimit),
    },
  };
}

export async function suspendUser(userId, adminId, req = null) {
  if (userId.toString() === adminId.toString()) {
    throw ApiError.badRequest('Administrators cannot suspend their own account');
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (user.role === 'ADMIN') {
    throw ApiError.forbidden('Cannot suspend another administrator');
  }

  user.isActive = false;
  await user.save();

  await logAudit({
    user: adminId,
    action: 'USER_SUSPENDED',
    entity: { model: 'User', id: user._id },
    meta: { targetEmail: user.email },
    req,
  });

  return user;
}

export async function reinstateUser(userId, adminId, req = null) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  user.isActive = true;
  await user.save();

  await logAudit({
    user: adminId,
    action: 'USER_REINSTATED',
    entity: { model: 'User', id: user._id },
    meta: { targetEmail: user.email },
    req,
  });

  return user;
}

export async function getConfig(key) {
  const config = await Config.findOne({ key });
  if (!config) {
    // Return sensible defaults if not yet customized
    if (key === 'conditionScale') {
      return {
        key: 'conditionScale',
        value: {
          5: 'EXCELLENT',
          4: 'GOOD',
          3: 'FAIR',
          2: 'POOR',
          1: 'VERY_POOR',
        },
        description: 'Standard 5-point condition rating scale',
      };
    }
    if (key === 'itemCategories') {
      return {
        key: 'itemCategories',
        value: [
          'WALLS_FLOORS',
          'FIXTURES',
          'FURNITURE',
          'APPLIANCES',
          'DOORS_WINDOWS',
          'SAFETY_SECURITY',
          'EXTERIOR',
          'OTHER',
        ],
        description: 'Global item inventory categories',
      };
    }
    throw ApiError.notFound(`Configuration for '${key}' not found`);
  }
  return config;
}

export async function updateConfig(key, { value, description }, adminId, req = null) {
  const config = await Config.findOneAndUpdate(
    { key },
    { value, description, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await logAudit({
    user: adminId,
    action: 'CONFIG_UPDATED',
    entity: { model: 'Config', id: config._id },
    meta: { key, value },
    req,
  });

  return config;
}

export async function listAuditLogs({ action, userId, page = 1, limit = 50 }) {
  const query = {};
  if (action) query.action = action;
  if (userId) query.user = userId;

  const numericPage = Math.max(1, parseInt(page, 10));
  const numericLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (numericPage - 1) * numericLimit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(numericLimit),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      pages: Math.ceil(total / numericLimit),
    },
  };
}

export async function getAdminStats() {
  const [
    totalUsers,
    landlordCount,
    tenantCount,
    totalProperties,
    activeTenancies,
    completedTenancies,
    lockedInspections,
    totalComparisons,
    totalReports,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'LANDLORD' }),
    User.countDocuments({ role: 'TENANT' }),
    Property.countDocuments(),
    Tenancy.countDocuments({ status: 'ACTIVE' }),
    Tenancy.countDocuments({ status: 'COMPLETED' }),
    Inspection.countDocuments({ status: 'LOCKED' }),
    Comparison.countDocuments(),
    Report.countDocuments(),
  ]);

  return {
    users: {
      total: totalUsers,
      landlords: landlordCount,
      tenants: tenantCount,
    },
    properties: totalProperties,
    tenancies: {
      active: activeTenancies,
      completed: completedTenancies,
    },
    inspections: {
      locked: lockedInspections,
    },
    comparisons: totalComparisons,
    reports: totalReports,
  };
}
