import { asyncHandler } from '../utils/asyncHandler.js';
import * as propertyService from '../services/property.service.js';

export const updateItem = asyncHandler(async (req, res) => {
  const item = await propertyService.updateItem(req.params.id, req.user._id, req.body);
  res.json({
    success: true,
    data: item,
    message: 'Inventory item updated successfully',
  });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const result = await propertyService.deleteItem(req.params.id, req.user._id);
  res.json({
    success: true,
    data: result,
    message: result.message,
  });
});
