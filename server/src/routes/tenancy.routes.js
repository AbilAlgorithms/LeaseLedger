import { Router } from 'express';
import * as tenancyController from '../controllers/tenancy.controller.js';
import * as invitationController from '../controllers/invitation.controller.js';
import * as inspectionController from '../controllers/inspection.controller.js';
import * as issueController from '../controllers/issue.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { uploadMultiple } from '../middleware/upload.js';
import {
  createTenancySchema,
  updateTenancySchema,
  createInvitationSchema,
} from '../validators/tenancy.validator.js';
import { createInspectionSchema } from '../validators/inspection.validator.js';
import { createIssueSchema } from '../validators/issue.validator.js';

const router = Router();

router.use(auth);

router.post('/', rbac('LANDLORD'), validate(createTenancySchema), tenancyController.createTenancy);
router.get('/', tenancyController.getTenancies);
router.get('/:id', tenancyController.getTenancyById);
router.patch('/:id', rbac('LANDLORD'), validate(updateTenancySchema), tenancyController.updateTenancy);

// Tenancy invitations sub-routes
router.post(
  '/:id/invitations',
  rbac('LANDLORD'),
  validate(createInvitationSchema),
  invitationController.createInvitation
);
router.post('/:id/invitations/:invId/revoke', rbac('LANDLORD'), invitationController.revokeInvitation);

// Tenancy inspections sub-routes
router.post('/:id/inspections', validate(createInspectionSchema), inspectionController.createOrGetInspection);

// Tenancy issues sub-routes
router.post(
  '/:id/issues',
  uploadMultiple,
  validate(createIssueSchema),
  issueController.createIssue
);
router.get('/:id/issues', issueController.getTenancyIssues);

export default router;
