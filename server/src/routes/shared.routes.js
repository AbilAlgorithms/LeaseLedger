import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';

const router = Router();

// Public routes for shareable reports
router.get('/reports/:token', reportController.getPublicReport);
router.get('/reports/:token/download', reportController.downloadPublicReport);

export default router;
