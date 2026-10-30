import { asyncHandler } from '../utils/asyncHandler.js';
import * as propertyService from '../services/property.service.js';

export const updateRoom = asyncHandler(async (req, res) => {
  const room = await propertyService.updateRoom(req.params.id, req.user._id, req.body);
  res.json({
    success: true,
    data: room,
    message: 'Room updated successfully',
  });
});

export const deleteRoom = asyncHandler(async (req, res) => {
  const result = await propertyService.deleteRoom(req.params.id, req.user._id);
  res.json({
    success: true,
    message: result.message,
  });
});

export const addItem = asyncHandler(async (req, res) => {
  const item = await propertyService.addItem(req.params.id, req.user._id, req.body);
  res.status(201).json({
    success: true,
    data: item,
    message: 'Inventory item added successfully',
  });
});
