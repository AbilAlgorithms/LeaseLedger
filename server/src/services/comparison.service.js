import {
  Comparison,
  Inspection,
  ConditionRecord,
  Photo,
  MeterReading,
  Amendment,
  Tenancy,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { notifyUser } from './notification.service.js';
import { logAudit } from './audit.service.js';

export async function runComparison(tenancyId, req = null) {
  const tenancy = await Tenancy.findById(tenancyId).populate('property');
  if (!tenancy) throw ApiError.notFound('Tenancy not found');

  const [moveIn, moveOut] = await Promise.all([
    Inspection.findOne({ tenancy: tenancyId, type: 'MOVE_IN' }),
    Inspection.findOne({ tenancy: tenancyId, type: 'MOVE_OUT' }),
  ]);

  if (!moveIn || moveIn.status !== 'LOCKED') {
    throw ApiError.badRequest('Move-In inspection must be completed and locked before running comparison');
  }

  if (!moveOut || moveOut.status !== 'LOCKED') {
    throw ApiError.badRequest('Move-Out inspection must be completed and locked before running comparison');
  }

  // 1. Retrieve records and photos for both inspections
  const [moveInRecords, moveOutRecords] = await Promise.all([
    ConditionRecord.find({ inspection: moveIn._id }),
    ConditionRecord.find({ inspection: moveOut._id }),
  ]);

  const [moveInPhotos, moveOutPhotos] = await Promise.all([
    Photo.find({ ownerModel: 'ConditionRecord', ownerId: { $in: moveInRecords.map((r) => r._id) } }),
    Photo.find({ ownerModel: 'ConditionRecord', ownerId: { $in: moveOutRecords.map((r) => r._id) } }),
  ]);

  // Apply amendments if any exist for move-in or move-out
  const [moveInAmendments, moveOutAmendments] = await Promise.all([
    Amendment.find({ inspection: moveIn._id }),
    Amendment.find({ inspection: moveOut._id }),
  ]);

  const amendMap = {};
  for (const a of [...moveInAmendments, ...moveOutAmendments]) {
    amendMap[a.target.id.toString()] = a;
  }

  // Map out photos by record ID
  const photosByRecord = {};
  for (const p of [...moveInPhotos, ...moveOutPhotos]) {
    const rId = p.ownerId.toString();
    if (!photosByRecord[rId]) photosByRecord[rId] = [];
    photosByRecord[rId].push(p.fileUrl);
  }

  // 2. Map Move-Out records by item ID (or roomName+itemName snapshot)
  const moveOutMap = new Map();
  for (const mo of moveOutRecords) {
    const key = mo.item ? mo.item.toString() : `${mo.roomName}_${mo.itemName}`;
    moveOutMap.set(key, mo);
  }

  const comparedItems = [];
  const counts = {
    unchanged: 0,
    deteriorated: 0,
    improved: 0,
    missing: 0,
    total: 0,
  };

  // 3. Match items and detect differences
  for (const mi of moveInRecords) {
    counts.total += 1;
    const key = mi.item ? mi.item.toString() : `${mi.roomName}_${mi.itemName}`;
    const mo = moveOutMap.get(key);

    const miPhotos = photosByRecord[mi._id.toString()] || [];
    const moPhotos = mo ? photosByRecord[mo._id.toString()] || [] : [];

    const miAmend = amendMap[mi._id.toString()];
    const moAmend = mo ? amendMap[mo._id.toString()] : null;

    if (!mo) {
      // Item missing at move out
      counts.missing += 1;
      comparedItems.push({
        itemId: mi.item,
        roomName: mi.roomName,
        itemName: mi.itemName,
        moveInRating: mi.rating,
        moveInRatingLabel: mi.ratingLabel,
        moveOutRating: 0,
        moveOutRatingLabel: 'MISSING',
        moveInNotes: mi.notes,
        moveOutNotes: 'Not present during move-out inspection',
        moveInPhotos: miPhotos,
        moveOutPhotos: [],
        result: 'MISSING',
        preExisting: false,
      });
      continue;
    }

    // Both present: compare ratings
    const miRating = mi.rating;
    const moRating = mo.rating;

    let result = 'UNCHANGED';
    let preExisting = false;

    // Detect pre-existing wear: move-in was <= 3 or had defects recorded
    const miHasDefect =
      miRating <= 3 ||
      /crack|stain|scratch|chip|leak|damaged|dent|mark/i.test(mi.notes || '');

    if (moRating === miRating) {
      result = 'UNCHANGED';
      counts.unchanged += 1;
      if (miHasDefect) {
        preExisting = true;
      }
    } else if (moRating < miRating) {
      result = 'CHANGED_DETERIORATED';
      counts.deteriorated += 1;
    } else if (moRating > miRating) {
      result = 'IMPROVED';
      counts.improved += 1;
    }

    comparedItems.push({
      itemId: mi.item,
      roomName: mi.roomName,
      itemName: mi.itemName,
      moveInRating: miRating,
      moveInRatingLabel: mi.ratingLabel,
      moveOutRating: moRating,
      moveOutRatingLabel: mo.ratingLabel,
      moveInNotes: mi.notes,
      moveOutNotes: mo.notes,
      moveInPhotos: miPhotos,
      moveOutPhotos: moPhotos,
      result,
      preExisting,
      amended: !!(miAmend || moAmend),
      amendmentNote: moAmend ? moAmend.reason : miAmend ? miAmend.reason : '',
    });
  }

  // 4. Utility Meter Readings Delta
  const [moveInMeters, moveOutMeters] = await Promise.all([
    MeterReading.find({ inspection: moveIn._id }),
    MeterReading.find({ inspection: moveOut._id }),
  ]);

  const moveOutMetersMap = new Map();
  for (const m of moveOutMeters) {
    moveOutMetersMap.set(m.meterType, m);
  }

  const meterDeltas = [];
  const meterSummaryParts = [];

  for (const miMeter of moveInMeters) {
    const moMeter = moveOutMetersMap.get(miMeter.meterType);
    const moVal = moMeter ? moMeter.value : miMeter.value;
    const used = moVal - miMeter.value;
    const anomaly = used < 0;

    meterDeltas.push({
      meterType: miMeter.meterType,
      moveIn: miMeter.value,
      moveOut: moVal,
      used,
      unit: miMeter.unit || 'units',
      anomaly,
    });

    meterSummaryParts.push(
      `${miMeter.meterType.toLowerCase()} used ${used.toLocaleString()} ${miMeter.unit || 'units'}`
    );
  }

  // 5. Construct Summary String
  const summaryParts = [];
  if (counts.deteriorated > 0) {
    summaryParts.push(`${counts.deteriorated} item${counts.deteriorated === 1 ? '' : 's'} worse`);
  }
  if (counts.improved > 0) {
    summaryParts.push(`${counts.improved} improved`);
  }
  if (counts.missing > 0) {
    summaryParts.push(`${counts.missing} missing`);
  }
  if (counts.deteriorated === 0 && counts.missing === 0) {
    summaryParts.push('All items in original or improved baseline condition');
  }

  const summary = `${summaryParts.join(', ')}; ${meterSummaryParts.join(', ')}`;

  // 6. Upsert Comparison record
  let comparison = await Comparison.findOne({ tenancy: tenancyId });
  if (comparison) {
    comparison.moveIn = moveIn._id;
    comparison.moveOut = moveOut._id;
    comparison.items = comparedItems;
    comparison.meterDeltas = meterDeltas;
    comparison.counts = counts;
    comparison.summary = summary;
    comparison.version += 1;
    await comparison.save();
  } else {
    comparison = await Comparison.create({
      tenancy: tenancyId,
      moveIn: moveIn._id,
      moveOut: moveOut._id,
      items: comparedItems,
      meterDeltas,
      counts,
      summary,
      version: 1,
    });
  }

  // 7. Transition Tenancy to COMPLETED
  tenancy.status = 'COMPLETED';
  await tenancy.save();

  // 8. Notifications & Audit
  const participantIds = [tenancy.landlord, ...tenancy.tenants];
  for (const pId of participantIds) {
    await notifyUser({
      userId: pId,
      type: 'COMPARISON_READY',
      message: `Move-Out comparison completed: ${summary}`,
      link: `/tenancies/${tenancyId}/comparison`,
    });
  }

  await logAudit({
    user: tenancy.landlord,
    action: 'COMPARISON_GENERATED',
    entity: { model: 'Comparison', id: comparison._id },
    meta: { summary, counts },
    req,
  });

  return comparison;
}

export async function getTenancyComparison(tenancyId) {
  return Comparison.findOne({ tenancy: tenancyId })
    .populate('moveIn', 'lockedAt type status')
    .populate('moveOut', 'lockedAt type status');
}
