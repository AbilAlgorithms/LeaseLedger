import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);

export default router;
