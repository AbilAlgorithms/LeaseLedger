import { Invitation, Tenancy, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { generateRandomToken, hashToken } from '../utils/tokens.js';
import { sendTenancyInvitationEmail } from './mail.service.js';
import { notifyUser } from './notification.service.js';
import { logAudit } from './audit.service.js';
import { env } from '../config/env.js';

export async function createInvitation(tenancyId, landlordId, { email = '' } = {}, req = null) {
  const tenancy = await Tenancy.findById(tenancyId).populate('property');
  if (!tenancy) throw ApiError.notFound('Tenancy not found');
  if (tenancy.landlord.toString() !== landlordId.toString()) {
    throw ApiError.forbidden('Only the landlord can issue invitations');
  }

  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await Invitation.create({
    tenancy: tenancyId,
    email: email.trim().toLowerCase(),
    tokenHash,
    expiresAt,
    status: 'PENDING',
  });

  const landlord = await User.findById(landlordId);
  const joinUrl = `${env.CLIENT_URL}/join/${rawToken}`;

  // If email was provided, send transactional invitation email
  if (email.trim()) {
    sendTenancyInvitationEmail(email.trim(), landlord.name, tenancy.property.address, rawToken);
  }

  await logAudit({
    user: landlordId,
    action: 'INVITATION_ISSUED',
    entity: { model: 'Invitation', id: invitation._id },
    meta: { tenancyId, email },
    req,
  });

  return {
    id: invitation._id,
    token: rawToken,
    joinUrl,
    expiresAt,
    email: invitation.email,
    status: invitation.status,
  };
}

export async function validateInvitation(rawToken) {
  const tokenHash = hashToken(rawToken);
  const invitation = await Invitation.findOne({ tokenHash })
    .populate({
      path: 'tenancy',
      populate: [
        { path: 'property', select: 'name address type' },
        { path: 'landlord', select: 'name email phone' },
      ],
    });

  if (!invitation) {
    throw ApiError.notFound('Invitation link is invalid or has expired', 'INVALID_INVITATION');
  }

  if (invitation.status === 'ACCEPTED') {
    throw ApiError.conflict('This invitation link has already been accepted', 'INVITATION_ALREADY_ACCEPTED');
  }

  if (invitation.status === 'REVOKED') {
    throw ApiError.badRequest('This invitation link was revoked by the landlord', 'INVITATION_REVOKED');
  }

  if (new Date() > invitation.expiresAt) {
    invitation.status = 'EXPIRED';
    await invitation.save();
    throw ApiError.badRequest('This invitation link has expired', 'INVITATION_EXPIRED');
  }

  return {
    valid: true,
    email: invitation.email,
    expiresAt: invitation.expiresAt,
    tenancy: {
      id: invitation.tenancy._id,
      startDate: invitation.tenancy.startDate,
      endDate: invitation.tenancy.endDate,
      property: invitation.tenancy.property,
      landlord: invitation.tenancy.landlord,
    },
  };
}

export async function acceptInvitation(rawToken, tenantUser, req = null) {
  if (tenantUser.role !== 'TENANT') {
    throw ApiError.forbidden('Only users registered with the TENANT role may accept tenancy invitations', 'ROLE_NOT_TENANT');
  }

  const tokenHash = hashToken(rawToken);
  const invitation = await Invitation.findOne({ tokenHash }).populate({
    path: 'tenancy',
    populate: [{ path: 'property' }, { path: 'landlord' }],
  });

  if (!invitation || invitation.status !== 'PENDING' || new Date() > invitation.expiresAt) {
    throw ApiError.badRequest('Invitation is invalid, revoked, or expired', 'INVALID_INVITATION');
  }

  const tenancy = invitation.tenancy;

  // Add tenant if not already in array
  const alreadyInTenants = tenancy.tenants.some((id) => id.toString() === tenantUser._id.toString());
  if (!alreadyInTenants) {
    tenancy.tenants.push(tenantUser._id);
    await tenancy.save();
  }

  // Update invitation status
  invitation.status = 'ACCEPTED';
  invitation.acceptedBy = tenantUser._id;
  invitation.acceptedAt = new Date();
  await invitation.save();

  // Notify landlord
  await notifyUser({
    userId: tenancy.landlord._id,
    type: 'TENANT_JOINED',
    message: `${tenantUser.name} accepted your invitation and joined ${tenancy.property.address}`,
    link: `/tenancies/${tenancy._id}`,
    email: tenancy.landlord.email,
    emailSubject: `LeaseLedger — Tenant Joined ${tenancy.property.address}`,
    emailHtml: `<p><strong>${tenantUser.name}</strong> (${tenantUser.email}) has accepted the tenancy invitation for <strong>${tenancy.property.address}</strong>. You may now commence the mutual Move-In condition inspection.</p>`,
  });

  await logAudit({
    user: tenantUser._id,
    action: 'INVITATION_ACCEPTED',
    entity: { model: 'Tenancy', id: tenancy._id },
    meta: { tenantName: tenantUser.name, tenantEmail: tenantUser.email },
    req,
  });

  return {
    success: true,
    message: 'Invitation accepted! You have successfully joined the tenancy.',
    tenancyId: tenancy._id,
  };
}

export async function revokeInvitation(invitationId, landlordId) {
  const invitation = await Invitation.findById(invitationId).populate('tenancy');
  if (!invitation) throw ApiError.notFound('Invitation not found');
  if (invitation.tenancy.landlord.toString() !== landlordId.toString()) {
    throw ApiError.forbidden('Only the landlord can revoke invitations');
  }

  invitation.status = 'REVOKED';
  await invitation.save();
  return { message: 'Invitation revoked successfully' };
}
