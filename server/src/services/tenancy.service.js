import { Tenancy, Property, User, Inspection, Invitation, IssueReport, Comparison, Report } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { logAudit } from './audit.service.js';
import * as invitationService from './invitation.service.js';

export async function assertTenancyParticipant(tenancyId, user) {
  const tenancy = await Tenancy.findById(tenancyId)
    .populate('property')
    .populate('landlord', 'name email phone role')
    .populate('tenants', 'name email phone role');

  if (!tenancy) throw ApiError.notFound('Tenancy not found');

  if (user.role === 'ADMIN') return tenancy;

  const isLandlord = tenancy.landlord._id.toString() === user._id.toString();
  const isTenant = tenancy.tenants.some((t) => t._id.toString() === user._id.toString());

  if (!isLandlord && !isTenant) {
    throw ApiError.forbidden('You are not an authorized participant in this tenancy', 'NOT_TENANCY_PARTICIPANT');
  }

  return tenancy;
}

export async function createTenancy(landlordId, { propertyId, startDate, endDate, notes = '', inviteEmail = '' }, req = null) {
  const property = await Property.findById(propertyId);
  if (!property) throw ApiError.notFound('Property not found');
  if (property.landlord.toString() !== landlordId.toString()) {
    throw ApiError.forbidden('You do not own this property', 'NOT_PROPERTY_OWNER');
  }

  const tenancy = await Tenancy.create({
    property: propertyId,
    landlord: landlordId,
    tenants: [],
    startDate,
    endDate,
    notes,
    status: 'PENDING',
  });

  await logAudit({
    user: landlordId,
    action: 'TENANCY_CREATED',
    entity: { model: 'Tenancy', id: tenancy._id },
    meta: { propertyId, startDate, endDate },
    req,
  });

  // Automatically generate invitation link if requested
  let invitation = null;
  if (inviteEmail) {
    invitation = await invitationService.createInvitation(tenancy._id, landlordId, { email: inviteEmail }, req);
  }

  return {
    tenancy,
    invitation,
  };
}

export async function getTenancies(user, { status = null } = {}) {
  const query = {};

  if (user.role === 'LANDLORD') {
    query.landlord = user._id;
  } else if (user.role === 'TENANT') {
    query.tenants = user._id;
  } else if (user.role === 'ADMIN') {
    // Admin sees all
  }

  if (status) {
    query.status = status;
  }

  return Tenancy.find(query)
    .populate('property', 'name address type')
    .populate('landlord', 'name email')
    .populate('tenants', 'name email')
    .sort({ createdAt: -1 });
}

export async function getTenancyById(tenancyId, user) {
  const tenancy = await assertTenancyParticipant(tenancyId, user);

  // Retrieve associated inspections
  const inspections = await Inspection.find({ tenancy: tenancyId }).sort({ createdAt: 1 });

  // Retrieve active invitations
  const invitations = await Invitation.find({
    tenancy: tenancyId,
    status: { $in: ['PENDING', 'ACCEPTED'] },
  }).sort({ createdAt: -1 });

  // Retrieve mid-tenancy issues
  const issues = await IssueReport.find({ tenancy: tenancyId }).sort({ createdAt: -1 });

  // Retrieve comparison and latest report if available
  const comparison = await Comparison.findOne({ tenancy: tenancyId });
  const report = await Report.findOne({ tenancy: tenancyId }).sort({ version: -1 });

  return {
    ...tenancy.toJSON(),
    inspections,
    invitations: user.role === 'LANDLORD' || user.role === 'ADMIN' ? invitations : [],
    issues,
    comparison,
    report,
  };
}

export async function updateTenancy(tenancyId, landlordId, data, req = null) {
  const tenancy = await Tenancy.findById(tenancyId);
  if (!tenancy) throw ApiError.notFound('Tenancy not found');
  if (tenancy.landlord.toString() !== landlordId.toString()) {
    throw ApiError.forbidden('Only the property landlord may edit tenancy terms');
  }

  const allowedUpdates = ['startDate', 'endDate', 'notes', 'status'];
  for (const field of allowedUpdates) {
    if (data[field] !== undefined) {
      tenancy[field] = data[field];
    }
  }

  await tenancy.save();

  await logAudit({
    user: landlordId,
    action: 'TENANCY_UPDATED',
    entity: { model: 'Tenancy', id: tenancyId },
    meta: data,
    req,
  });

  return tenancy;
}
