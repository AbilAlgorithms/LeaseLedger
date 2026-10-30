import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';
import { User } from '../models/index.js';

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user.toJSON(),
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;

  await req.user.save();

  res.json({
    success: true,
    data: req.user.toJSON(),
    message: 'Profile updated successfully',
  });
});

export const exportMe = asyncHandler(async (req, res) => {
  const exportData = await authService.exportUserData(req.user._id);
  res.json({
    success: true,
    data: exportData,
  });
});

export const deleteMe = asyncHandler(async (req, res) => {
  const result = await authService.deleteOrAnonymizeUser(req.user._id);
  res.clearCookie('jwt_refresh', { path: '/' });
  res.json({
    success: true,
    message: result.message,
  });
});
