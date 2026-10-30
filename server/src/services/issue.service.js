import { IssueReport, Tenancy, Photo } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadFile } from './storage.service.js';
import { notifyUser } from './notification.service.js';
import { logAudit } from './audit.service.js';
import { assertTenancyParticipant } from './tenancy.service.js';

export async function createIssue(tenancyId, { title, description }, files = [], user, req = null) {
  const tenancy = await assertTenancyParticipant(tenancyId, user);

  const photosData = [];
  if (files && files.length > 0) {
    for (const file of files) {
      const { fileUrl, publicId, sha256 } = await uploadFile(file.buffer, file.originalname, 'issues');
      photosData.push({
        fileUrl,
        sha256,
        uploadedAt: new Date(),
      });
    }
  }

  const issue = await IssueReport.create({
    tenancy: tenancyId,
    reportedBy: user._id,
    title: title.trim(),
    description: description.trim(),
    photos: photosData,
    status: 'OPEN',
  });

  // Notify counterpart
  const isLandlord = tenancy.landlord._id.toString() === user._id.toString();
  const recipientIds = isLandlord ? tenancy.tenants.map((t) => t._id) : [tenancy.landlord._id];

  for (const rId of recipientIds) {
    await notifyUser({
      userId: rId,
      type: 'ISSUE_REPORTED',
      message: `New mid-tenancy issue reported: "${issue.title}" at ${tenancy.property.address}`,
      link: `/tenancies/${tenancyId}/issues`,
    });
  }

  await logAudit({
    user: user._id,
    action: 'ISSUE_REPORTED',
    entity: { model: 'IssueReport', id: issue._id },
    meta: { title: issue.title, photoCount: photosData.length },
    req,
  });

  return issue;
}

export async function getTenancyIssues(tenancyId, user) {
  await assertTenancyParticipant(tenancyId, user);
  return IssueReport.find({ tenancy: tenancyId })
    .populate('reportedBy', 'name email role')
    .sort({ createdAt: -1 });
}

export async function updateIssueStatus(issueId, { status, resolutionNotes = '' }, user, req = null) {
  const issue = await IssueReport.findById(issueId).populate('tenancy');
  if (!issue) throw ApiError.notFound('Issue report not found');

  await assertTenancyParticipant(issue.tenancy._id, user);

  issue.status = status;
  if (resolutionNotes) issue.resolutionNotes = resolutionNotes;
  if (status === 'RESOLVED') {
    issue.resolvedAt = new Date();
  }
  await issue.save();

  // Notify reporter
  if (issue.reportedBy.toString() !== user._id.toString()) {
    await notifyUser({
      userId: issue.reportedBy,
      type: 'ISSUE_STATUS_UPDATED',
      message: `Issue "${issue.title}" status updated to ${status}`,
      link: `/tenancies/${issue.tenancy._id}/issues`,
    });
  }

  await logAudit({
    user: user._id,
    action: 'ISSUE_STATUS_UPDATED',
    entity: { model: 'IssueReport', id: issue._id },
    meta: { status, resolutionNotes },
    req,
  });

  return issue;
}
