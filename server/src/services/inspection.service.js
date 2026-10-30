import mongoose from 'mongoose';
import {
  Inspection,
  ConditionRecord,
  Photo,
  MeterReading,
  Amendment,
  Tenancy,
  InventoryItem,
  Room,
  Property,
  User,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadFile, deleteFile } from './storage.service.js';
import { notifyUser } from './notification.service.js';
import { logAudit } from './audit.service.js';

const RATING_LABELS = {
  5: 'EXCELLENT',
  4: 'GOOD',
  3: 'FAIR',
  2: 'POOR',
  1: 'DAMAGED',
  0: 'MISSING',
};

export async function createOrGetInspection(tenancyId, type, userId) {
  const tenancy = await Tenancy.findById(tenancyId);
  if (!tenancy) throw ApiError.notFound('Tenancy not found');

  // Verify participant
  const isLandlord = tenancy.landlord.toString() === userId.toString();
  const isTenant = tenancy.tenants.some((t) => t.toString() === userId.toString());
  if (!isLandlord && !isTenant) {
    throw ApiError.forbidden('You are not a participant in this tenancy');
  }

  // Precondition: Move-Out only allowed if Move-In is LOCKED
  if (type === 'MOVE_OUT') {
    const moveIn = await Inspection.findOne({ tenancy: tenancyId, type: 'MOVE_IN' });
    if (!moveIn || moveIn.status !== 'LOCKED') {
      throw ApiError.badRequest(
        'The Move-In inspection must be completed and locked before conducting Move-Out.',
        'MOVE_IN_NOT_LOCKED'
      );
    }
  }

  let inspection = await Inspection.findOne({ tenancy: tenancyId, type });
  if (!inspection) {
    inspection = await Inspection.create({
      tenancy: tenancyId,
      type,
      status: 'DRAFT',
      startedBy: userId,
    });
  }

  // Pre-populate ConditionRecords for all active items in the property
  const existingRecords = await ConditionRecord.find({ inspection: inspection._id }).select('item');
  const existingItemIds = new Set(existingRecords.map((r) => r.item.toString()));

  const items = await InventoryItem.find({
    property: tenancy.property,
    archived: false,
  }).populate('room');

  const recordsToInsert = [];
  for (const item of items) {
    if (!existingItemIds.has(item._id.toString())) {
      recordsToInsert.push({
        inspection: inspection._id,
        item: item._id,
        itemName: item.name,
        roomName: item.room?.name || 'Unassigned',
        rating: 4, // Default baseline rating GOOD
        ratingLabel: 'GOOD',
        notes: '',
        recordedBy: userId,
      });
    }
  }

  if (recordsToInsert.length > 0) {
    await ConditionRecord.insertMany(recordsToInsert);
  }

  // Initialize standard utility meters if not present
  const existingMeters = await MeterReading.find({ inspection: inspection._id }).select('meterType');
  const existingMeterTypes = new Set(existingMeters.map((m) => m.meterType));

  const standardMeters = [
    { meterType: 'ELECTRICITY', unit: 'kWh', value: 0 },
    { meterType: 'WATER', unit: 'kL', value: 0 },
    { meterType: 'GAS', unit: 'MJ', value: 0 },
  ];

  for (const sm of standardMeters) {
    if (!existingMeterTypes.has(sm.meterType)) {
      await MeterReading.create({
        inspection: inspection._id,
        meterType: sm.meterType,
        value: sm.value,
        unit: sm.unit,
      });
    }
  }

  return inspection;
}

export async function getInspectionDetails(inspectionId, user) {
  const inspection = await Inspection.findById(inspectionId).populate({
    path: 'tenancy',
    populate: [
      { path: 'property', select: 'name address type' },
      { path: 'landlord', select: 'name email phone' },
      { path: 'tenants', select: 'name email phone' },
    ],
  });

  if (!inspection) throw ApiError.notFound('Inspection not found');

  // Verify participant or admin
  const isLandlord = inspection.tenancy.landlord._id.toString() === user._id.toString();
  const isTenant = inspection.tenancy.tenants.some((t) => t._id.toString() === user._id.toString());
  const isAdmin = user.role === 'ADMIN';

  if (!isLandlord && !isTenant && !isAdmin) {
    throw ApiError.forbidden('Access denied to inspection record');
  }

  // Fetch condition records
  const records = await ConditionRecord.find({ inspection: inspectionId }).populate('item');
  const recordIds = records.map((r) => r._id);

  // Fetch associated photos
  const photos = await Photo.find({
    ownerModel: 'ConditionRecord',
    ownerId: { $in: recordIds },
  }).sort({ createdAt: 1 });

  // Map photos to records
  const recordsWithPhotos = records.map((r) => ({
    ...r.toJSON(),
    photos: photos.filter((p) => p.ownerId.toString() === r._id.toString()),
  }));

  // Fetch meter readings
  const meters = await MeterReading.find({ inspection: inspectionId });

  // Fetch amendments if locked
  const amendments = await Amendment.find({ inspection: inspectionId })
    .populate('author', 'name email role')
    .populate('acknowledgedBy.user', 'name');

  // If this is a MOVE_OUT inspection, fetch the baseline MOVE_IN records for side-by-side display!
  let moveInBaseline = null;
  if (inspection.type === 'MOVE_OUT') {
    const moveIn = await Inspection.findOne({ tenancy: inspection.tenancy._id, type: 'MOVE_IN' });
    if (moveIn) {
      const moveInRecords = await ConditionRecord.find({ inspection: moveIn._id });
      const moveInPhotos = await Photo.find({
        ownerModel: 'ConditionRecord',
        ownerId: { $in: moveInRecords.map((r) => r._id) },
      });
      const moveInMeters = await MeterReading.find({ inspection: moveIn._id });

      moveInBaseline = {
        inspection: moveIn,
        records: moveInRecords.map((r) => ({
          ...r.toJSON(),
          photos: moveInPhotos.filter((p) => p.ownerId.toString() === r._id.toString()),
        })),
        meters: moveInMeters,
      };
    }
  }

  // Group records by roomName for structured room-by-room wizard navigation
  const roomsMap = {};
  for (const record of recordsWithPhotos) {
    const room = record.roomName || 'Unassigned';
    if (!roomsMap[room]) roomsMap[room] = [];
    roomsMap[room].push(record);
  }

  return {
    ...inspection.toJSON(),
    records: recordsWithPhotos,
    roomsMap,
    meters,
    amendments,
    moveInBaseline,
  };
}

export async function updateConditionRecord(inspectionId, itemId, data, userId) {
  const inspection = await Inspection.findById(inspectionId);
  if (!inspection) throw ApiError.notFound('Inspection not found');

  if (inspection.status === 'LOCKED') {
    throw ApiError.conflict('Inspection is locked and immutable. Add an amendment instead.', 'INSPECTION_LOCKED');
  }

  const rating = Number(data.rating);
  const ratingLabel = data.ratingLabel || RATING_LABELS[rating] || 'FAIR';

  const record = await ConditionRecord.findOneAndUpdate(
    { inspection: inspectionId, item: itemId },
    {
      $set: {
        rating,
        ratingLabel,
        notes: data.notes || '',
        recordedBy: userId,
        recordedAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  );

  if (!record) {
    throw ApiError.notFound('Condition record not found for this item');
  }

  return record;
}

export async function addRecordPhoto(inspectionId, itemId, fileBuffer, originalFilename, userId) {
  const inspection = await Inspection.findById(inspectionId);
  if (!inspection) throw ApiError.notFound('Inspection not found');

  if (inspection.status === 'LOCKED') {
    throw ApiError.conflict('Cannot upload photos; inspection is locked.', 'INSPECTION_LOCKED');
  }

  const record = await ConditionRecord.findOne({ inspection: inspectionId, item: itemId });
  if (!record) throw ApiError.notFound('Condition record not found for this item');

  // Upload to storage with SHA-256 digest
  const { fileUrl, publicId, sha256 } = await uploadFile(fileBuffer, originalFilename);

  const photo = await Photo.create({
    ownerModel: 'ConditionRecord',
    ownerId: record._id,
    fileUrl,
    publicId,
    sha256,
    uploadedBy: userId,
    takenAt: new Date(),
  });

  return photo;
}

export async function deleteRecordPhoto(photoId, userId) {
  const photo = await Photo.findById(photoId);
  if (!photo) throw ApiError.notFound('Photo not found');

  // Verify parent record and inspection
  if (photo.ownerModel === 'ConditionRecord') {
    const record = await ConditionRecord.findById(photo.ownerId);
    if (record) {
      const inspection = await Inspection.findById(record.inspection);
      if (inspection && inspection.status === 'LOCKED') {
        throw ApiError.conflict('Cannot delete photo; inspection is locked.', 'INSPECTION_LOCKED');
      }
    }
  }

  await deleteFile(photo.publicId);
  await Photo.findByIdAndDelete(photoId);

  return { message: 'Photo deleted successfully' };
}

export async function updateMeterReading(inspectionId, meterType, data) {
  const inspection = await Inspection.findById(inspectionId);
  if (!inspection) throw ApiError.notFound('Inspection not found');

  if (inspection.status === 'LOCKED') {
    throw ApiError.conflict('Cannot update meter reading; inspection is locked.', 'INSPECTION_LOCKED');
  }

  const meter = await MeterReading.findOneAndUpdate(
    { inspection: inspectionId, meterType },
    {
      $set: {
        value: Number(data.value),
        unit: data.unit || 'units',
        readingDate: data.readingDate || new Date(),
        ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return meter;
}

export async function submitInspection(inspectionId, userId) {
  const inspection = await Inspection.findById(inspectionId).populate('tenancy');
  if (!inspection) throw ApiError.notFound('Inspection not found');

  if (inspection.status === 'LOCKED') {
    throw ApiError.conflict('Inspection is already locked.', 'INSPECTION_LOCKED');
  }

  inspection.status = 'IN_REVIEW';
  await inspection.save();

  // Notify other parties
  const isLandlord = inspection.tenancy.landlord.toString() === userId.toString();
  const recipientIds = isLandlord ? inspection.tenancy.tenants : [inspection.tenancy.landlord];

  for (const recipientId of recipientIds) {
    await notifyUser({
      userId: recipientId,
      type: 'INSPECTION_SUBMITTED',
      message: `${inspection.type} inspection submitted for mutual review and digital confirmation`,
      link: `/tenancies/${inspection.tenancy._id}/inspections/${inspection.type.toLowerCase().replace('_', '-')}/review`,
    });
  }

  return inspection;
}

export async function confirmInspection(inspectionId, userId, req = null) {
  const inspection = await Inspection.findById(inspectionId).populate('tenancy');
  if (!inspection) throw ApiError.notFound('Inspection not found');

  if (inspection.status === 'LOCKED') {
    return { locked: true, inspection, message: 'Inspection is already locked' };
  }

  const tenancy = inspection.tenancy;
  const isLandlord = tenancy.landlord.toString() === userId.toString();
  const isTenant = tenancy.tenants.some((t) => t.toString() === userId.toString());

  if (!isLandlord && !isTenant) {
    throw ApiError.forbidden('Only tenancy participants can confirm inspections');
  }

  const ip = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '';

  // Check if user already confirmed
  const alreadyConfirmed = inspection.confirmations.some(
    (c) => c.user.toString() === userId.toString()
  );

  if (!alreadyConfirmed) {
    inspection.confirmations.push({
      user: userId,
      confirmedAt: new Date(),
      ip: typeof ip === 'string' ? ip.split(',')[0].trim() : '',
    });
    await inspection.save();
  }

  // Check if both Landlord and at least one Tenant have confirmed
  const landlordConfirmed = inspection.confirmations.some(
    (c) => c.user.toString() === tenancy.landlord.toString()
  );
  const tenantConfirmed = inspection.confirmations.some((c) =>
    tenancy.tenants.some((t) => t.toString() === c.user.toString())
  );

  let locked = false;

  if (landlordConfirmed && tenantConfirmed) {
    // Atomically transition to LOCKED
    await Inspection.findByIdAndUpdate(inspectionId, {
      $set: {
        status: 'LOCKED',
        lockedAt: new Date(),
      },
    });
    locked = true;

    // If Move-In locked -> set tenancy ACTIVE
    if (inspection.type === 'MOVE_IN') {
      tenancy.status = 'ACTIVE';
      await tenancy.save();
    }

    // If Move-Out locked -> trigger Comparison Engine & PDF Report
    if (inspection.type === 'MOVE_OUT') {
      try {
        const { runComparison } = await import('./comparison.service.js');
        const comparison = await runComparison(tenancy._id);

        const { generatePdfReport } = await import('./report.service.js');
        await generatePdfReport(comparison._id);
      } catch (err) {
        console.error('[InspectionService] Error triggering comparison/report:', err.message);
      }
    }

    // Audit log
    await logAudit({
      user: userId,
      action: 'INSPECTION_LOCKED',
      entity: { model: 'Inspection', id: inspectionId },
      meta: { type: inspection.type, tenancyId: tenancy._id },
      req,
    });

    // Notify all participants
    const allParticipantIds = [tenancy.landlord, ...tenancy.tenants];
    for (const pId of allParticipantIds) {
      await notifyUser({
        userId: pId,
        type: 'INSPECTION_LOCKED',
        message: `${inspection.type} inspection is now mutually confirmed and permanently locked.`,
        link: `/tenancies/${tenancy._id}`,
      });
    }
  }

  const updatedInspection = await Inspection.findById(inspectionId);
  return {
    locked,
    inspection: updatedInspection,
    message: locked
      ? 'Dual confirmation achieved. Inspection is now locked and tamper-proof.'
      : 'Your confirmation has been recorded. Awaiting counterpart sign-off.',
  };
}

export async function disputeRecord(inspectionId, itemId, reason, userId, req = null) {
  const inspection = await Inspection.findById(inspectionId).populate('tenancy');
  if (!inspection) throw ApiError.notFound('Inspection not found');

  if (inspection.status === 'LOCKED') {
    throw ApiError.conflict('Cannot dispute records; inspection is already locked.', 'INSPECTION_LOCKED');
  }

  const record = await ConditionRecord.findOne({ inspection: inspectionId, item: itemId });
  if (!record) throw ApiError.notFound('Condition record not found');

  // Mark record as disputed
  record.disputed = true;
  record.disputedBy = userId;
  record.disputedAt = new Date();
  record.disputeReason = reason;
  await record.save();

  // Revert inspection back to DRAFT and clear all confirmations!
  inspection.status = 'DRAFT';
  inspection.confirmations = [];
  await inspection.save();

  // Log audit
  await logAudit({
    user: userId,
    action: 'DISPUTE_RAISED',
    entity: { model: 'ConditionRecord', id: record._id },
    meta: { itemName: record.itemName, reason },
    req,
  });

  // Notify counterpart
  const isLandlord = inspection.tenancy.landlord.toString() === userId.toString();
  const recipientIds = isLandlord ? inspection.tenancy.tenants : [inspection.tenancy.landlord];

  for (const rId of recipientIds) {
    await notifyUser({
      userId: rId,
      type: 'DISPUTE_RAISED',
      message: `A dispute was raised on "${record.itemName}". Inspection reverted to Draft for adjustment.`,
      link: `/tenancies/${inspection.tenancy._id}/inspections/${inspection.type.toLowerCase().replace('_', '-')}`,
    });
  }

  return {
    record,
    message: 'Dispute recorded. Inspection status reset to Draft and previous confirmations cleared.',
  };
}

export async function createAmendment(inspectionId, { reason, target, before, after }, userId, req = null) {
  const inspection = await Inspection.findById(inspectionId);
  if (!inspection) throw ApiError.notFound('Inspection not found');

  if (inspection.status !== 'LOCKED') {
    throw ApiError.badRequest('Amendments can only be submitted for locked inspections. Edit directly while in draft.');
  }

  const amendment = await Amendment.create({
    inspection: inspectionId,
    author: userId,
    reason,
    target,
    before,
    after,
    acknowledgedBy: [{ user: userId, acknowledgedAt: new Date() }],
  });

  await logAudit({
    user: userId,
    action: 'AMENDMENT_CREATED',
    entity: { model: 'Amendment', id: amendment._id },
    meta: { inspectionId, reason },
    req,
  });

  return amendment;
}

export async function acknowledgeAmendment(amendmentId, userId) {
  const amendment = await Amendment.findById(amendmentId);
  if (!amendment) throw ApiError.notFound('Amendment not found');

  const alreadyAck = amendment.acknowledgedBy.some((a) => a.user.toString() === userId.toString());
  if (!alreadyAck) {
    amendment.acknowledgedBy.push({ user: userId, acknowledgedAt: new Date() });
    await amendment.save();
  }

  return amendment;
}
