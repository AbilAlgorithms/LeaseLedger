import { User, Tenancy, Inspection, ConditionRecord, AuditLog } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateRandomToken,
  hashToken,
} from '../utils/tokens.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './mail.service.js';
import { logAudit } from './audit.service.js';

export async function register({ name, email, password, role, phone = '' }, req = null) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email address already exists');
  }

  const rawVerifyToken = generateRandomToken(32);
  const verifyTokenHash = hashToken(rawVerifyToken);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: password,
    role,
    phone,
    verifyTokenHash,
    emailVerified: false,
  });

  // Dispatch email asynchronously
  sendVerificationEmail(user.email, user.name, rawVerifyToken);

  await logAudit({
    user: user._id,
    action: 'USER_REGISTERED',
    entity: { model: 'User', id: user._id },
    meta: { email: user.email, role: user.role },
    req,
  });

  return {
    user,
    message: 'Registration successful. Please check your email to verify your account.',
    verifyToken: process.env.NODE_ENV !== 'production' ? rawVerifyToken : undefined,
  };
}

export async function verifyEmail(token) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({ verifyTokenHash: tokenHash });

  if (!user) {
    throw ApiError.badRequest('Invalid or expired email verification token', 'INVALID_TOKEN');
  }

  user.emailVerified = true;
  user.verifyTokenHash = undefined;
  await user.save();

  await logAudit({
    user: user._id,
    action: 'EMAIL_VERIFIED',
    entity: { model: 'User', id: user._id },
  });

  return { message: 'Email address verified successfully. You may now log in.' };
}

export async function login({ email, password }, req = null) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been suspended. Please contact administrator.', 'ACCOUNT_SUSPENDED');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await logAudit({
    user: user._id,
    action: 'USER_LOGIN',
    entity: { model: 'User', id: user._id },
    req,
  });

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken,
  };
}

export async function refresh(token) {
  if (!token) {
    throw ApiError.unauthorized('Refresh token is required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token', 'REFRESH_TOKEN_EXPIRED');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User not found or suspended');
  }

  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: user.toJSON(),
  };
}

export async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Return success to avoid email enumeration
    return { message: 'If an account exists with that email, a password reset link has been dispatched.' };
  }

  const rawToken = generateRandomToken(32);
  user.resetTokenHash = hashToken(rawToken);
  user.resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  sendPasswordResetEmail(user.email, user.name, rawToken);

  return {
    message: 'If an account exists with that email, a password reset link has been dispatched.',
    resetToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined,
  };
}

export async function resetPassword(token, newPassword) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    resetTokenHash: tokenHash,
    resetExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw ApiError.badRequest('Password reset token is invalid or has expired', 'INVALID_TOKEN');
  }

  user.passwordHash = newPassword;
  user.resetTokenHash = undefined;
  user.resetExpiresAt = undefined;
  await user.save();

  await logAudit({
    user: user._id,
    action: 'PASSWORD_RESET',
    entity: { model: 'User', id: user._id },
  });

  return { message: 'Password has been reset successfully. Please log in with your new credentials.' };
}

export async function exportUserData(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const tenancies = await Tenancy.find({
    $or: [{ landlord: userId }, { tenants: userId }],
  }).populate('property');

  const tenancyIds = tenancies.map((t) => t._id);
  const inspections = await Inspection.find({ tenancy: { $in: tenancyIds } });
  const auditLogs = await AuditLog.find({ user: userId }).sort({ timestamp: -1 });

  return {
    user: user.toJSON(),
    tenancies,
    inspections,
    auditLogs,
    exportedAt: new Date().toISOString(),
  };
}

export async function deleteOrAnonymizeUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  // Anonymize personal data in compliance with dispute retention obligations
  user.name = 'Deactivated User';
  user.email = `anonymized_${user._id}@leaseledger.test`;
  user.phone = '';
  user.isActive = false;
  user.emailVerified = false;
  user.verifyTokenHash = undefined;
  user.resetTokenHash = undefined;
  await user.save();

  await logAudit({
    user: user._id,
    action: 'USER_DELETED_ANONYMIZED',
    entity: { model: 'User', id: user._id },
  });

  return { message: 'Account data anonymized and deactivated in compliance with retention standards.' };
}
