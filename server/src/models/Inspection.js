import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const confirmationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    confirmedAt: {
      type: Date,
      default: Date.now,
    },
    ip: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const inspectionSchema = new Schema(
  {
    tenancy: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: [true, 'Tenancy reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['MOVE_IN', 'MOVE_OUT'],
      required: [true, 'Inspection type is required'],
    },
    status: {
      type: String,
      enum: ['DRAFT', 'IN_REVIEW', 'LOCKED'],
      default: 'DRAFT',
      required: true,
    },
    confirmations: [confirmationSchema],
    lockedAt: {
      type: Date,
    },
    startedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

inspectionSchema.index({ tenancy: 1, type: 1 }, { unique: true });

// Immutability Guard: Block any modification to an inspection once LOCKED
const lockGuard = async function (next) {
  // If the query explicitly sets status to LOCKED as part of atomic transition, allow it
  const update = this.getUpdate();
  if (update && (update.$set?.status === 'LOCKED' || update.status === 'LOCKED')) {
    return next();
  }

  const query = this.getQuery();
  const existing = await this.model.findOne(query).select('status').lean();
  if (existing && existing.status === 'LOCKED') {
    const err = new Error('Inspection is locked and immutable. Add an amendment instead.');
    err.code = 'INSPECTION_LOCKED';
    err.statusCode = 409;
    return next(err);
  }
  next();
};

['updateOne', 'findOneAndUpdate', 'updateMany', 'deleteOne', 'findOneAndDelete'].forEach((hook) => {
  inspectionSchema.pre(hook, lockGuard);
});

applyToJSON(inspectionSchema);

export default mongoose.models.Inspection || mongoose.model('Inspection', inspectionSchema);
