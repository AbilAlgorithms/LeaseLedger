import { Router } from 'express';
import * as inspectionController from '../controllers/inspection.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadSingle } from '../middleware/upload.js';
import {
  createInspectionSchema,
  updateConditionRecordSchema,
  updateMeterSchema,
  disputeRecordSchema,
  createAmendmentSchema,
} from '../validators/inspection.validator.js';

const router = Router();

router.use(auth);

// Inspection details
router.get('/:id', inspectionController.getInspectionDetails);

// Record updates & photo attachments
router.put('/:id/records/:itemId', validate(updateConditionRecordSchema), inspectionController.updateConditionRecord);
router.post('/:id/records/:itemId/photos', uploadSingle, inspectionController.addRecordPhoto);
router.delete('/photos/:photoId', inspectionController.deleteRecordPhoto);

// Meter readings
router.put('/:id/meters/:meterType', validate(updateMeterSchema), inspectionController.updateMeterReading);

// Workflow state transitions
router.post('/:id/submit', inspectionController.submitInspection);
router.post('/:id/confirm', inspectionController.confirmInspection);
router.post('/:id/records/:itemId/dispute', validate(disputeRecordSchema), inspectionController.disputeRecord);

// Post-lock amendments
router.post('/:id/amendments', validate(createAmendmentSchema), inspectionController.createAmendment);

export default router;
