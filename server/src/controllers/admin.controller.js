import * as adminService from '../services/admin.service.js';

export async function getUsers(req, res, next) {
  try {
    const data = await adminService.listUsers(req.query);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function suspendUser(req, res, next) {
  try {
    const user = await adminService.suspendUser(req.params.id, req.user._id, req);
    res.status(200).json({
      success: true,
      message: `User ${user.email} suspended successfully`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function reinstateUser(req, res, next) {
  try {
    const user = await adminService.reinstateUser(req.params.id, req.user._id, req);
    res.status(200).json({
      success: true,
      message: `User ${user.email} reinstated successfully`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function getConfig(req, res, next) {
  try {
    const config = await adminService.getConfig(req.params.key);
    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateConfig(req, res, next) {
  try {
    const config = await adminService.updateConfig(
      req.params.key,
      req.body,
      req.user._id,
      req
    );
    res.status(200).json({
      success: true,
      message: `Configuration for ${req.params.key} updated`,
      data: config,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(req, res, next) {
  try {
    const data = await adminService.listAuditLogs(req.query);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    const stats = await adminService.getAdminStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}
