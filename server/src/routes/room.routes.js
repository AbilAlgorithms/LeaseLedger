import { Router } from 'express';
import * as roomController from '../controllers/room.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { updateRoomSchema, createItemSchema } from '../validators/property.validator.js';

const router = Router();

router.use(auth);
router.use(rbac('LANDLORD'));

router.patch('/:id', validate(updateRoomSchema), roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);
router.post('/:id/items', validate(createItemSchema), roomController.addItem);

export default router;
