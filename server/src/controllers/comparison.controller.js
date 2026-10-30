import { runComparison, getTenancyComparison } from '../services/comparison.service.js';
import { Tenancy } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

async function assertTenancyParticipant(tenancyId, user) {
  const tenancy = await Tenancy.findById(tenancyId);
  if (!tenancy) throw ApiError.notFound('Tenancy not found');

  if (user.role === 'ADMIN') return tenancy;

  const isLandlord = tenancy.landlord.toString() === user._id.toString();
  const isTenant = tenancy.tenants.some((t) => t.toString() === user._id.toString());

  if (!isLandlord && !isTenant) {
    throw ApiError.forbidden('Access denied to this tenancy');
  }

  return tenancy;
}

export async function runTenancyComparison(req, res, next) {
  try {
    await assertTenancyParticipant(req.params.id, req.user);
    const comparison = await runComparison(req.params.id, req);
    res.status(200).json({
      success: true,
      message: 'Comparison engine executed successfully',
      data: comparison,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTenancyComparisonData(req, res, next) {
  try {
    await assertTenancyParticipant(req.params.id, req.user);
    const comparison = await getTenancyComparison(req.params.id);
    if (!comparison) {
      throw ApiError.notFound('Comparison has not been generated for this tenancy yet');
    }
    res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (err) {
    next(err);
  }
}
