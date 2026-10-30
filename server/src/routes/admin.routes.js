import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  listUsersSchema,
  updateConfigSchema,
  listAuditLogsSchema,
} from '../validators/admin.validator.js';

const router = Router();

// All admin routes strictly require ADMIN role
router.use(auth);
router.use(rbac('ADMIN'));

router.get('/stats', adminController.getStats);
router.get('/users', validate(listUsersSchema), adminController.getUsers);
router.patch('/users/:id/suspend', adminController.suspendUser);
router.patch('/users/:id/reinstate', adminController.reinstateUser);

router.get('/config/:key', adminController.getConfig);
router.put('/config/:key', validate(updateConfigSchema), adminController.updateConfig);

router.get('/audit-logs', validate(listAuditLogsSchema), adminController.getAuditLogs);

export default router;
