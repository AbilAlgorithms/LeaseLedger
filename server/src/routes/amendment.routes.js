import { Router } from 'express';
import * as inspectionController from '../controllers/inspection.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.post('/:id/acknowledge', inspectionController.acknowledgeAmendment);

export default router;
