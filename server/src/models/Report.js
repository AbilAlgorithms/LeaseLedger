import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    comparison: {
      type: Schema.Types.ObjectId,
      ref: 'Comparison',
      required: [true, 'Comparison reference is required'],
      index: true,
    },
    tenancy: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: [true, 'Tenancy reference is required'],
      index: true,
    },
    fileUrl: {
      type: String,
      required: [true, 'Report file URL is required'],
    },
    publicId: {
      type: String,
      default: '',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['GENERATING', 'READY', 'FAILED'],
      default: 'READY',
      required: true,
    },
    shareToken: {
      type: String,
      index: true,
    },
    shareExpiresAt: {
      type: Date,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ tenancy: 1, version: 1 });

applyToJSON(reportSchema);

export default mongoose.models.Report || mongoose.model('Report', reportSchema);
