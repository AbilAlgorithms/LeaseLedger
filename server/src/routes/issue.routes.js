import { Router } from 'express';
import * as issueController from '../controllers/issue.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateIssueStatusSchema } from '../validators/issue.validator.js';

const router = Router();

router.use(auth);

router.patch('/:id/status', validate(updateIssueStatusSchema), issueController.updateIssueStatus);

export default router;
