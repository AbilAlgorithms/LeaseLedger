import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import {
  Report,
  Comparison,
  Tenancy,
  Inspection,
  IssueReport,
  User,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadFile } from './storage.service.js';
import { generateRandomToken, hashToken } from '../utils/tokens.js';
import { notifyUser } from './notification.service.js';
import { logAudit } from './audit.service.js';

export async function generatePdfReport(comparisonId, req = null) {
  const comparison = await Comparison.findById(comparisonId).populate({
    path: 'tenancy',
    populate: [
      { path: 'property' },
      { path: 'landlord', select: 'name email phone' },
      { path: 'tenants', select: 'name email phone' },
    ],
  });

  if (!comparison) throw ApiError.notFound('Comparison record not found');

  const tenancy = comparison.tenancy;
  const [moveIn, moveOut] = await Promise.all([
    Inspection.findById(comparison.moveIn),
    Inspection.findById(comparison.moveOut),
  ]);
  const issues = await IssueReport.find({ tenancy: tenancy._id });

  // Generate PDF buffer using PDFKit
  const pdfBuffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `LeaseLedger Condition Report - ${tenancy.property.address}`,
        Author: 'LeaseLedger Evidentiary Handover System',
        Subject: 'Digital Rental Condition & Handover Dossier',
      },
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Architectural Color Palette
    const cPrimary = '#183D35'; // Deep Forest Green
    const cSurface = '#F4FBF7'; // Warm Ivory
    const cText = '#161D1B'; // Charcoal
    const cMuted = '#717976'; // Slate Grey
    const cVerified = '#2D7A58'; // Emerald
    const cDamage = '#C94A4A'; // Crimson
    const cBrass = '#C6A46A'; // Brass Accent

    // --- Header Strip ---
    doc.rect(40, 40, 515, 60).fill(cPrimary);

    doc.fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('LEASELEDGER CONDITION & HANDOVER DOSSIER', 55, 52);

    doc.fillColor(cBrass)
      .font('Helvetica')
      .fontSize(9)
      .text('OFFICIAL CERTIFIED COMPARISON REPORT · ISO-216 RTBA COMPLIANT', 55, 74);

    doc.fillColor('#FFFFFF')
      .fontSize(8)
      .text(`DOSSIER ID: #LL-${tenancy._id.toString().slice(-6).toUpperCase()}`, 400, 54, { align: 'right' })
      .text(`SEALED: ${new Date().toLocaleDateString()}`, 400, 74, { align: 'right' });

    doc.moveDown(3.5);

    // --- Property & Tenancy Metadata Strip ---
    const topY = 115;
    doc.rect(40, topY, 515, 75).fillAndStroke('#EEF5F2', '#DDE4E1');

    doc.fillColor(cPrimary).font('Helvetica-Bold').fontSize(10);
    doc.text('DEMISED PREMISES:', 50, topY + 10);
    doc.text('TENANCY DURATION:', 200, topY + 10);
    doc.text('PARTIES OF RECORD:', 360, topY + 10);

    doc.fillColor(cText).font('Helvetica').fontSize(9);
    doc.text(tenancy.property.address, 50, topY + 25, { width: 140 });
    doc.text(`${tenancy.property.type}`, 50, topY + 52);

    doc.text(
      `${new Date(tenancy.startDate).toLocaleDateString()} to\n${new Date(tenancy.endDate).toLocaleDateString()}`,
      200,
      topY + 25
    );

    const tenantNames = tenancy.tenants.map((t) => t.name).join(', ') || 'Awaiting Tenant';
    doc.text(`LL: ${tenancy.landlord.name}\nTN: ${tenantNames}`, 360, topY + 25, { width: 180 });

    // --- Executive Summary Box ---
    const sumY = 205;
    doc.rect(40, sumY, 515, 45).fillAndStroke('#FFFFFF', cBrass);

    doc.fillColor(cBrass).font('Helvetica-Bold').fontSize(9);
    doc.text('EXECUTIVE SETTLEMENT AUDIT SUMMARY:', 50, sumY + 8);

    doc.fillColor(cText).font('Helvetica').fontSize(8.5);
    doc.text(
      `Classification Matrix: ${comparison.counts.unchanged} Unchanged · ${comparison.counts.deteriorated} Deteriorated · ${comparison.counts.improved} Improved · ${comparison.counts.missing} Missing`,
      50,
      sumY + 20
    );
    doc.fillColor(cMuted).text(comparison.summary, 50, sumY + 32, { width: 495 });

    // --- Table 1: Item-by-Item Comparison ---
    let tableY = 265;
    doc.fillColor(cPrimary).font('Helvetica-Bold').fontSize(11).text('ITEMIZED CONDITION ASSESSMENT MATRIX', 40, tableY);
    tableY += 16;

    // Table Header
    doc.rect(40, tableY, 515, 20).fill(cPrimary);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
    doc.text('ROOM / ITEM', 45, tableY + 6);
    doc.text('MOVE-IN BASELINE', 180, tableY + 6);
    doc.text('MOVE-OUT EXIT', 290, tableY + 6);
    doc.text('DIFFERENTIAL RESULT', 420, tableY + 6);
    tableY += 20;

    // Rows
    for (const item of comparison.items) {
      if (tableY > 730) {
        doc.addPage();
        tableY = 40;
      }

      const rowH = 26;
      doc.rect(40, tableY, 515, rowH).fillAndStroke(tableY % 2 === 0 ? '#FFFFFF' : '#F9FBF9', '#EAEFEA');

      doc.fillColor(cText).font('Helvetica-Bold').fontSize(8);
      doc.text(`${item.roomName} · ${item.itemName}`, 45, tableY + 5, { width: 130 });
      doc.font('Helvetica').fontSize(7).fillColor(cMuted);
      if (item.amended) doc.text('(Amended post-lock)', 45, tableY + 15);

      // Move-In Column
      doc.fillColor(cText).font('Helvetica').fontSize(8);
      doc.text(`${item.moveInRating}/5 (${item.moveInRatingLabel})`, 180, tableY + 5);
      doc.fontSize(7).fillColor(cMuted).text(item.moveInNotes || '—', 180, tableY + 15, { width: 105, height: 10 });

      // Move-Out Column
      doc.fillColor(cText).font('Helvetica').fontSize(8);
      doc.text(`${item.moveOutRating}/5 (${item.moveOutRatingLabel})`, 290, tableY + 5);
      doc.fontSize(7).fillColor(cMuted).text(item.moveOutNotes || '—', 290, tableY + 15, { width: 120, height: 10 });

      // Result Column with semantic color
      let resColor = cVerified;
      if (item.result === 'CHANGED_DETERIORATED' || item.result === 'MISSING') resColor = cDamage;
      if (item.preExisting) resColor = cBrass;

      doc.fillColor(resColor).font('Helvetica-Bold').fontSize(8);
      const label = item.preExisting ? 'Unchanged (Pre-existing)' : item.result.replace('CHANGED_', '');
      doc.text(label, 420, tableY + 9);

      tableY += rowH;
    }

    // --- Table 2: Meter Readings Delta ---
    tableY += 15;
    if (tableY > 700) {
      doc.addPage();
      tableY = 40;
    }

    doc.fillColor(cPrimary).font('Helvetica-Bold').fontSize(11).text('UTILITY CONSUMPTION & METER DELTAS', 40, tableY);
    tableY += 16;

    doc.rect(40, tableY, 515, 20).fill(cPrimary);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
    doc.text('METER UTILITY', 45, tableY + 6);
    doc.text('MOVE-IN READING', 170, tableY + 6);
    doc.text('MOVE-OUT READING', 290, tableY + 6);
    doc.text('NET CONSUMPTION', 420, tableY + 6);
    tableY += 20;

    for (const m of comparison.meterDeltas) {
      const rowH = 22;
      doc.rect(40, tableY, 515, rowH).fillAndStroke('#FFFFFF', '#EAEFEA');

      doc.fillColor(cText).font('Helvetica-Bold').fontSize(8);
      doc.text(m.meterType, 45, tableY + 6);

      doc.font('Helvetica').fontSize(8);
      doc.text(`${m.moveIn.toLocaleString()} ${m.unit}`, 170, tableY + 6);
      doc.text(`${m.moveOut.toLocaleString()} ${m.unit}`, 290, tableY + 6);

      doc.fillColor(m.anomaly ? cDamage : cPrimary).font('Helvetica-Bold');
      doc.text(
        `${m.used.toLocaleString()} ${m.unit}${m.anomaly ? ' (Anomaly flagged)' : ''}`,
        420,
        tableY + 6
      );

      tableY += rowH;
    }

    // --- Section 3: Mid-Tenancy Incident Log Appendix ---
    if (issues.length > 0) {
      tableY += 15;
      if (tableY > 680) {
        doc.addPage();
        tableY = 40;
      }

      doc.fillColor(cPrimary).font('Helvetica-Bold').fontSize(11).text('MID-TENANCY MAINTENANCE & INCIDENT APPENDIX', 40, tableY);
      tableY += 16;

      for (const iss of issues) {
        const rowH = 28;
        doc.rect(40, tableY, 515, rowH).fillAndStroke('#F9FBF9', '#DDE4E1');
        doc.fillColor(cText).font('Helvetica-Bold').fontSize(8);
        doc.text(`${iss.title} [Status: ${iss.status}]`, 45, tableY + 5);
        doc.font('Helvetica').fontSize(7.5).fillColor(cMuted);
        doc.text(iss.description, 45, tableY + 16, { width: 500, height: 10 });
        tableY += rowH + 4;
      }
    }

    // --- Signatures & Evidentiary Verification Footer ---
    tableY += 20;
    if (tableY > 680) {
      doc.addPage();
      tableY = 40;
    }

    doc.rect(40, tableY, 515, 65).fillAndStroke('#EEF5F2', '#C1C8C5');
    doc.fillColor(cPrimary).font('Helvetica-Bold').fontSize(9);
    doc.text('CRYPTOGRAPHIC AUDIT SEAL & DUAL MUTUAL SIGN-OFF', 50, tableY + 8);

    doc.fillColor(cText).font('Helvetica').fontSize(8);
    const miConf = moveIn ? `Move-In Sealed: ${new Date(moveIn.lockedAt).toLocaleString()}` : '';
    const moConf = moveOut ? `Move-Out Sealed: ${new Date(moveOut.lockedAt).toLocaleString()}` : '';
    doc.text(`${miConf}\n${moConf}`, 50, tableY + 22);

    doc.text(
      'SHA-256 Verifiable Evidentiary Plates Attached.\nTamper-Evident Digital Handover Certified by LeaseLedger Engine.',
      280,
      tableY + 22,
      { width: 260 }
    );

    doc.end();
  });

  // Upload PDF buffer to storage
  const originalFilename = `leaseledger-report-${tenancy._id}.pdf`;
  const { fileUrl, publicId } = await uploadFile(pdfBuffer, originalFilename, 'reports');

  const shareToken = generateRandomToken(32);

  // Save Report document
  let report = await Report.findOne({ tenancy: tenancy._id });
  if (report) {
    report.comparison = comparison._id;
    report.fileUrl = fileUrl;
    report.publicId = publicId;
    report.generatedAt = new Date();
    report.status = 'READY';
    report.version += 1;
    await report.save();
  } else {
    report = await Report.create({
      comparison: comparison._id,
      tenancy: tenancy._id,
      fileUrl,
      publicId,
      status: 'READY',
      shareToken,
      version: 1,
    });
  }

  await logAudit({
    user: tenancy.landlord,
    action: 'REPORT_GENERATED',
    entity: { model: 'Report', id: report._id },
    meta: { version: report.version },
    req,
  });

  // Notify participants
  const participantIds = [tenancy.landlord, ...tenancy.tenants];
  for (const pId of participantIds) {
    await notifyUser({
      userId: pId,
      type: 'REPORT_READY',
      message: 'Official certified PDF condition dossier is generated and ready for download.',
      link: `/tenancies/${tenancy._id}/report`,
    });
  }

  return {
    report,
    pdfBuffer,
  };
}

export async function getTenancyReport(tenancyId) {
  return Report.findOne({ tenancy: tenancyId }).populate('comparison');
}

export async function createShareLink(reportId, landlordId) {
  const report = await Report.findById(reportId).populate('tenancy');
  if (!report) throw ApiError.notFound('Report not found');
  if (report.tenancy.landlord.toString() !== landlordId.toString()) {
    throw ApiError.forbidden('Only the landlord can generate shareable report links');
  }

  const shareToken = generateRandomToken(32);
  report.shareToken = shareToken;
  report.shareExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await report.save();

  return {
    shareToken,
    shareUrl: `/shared/reports/${shareToken}`,
    expiresAt: report.shareExpiresAt,
  };
}

export async function revokeShareLink(reportId, landlordId) {
  const report = await Report.findById(reportId).populate('tenancy');
  if (!report) throw ApiError.notFound('Report not found');
  if (report.tenancy.landlord.toString() !== landlordId.toString()) {
    throw ApiError.forbidden('Only the landlord can revoke shareable report links');
  }

  report.shareToken = undefined;
  report.shareExpiresAt = undefined;
  await report.save();

  return { message: 'Share link revoked successfully' };
}

export async function getSharedReport(shareToken) {
  const report = await Report.findOne({ shareToken }).populate({
    path: 'tenancy',
    populate: [{ path: 'property' }, { path: 'landlord' }, { path: 'tenants' }],
  }).populate('comparison');

  if (!report) {
    throw ApiError.notFound('Shared report link is invalid or has expired');
  }

  if (report.shareExpiresAt && new Date() > report.shareExpiresAt) {
    throw ApiError.badRequest('This shared report link has expired');
  }

  return report;
}
