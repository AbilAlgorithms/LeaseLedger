import { asyncHandler } from '../utils/asyncHandler.js';
import * as propertyService from '../services/property.service.js';

export const createProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.createProperty(req.user._id, req.body, req);
  res.status(201).json({
    success: true,
    data: property,
    message: 'Property created successfully',
  });
});

export const getProperties = asyncHandler(async (req, res) => {
  const properties = await propertyService.getProperties(req.user._id, req.query);
  res.json({
    success: true,
    data: properties,
  });
});

export const getPropertyById = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyById(req.params.id, req.user);
  res.json({
    success: true,
    data: property,
  });
});

export const updateProperty = asyncHandler(async (req, res) => {
  const updated = await propertyService.updateProperty(req.params.id, req.user._id, req.body, req);
  res.json({
    success: true,
    data: updated,
    message: 'Property updated successfully',
  });
});

export const toggleArchiveProperty = asyncHandler(async (req, res) => {
  const property = await propertyService.toggleArchiveProperty(req.params.id, req.user._id, req);
  res.json({
    success: true,
    data: property,
    message: property.archived ? 'Property archived' : 'Property restored',
  });
});

export const addRoom = asyncHandler(async (req, res) => {
  const room = await propertyService.addRoom(req.params.id, req.user._id, req.body);
  res.status(201).json({
    success: true,
    data: room,
    message: 'Room added successfully',
  });
});
