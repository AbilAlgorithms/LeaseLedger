import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const conditionRecordSchema = new Schema(
  {
    inspection: {
      type: Schema.Types.ObjectId,
      ref: 'Inspection',
      required: [true, 'Inspection reference is required'],
      index: true,
    },
    item: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: [true, 'Inventory item reference is required'],
      index: true,
    },
    itemName: {
      type: String,
      required: [true, 'Item name snapshot is required'],
      trim: true,
    },
    roomName: {
      type: String,
      required: [true, 'Room name snapshot is required'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Condition rating is required'],
      min: 0,
      max: 5,
    },
    ratingLabel: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    disputed: {
      type: Boolean,
      default: false,
    },
    disputedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    disputedAt: {
      type: Date,
    },
    disputeReason: {
      type: String,
      default: '',
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

conditionRecordSchema.index({ inspection: 1, item: 1 }, { unique: true });

// Immutability Guard: Verify parent inspection is not LOCKED before saving or updating
conditionRecordSchema.pre('save', async function (next) {
  const Inspection = mongoose.model('Inspection');
  const parent = await Inspection.findById(this.inspection).select('status').lean();
  if (parent && parent.status === 'LOCKED') {
    const err = new Error('Cannot modify condition record; parent inspection is locked.');
    err.code = 'INSPECTION_LOCKED';
    err.statusCode = 409;
    return next(err);
  }
  next();
});

const queryLockGuard = async function (next) {
  const query = this.getQuery();
  const existing = await this.model.findOne(query).select('inspection').lean();
  if (existing) {
    const Inspection = mongoose.model('Inspection');
    const parent = await Inspection.findById(existing.inspection).select('status').lean();
    if (parent && parent.status === 'LOCKED') {
      const err = new Error('Cannot update condition record; parent inspection is locked.');
      err.code = 'INSPECTION_LOCKED';
      err.statusCode = 409;
      return next(err);
    }
  }
  next();
};

['updateOne', 'findOneAndUpdate', 'updateMany', 'deleteOne', 'findOneAndDelete'].forEach((hook) => {
  conditionRecordSchema.pre(hook, queryLockGuard);
});

applyToJSON(conditionRecordSchema);

export default mongoose.models.ConditionRecord || mongoose.model('ConditionRecord', conditionRecordSchema);
