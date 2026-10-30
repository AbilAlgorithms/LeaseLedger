import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const amendmentSchema = new Schema(
  {
    inspection: {
      type: Schema.Types.ObjectId,
      ref: 'Inspection',
      required: [true, 'Inspection reference is required'],
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
    },
    reason: {
      type: String,
      required: [true, 'Amendment reason is required'],
      trim: true,
    },
    target: {
      model: {
        type: String,
        required: true,
        enum: ['ConditionRecord', 'MeterReading'],
      },
      id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
    },
    before: {
      type: Schema.Types.Mixed,
      required: true,
    },
    after: {
      type: Schema.Types.Mixed,
      required: true,
    },
    acknowledgedBy: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        acknowledgedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Append-only rule: No update or delete operations permitted on Amendments
const blockModification = function (next) {
  const err = new Error('Amendments are append-only and cannot be altered or deleted.');
  err.code = 'AMENDMENT_IMMUTABLE';
  err.statusCode = 403;
  next(err);
};

['updateOne', 'findOneAndUpdate', 'updateMany', 'deleteOne', 'findOneAndDelete'].forEach((hook) => {
  amendmentSchema.pre(hook, blockModification);
});

applyToJSON(amendmentSchema);

export default mongoose.models.Amendment || mongoose.model('Amendment', amendmentSchema);
