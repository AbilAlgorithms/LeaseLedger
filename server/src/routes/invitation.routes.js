import { Router } from 'express';
import * as invitationController from '../controllers/invitation.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = Router();

// Public: Validate invitation token
router.get('/:token', invitationController.validateInvitation);

// Protected: Accept invitation (Tenant only)
router.post('/:token/accept', auth, rbac('TENANT'), invitationController.acceptInvitation);

export default router;
