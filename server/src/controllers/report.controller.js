import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  generatePdfReport,
  getTenancyReport,
  createShareLink,
  revokeShareLink,
  getSharedReport,
} from '../services/report.service.js';
import { runComparison, getTenancyComparison } from '../services/comparison.service.js';
import { Tenancy, Report } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localUploadsDir = path.resolve(__dirname, '../../../storage/uploads');

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

export async function generateReport(req, res, next) {
  try {
    await assertTenancyParticipant(req.params.id, req.user);

    let comparison = await getTenancyComparison(req.params.id);
    if (!comparison) {
      comparison = await runComparison(req.params.id, req);
    }

    const { report } = await generatePdfReport(comparison._id, req);

    res.status(201).json({
      success: true,
      message: 'Official certified PDF dossier generated successfully',
      data: report,
    });
  } catch (err) {
    next(err);
  }
}

export async function getReport(req, res, next) {
  try {
    await assertTenancyParticipant(req.params.id, req.user);
    const report = await getTenancyReport(req.params.id);
    if (!report) {
      throw ApiError.notFound('Certified report has not been generated for this tenancy yet');
    }
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadReport(req, res, next) {
  try {
    await assertTenancyParticipant(req.params.id, req.user);
    const report = await getTenancyReport(req.params.id);
    if (!report || !report.fileUrl) {
      throw ApiError.notFound('Report file not found. Please generate the report first.');
    }

    if (report.fileUrl.startsWith('http')) {
      return res.redirect(report.fileUrl);
    }

    const filename = path.basename(report.fileUrl);
    const filePath = path.join(localUploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound('PDF file not found on server disk');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="leaseledger-report-${req.params.id}.pdf"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

export async function shareReport(req, res, next) {
  try {
    const report = await getTenancyReport(req.params.id);
    if (!report) {
      throw ApiError.notFound('Report not found. Generate the report before sharing.');
    }

    const shareData = await createShareLink(report._id, req.user._id);
    res.status(200).json({
      success: true,
      message: 'Shareable report link created',
      data: shareData,
    });
  } catch (err) {
    next(err);
  }
}

export async function revokeReportShare(req, res, next) {
  try {
    const report = await getTenancyReport(req.params.id);
    if (!report) {
      throw ApiError.notFound('Report not found');
    }

    const result = await revokeShareLink(report._id, req.user._id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}

// Public endpoints (no authentication required)
export async function getPublicReport(req, res, next) {
  try {
    const report = await getSharedReport(req.params.token);
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadPublicReport(req, res, next) {
  try {
    const report = await getSharedReport(req.params.token);
    if (!report.fileUrl) {
      throw ApiError.notFound('Report PDF is missing');
    }

    if (report.fileUrl.startsWith('http')) {
      return res.redirect(report.fileUrl);
    }

    const filename = path.basename(report.fileUrl);
    const filePath = path.join(localUploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound('Report PDF not found on disk');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="leaseledger-shared-report.pdf"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}
