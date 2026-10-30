import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import propertyRoutes from './property.routes.js';
import roomRoutes from './room.routes.js';
import itemRoutes from './item.routes.js';
import tenancyRoutes from './tenancy.routes.js';
import invitationRoutes from './invitation.routes.js';
import inspectionRoutes from './inspection.routes.js';
import amendmentRoutes from './amendment.routes.js';
import issueRoutes from './issue.routes.js';
import notificationRoutes from './notification.routes.js';
import sharedRoutes from './shared.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/properties', propertyRoutes);
router.use('/rooms', roomRoutes);
router.use('/items', itemRoutes);
router.use('/tenancies', tenancyRoutes);
router.use('/invitations', invitationRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/amendments', amendmentRoutes);
router.use('/issues', issueRoutes);
router.use('/notifications', notificationRoutes);
router.use('/shared', sharedRoutes);
router.use('/admin', adminRoutes);

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LeaseLedger REST API v1 Active',
    version: '1.0.0',
    documentation: '/docs/API.md',
  });
});

export default router;
