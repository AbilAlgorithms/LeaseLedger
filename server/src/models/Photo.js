import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const photoSchema = new Schema(
  {
    ownerModel: {
      type: String,
      required: true,
      enum: ['ConditionRecord', 'IssueReport'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'ownerModel',
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    publicId: {
      type: String,
      default: '',
    },
    sha256: {
      type: String,
      required: [true, 'SHA-256 tamper-evident digest is required'],
      trim: true,
    },
    takenAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

photoSchema.index({ ownerModel: 1, ownerId: 1 });

applyToJSON(photoSchema);

export default mongoose.models.Photo || mongoose.model('Photo', photoSchema);
