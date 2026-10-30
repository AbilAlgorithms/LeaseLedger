import { Router } from 'express';
import * as tenancyController from '../controllers/tenancy.controller.js';
import * as invitationController from '../controllers/invitation.controller.js';
import * as inspectionController from '../controllers/inspection.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createTenancySchema,
  updateTenancySchema,
  createInvitationSchema,
} from '../validators/tenancy.validator.js';
import { createInspectionSchema } from '../validators/inspection.validator.js';

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

export default router;
