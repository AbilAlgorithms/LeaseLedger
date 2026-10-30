import { asyncHandler } from '../utils/asyncHandler.js';
import * as inspectionService from '../services/inspection.service.js';
import { ApiError } from '../utils/ApiError.js';

export const createOrGetInspection = asyncHandler(async (req, res) => {
  const inspection = await inspectionService.createOrGetInspection(
    req.params.id,
    req.body.type,
    req.user._id
  );
  res.status(200).json({
    success: true,
    data: inspection,
  });
});

export const getInspectionDetails = asyncHandler(async (req, res) => {
  const details = await inspectionService.getInspectionDetails(req.params.id, req.user);
  res.json({
    success: true,
    data: details,
  });
});

export const updateConditionRecord = asyncHandler(async (req, res) => {
  const record = await inspectionService.updateConditionRecord(
    req.params.id,
    req.params.itemId,
    req.body,
    req.user._id
  );
  res.json({
    success: true,
    data: record,
    message: 'Condition record updated',
  });
});

export const addRecordPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Please upload an image file');
  }

  const photo = await inspectionService.addRecordPhoto(
    req.params.id,
    req.params.itemId,
    req.file.buffer,
    req.file.originalname,
    req.user._id
  );

  res.status(201).json({
    success: true,
    data: photo,
    message: 'Photo uploaded and hashed',
  });
});

export const deleteRecordPhoto = asyncHandler(async (req, res) => {
  const result = await inspectionService.deleteRecordPhoto(req.params.photoId, req.user._id);
  res.json({
    success: true,
    message: result.message,
  });
});

export const updateMeterReading = asyncHandler(async (req, res) => {
  const meter = await inspectionService.updateMeterReading(
    req.params.id,
    req.params.meterType,
    req.body
  );
  res.json({
    success: true,
    data: meter,
    message: 'Meter reading updated',
  });
});

export const submitInspection = asyncHandler(async (req, res) => {
  const inspection = await inspectionService.submitInspection(req.params.id, req.user._id);
  res.json({
    success: true,
    data: inspection,
    message: 'Inspection submitted for review',
  });
});

export const confirmInspection = asyncHandler(async (req, res) => {
  const result = await inspectionService.confirmInspection(req.params.id, req.user._id, req);
  res.json({
    success: true,
    data: result.inspection,
    locked: result.locked,
    message: result.message,
  });
});

export const disputeRecord = asyncHandler(async (req, res) => {
  const result = await inspectionService.disputeRecord(
    req.params.id,
    req.params.itemId,
    req.body.reason,
    req.user._id,
    req
  );
  res.json({
    success: true,
    data: result.record,
    message: result.message,
  });
});

export const createAmendment = asyncHandler(async (req, res) => {
  const amendment = await inspectionService.createAmendment(
    req.params.id,
    req.body,
    req.user._id,
    req
  );
  res.status(201).json({
    success: true,
    data: amendment,
    message: 'Amendment recorded',
  });
});

export const acknowledgeAmendment = asyncHandler(async (req, res) => {
  const amendment = await inspectionService.acknowledgeAmendment(req.params.id, req.user._id);
  res.json({
    success: true,
    data: amendment,
    message: 'Amendment acknowledged',
  });
});
