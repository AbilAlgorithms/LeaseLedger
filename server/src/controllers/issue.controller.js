import { asyncHandler } from '../utils/asyncHandler.js';
import * as issueService from '../services/issue.service.js';

export const createIssue = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const issue = await issueService.createIssue(
    req.params.id,
    req.body,
    files,
    req.user,
    req
  );
  res.status(201).json({
    success: true,
    data: issue,
    message: 'Maintenance issue reported successfully',
  });
});

export const getTenancyIssues = asyncHandler(async (req, res) => {
  const issues = await issueService.getTenancyIssues(req.params.id, req.user);
  res.json({
    success: true,
    data: issues,
  });
});

export const updateIssueStatus = asyncHandler(async (req, res) => {
  const issue = await issueService.updateIssueStatus(
    req.params.id,
    req.body,
    req.user,
    req
  );
  res.json({
    success: true,
    data: issue,
    message: 'Issue status updated',
  });
});
