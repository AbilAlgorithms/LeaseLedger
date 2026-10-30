import { Router } from 'express';
import * as itemController from '../controllers/item.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { updateItemSchema } from '../validators/property.validator.js';

const router = Router();

router.use(auth);
router.use(rbac('LANDLORD'));

router.patch('/:id', validate(updateItemSchema), itemController.updateItem);
router.delete('/:id', itemController.deleteItem);

export default router;
