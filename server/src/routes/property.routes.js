import { Router } from 'express';
import * as propertyController from '../controllers/property.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createPropertySchema,
  updatePropertySchema,
  createRoomSchema,
} from '../validators/property.validator.js';

const router = Router();

router.use(auth);

// Landlords manage properties
router.post('/', rbac('LANDLORD'), validate(createPropertySchema), propertyController.createProperty);
router.get('/', rbac('LANDLORD'), propertyController.getProperties);
router.get('/:id', propertyController.getPropertyById);
router.patch('/:id', rbac('LANDLORD'), validate(updatePropertySchema), propertyController.updateProperty);
router.post('/:id/archive', rbac('LANDLORD'), propertyController.toggleArchiveProperty);
router.post('/:id/rooms', rbac('LANDLORD'), validate(createRoomSchema), propertyController.addRoom);

export default router;
