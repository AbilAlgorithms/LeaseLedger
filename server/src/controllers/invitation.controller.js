import { asyncHandler } from '../utils/asyncHandler.js';
import * as invitationService from '../services/invitation.service.js';

export const createInvitation = asyncHandler(async (req, res) => {
  const result = await invitationService.createInvitation(req.params.id, req.user._id, req.body, req);
  res.status(201).json({
    success: true,
    data: result,
    message: 'Invitation generated successfully',
  });
});

export const validateInvitation = asyncHandler(async (req, res) => {
  const result = await invitationService.validateInvitation(req.params.token);
  res.json({
    success: true,
    data: result,
  });
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const result = await invitationService.acceptInvitation(req.params.token, req.user, req);
  res.json({
    success: true,
    data: result,
  });
});

export const revokeInvitation = asyncHandler(async (req, res) => {
  const result = await invitationService.revokeInvitation(req.params.invId, req.user._id);
  res.json({
    success: true,
    message: result.message,
  });
});
