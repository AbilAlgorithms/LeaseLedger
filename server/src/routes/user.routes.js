import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/user.validator.js';

const router = Router();

router.use(auth);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateProfileSchema), userController.updateMe);
router.get('/me/export', userController.exportMe);
router.delete('/me', userController.deleteMe);

export default router;
