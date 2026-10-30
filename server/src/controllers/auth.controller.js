import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, req);
  res.status(201).json({
    success: true,
    message: result.message,
    data: {
      user: result.user,
      ...(result.verifyToken ? { verifyToken: result.verifyToken } : {}),
    },
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.params.token);
  res.json({
    success: true,
    message: result.message,
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, req);
  res.cookie('jwt_refresh', result.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.jwt_refresh || req.body.refreshToken;
  const result = await authService.refresh(token);
  res.cookie('jwt_refresh', result.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({
    success: true,
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('jwt_refresh', { path: '/' });
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.json({
    success: true,
    message: result.message,
    ...(result.resetToken ? { resetToken: result.resetToken } : {}),
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.params.token, req.body.password);
  res.json({
    success: true,
    message: result.message,
  });
});
