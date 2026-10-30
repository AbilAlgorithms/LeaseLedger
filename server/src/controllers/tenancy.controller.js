import { asyncHandler } from '../utils/asyncHandler.js';
import * as tenancyService from '../services/tenancy.service.js';

export const createTenancy = asyncHandler(async (req, res) => {
  const result = await tenancyService.createTenancy(req.user._id, req.body, req);
  res.status(201).json({
    success: true,
    data: result.tenancy,
    invitation: result.invitation,
    message: 'Tenancy created successfully',
  });
});

export const getTenancies = asyncHandler(async (req, res) => {
  const tenancies = await tenancyService.getTenancies(req.user, req.query);
  res.json({
    success: true,
    data: tenancies,
  });
});

export const getTenancyById = asyncHandler(async (req, res) => {
  const tenancy = await tenancyService.getTenancyById(req.params.id, req.user);
  res.json({
    success: true,
    data: tenancy,
  });
});

export const updateTenancy = asyncHandler(async (req, res) => {
  const updated = await tenancyService.updateTenancy(req.params.id, req.user._id, req.body, req);
  res.json({
    success: true,
    data: updated,
    message: 'Tenancy updated successfully',
  });
});
